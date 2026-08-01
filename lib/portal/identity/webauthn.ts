/**
 * Phase 4 Batch I — WebAuthn register/authenticate via SimpleWebAuthn.
 */

import "server-only";

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";
import { getPayload } from "payload";
import config from "@payload-config";
import {
  resolveWebAuthnAllowedOrigins,
  resolveWebAuthnRpID,
  resolveWebAuthnRpName,
} from "./webauthn-config";

export type StoredPasskey = {
  id: number;
  credentialId: string;
  publicKey: Uint8Array;
  counter: number;
  transports: AuthenticatorTransportFuture[];
};

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export async function createWebAuthnChallenge(input: {
  purpose: "webauthn-register" | "webauthn-auth" | "step-up";
  portalUserId?: number | null;
  challenge: string;
}): Promise<number> {
  const payload = await getPayload({ config });
  const doc = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-auth-challenges" as any,
    data: {
      purpose: input.purpose,
      portalUser: input.portalUserId ?? undefined,
      challenge: input.challenge,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
    },
    overrideAccess: true,
  });
  return doc.id as number;
}

export async function consumeWebAuthnChallenge(input: {
  purpose: "webauthn-register" | "webauthn-auth" | "step-up";
  portalUserId?: number | null;
  challenge: string;
}): Promise<boolean> {
  const payload = await getPayload({ config });
  const now = new Date().toISOString();
  const found = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-auth-challenges" as any,
    where: {
      and: [
        { purpose: { equals: input.purpose } },
        { challenge: { equals: input.challenge } },
        { consumedAt: { exists: false } },
        { expiresAt: { greater_than: now } },
        ...(input.portalUserId != null
          ? [{ portalUser: { equals: input.portalUserId } }]
          : []),
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const doc = found.docs[0] as { id: number } | undefined;
  if (!doc) return false;
  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-auth-challenges" as any,
    id: doc.id,
    data: { consumedAt: now },
    overrideAccess: true,
  });
  return true;
}

export async function buildRegistrationOptions(input: {
  portalUserId: number;
  email: string;
  displayName: string;
  existingCredentialIds: string[];
}) {
  const options = await generateRegistrationOptions({
    rpName: resolveWebAuthnRpName(),
    rpID: resolveWebAuthnRpID(),
    userName: input.email,
    userDisplayName: input.displayName || input.email,
    userID: new TextEncoder().encode(String(input.portalUserId)),
    attestationType: "none",
    excludeCredentials: input.existingCredentialIds.map((id) => ({
      id,
      transports: undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });
  await createWebAuthnChallenge({
    purpose: "webauthn-register",
    portalUserId: input.portalUserId,
    challenge: options.challenge,
  });
  return options;
}

export async function verifyRegistration(input: {
  portalUserId: number;
  response: RegistrationResponseJSON;
  expectedOrigin: string;
}): Promise<VerifiedRegistrationResponse> {
  const challenge = input.response.response.clientDataJSON
    ? undefined
    : undefined;
  void challenge;

  // Challenge is embedded in the clientDataJSON; SimpleWebAuthn verifies it
  // against expectedChallenge we retrieve from store via expectedChallenge callback pattern.
  // We decode challenge from the response's clientData after verifying store match below.
  const clientData = JSON.parse(
    Buffer.from(input.response.response.clientDataJSON, "base64url").toString("utf8"),
  ) as { challenge?: string };
  const expectedChallenge = clientData.challenge;
  if (!expectedChallenge) {
    throw new Error("Missing WebAuthn challenge.");
  }
  const consumed = await consumeWebAuthnChallenge({
    purpose: "webauthn-register",
    portalUserId: input.portalUserId,
    challenge: expectedChallenge,
  });
  if (!consumed) {
    throw new Error("WebAuthn challenge invalid or expired.");
  }

  const allowed = resolveWebAuthnAllowedOrigins();
  if (!allowed.includes(input.expectedOrigin)) {
    throw new Error("WebAuthn origin not allowed.");
  }

  return verifyRegistrationResponse({
    response: input.response,
    expectedChallenge,
    expectedOrigin: input.expectedOrigin,
    expectedRPID: resolveWebAuthnRpID(),
    requireUserVerification: false,
  });
}

export async function buildAuthenticationOptions(input: {
  portalUserId?: number | null;
  allowCredentials?: string[];
}) {
  const options = await generateAuthenticationOptions({
    rpID: resolveWebAuthnRpID(),
    userVerification: "preferred",
    allowCredentials: (input.allowCredentials ?? []).map((id) => ({ id })),
  });
  await createWebAuthnChallenge({
    purpose: "webauthn-auth",
    portalUserId: input.portalUserId ?? null,
    challenge: options.challenge,
  });
  return options;
}

export async function verifyAuthentication(input: {
  response: AuthenticationResponseJSON;
  expectedOrigin: string;
  credential: StoredPasskey;
  portalUserId?: number | null;
}): Promise<VerifiedAuthenticationResponse> {
  const clientData = JSON.parse(
    Buffer.from(input.response.response.clientDataJSON, "base64url").toString("utf8"),
  ) as { challenge?: string };
  const expectedChallenge = clientData.challenge;
  if (!expectedChallenge) {
    throw new Error("Missing WebAuthn challenge.");
  }
  const consumed = await consumeWebAuthnChallenge({
    purpose: "webauthn-auth",
    portalUserId: input.portalUserId ?? null,
    challenge: expectedChallenge,
  });
  if (!consumed) {
    throw new Error("WebAuthn challenge invalid or expired.");
  }

  const allowed = resolveWebAuthnAllowedOrigins();
  if (!allowed.includes(input.expectedOrigin)) {
    throw new Error("WebAuthn origin not allowed.");
  }

  return verifyAuthenticationResponse({
    response: input.response,
    expectedChallenge,
    expectedOrigin: input.expectedOrigin,
    expectedRPID: resolveWebAuthnRpID(),
    credential: {
      id: input.credential.credentialId,
      publicKey: new Uint8Array(input.credential.publicKey),
      counter: input.credential.counter,
      transports: input.credential.transports,
    },
    requireUserVerification: false,
  });
}

export function publicKeyToBase64Url(key: Uint8Array): string {
  return Buffer.from(key).toString("base64url");
}

export function publicKeyFromBase64Url(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64url"));
}
