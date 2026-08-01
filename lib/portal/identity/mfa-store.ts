/**
 * Phase 4 Batch I — MFA / passkey persistence helpers.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { generateRecoveryCodeBatch } from "./recovery-codes";
import { appendPortalSecurityEvent } from "./security-events";
import {
  createTotpSecret,
  encryptTotpSecretForStorage,
  verifyStoredTotpCode,
} from "./totp";
import { publicKeyToBase64Url } from "./webauthn";
import { findMatchingRecoveryCodeHash } from "./recovery-codes";
import { canCompleteSecurityEnrollment } from "./policy";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export async function listPasskeysForUser(portalUserId: number) {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-passkeys" as any,
    where: { portalUser: { equals: portalUserId } },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  });
  return result.docs.map((doc) => {
    const d = doc as AnyDoc;
    return {
      id: Number(d.id),
      credentialId: String(d.credentialId),
      publicKey: String(d.publicKey),
      counter: Number(d.counter ?? 0) || 0,
      transports: Array.isArray(d.transports) ? d.transports : [],
      deviceType: d.deviceType ? String(d.deviceType) : null,
      backedUp: d.backedUp === true,
      label: d.label ? String(d.label) : null,
      lastUsedAt: d.lastUsedAt ? String(d.lastUsedAt) : null,
      createdAt: String(d.createdAt ?? ""),
    };
  });
}

export async function getMfaSettings(portalUserId: number) {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-mfa-settings" as any,
    where: { portalUser: { equals: portalUserId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const d = result.docs[0] as AnyDoc | undefined;
  if (!d) {
    return {
      id: null as number | null,
      totpEnabled: false,
      totpSecretEncrypted: null as string | null,
      preferredMethod: "password" as const,
      enrolledAt: null as string | null,
    };
  }
  return {
    id: Number(d.id),
    totpEnabled: d.totpEnabled === true,
    totpSecretEncrypted: d.totpSecretEncrypted ? String(d.totpSecretEncrypted) : null,
    preferredMethod:
      d.preferredMethod === "passkey" ? ("passkey" as const) : ("password" as const),
    enrolledAt: d.enrolledAt ? String(d.enrolledAt) : null,
  };
}

export async function beginTotpEnrollment(portalUserId: number): Promise<{
  secret: string;
  otpauthUrl: string;
}> {
  const { buildTotpOtpauthUrl } = await import("./totp");
  const payload = await getPayload({ config });
  const user = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-users" as any,
    id: portalUserId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  const secret = createTotpSecret();
  const encrypted = encryptTotpSecretForStorage(secret);
  const existing = await getMfaSettings(portalUserId);
  if (existing.id) {
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-mfa-settings" as any,
      id: existing.id,
      data: {
        totpSecretEncrypted: encrypted,
        totpEnabled: false,
      },
      overrideAccess: true,
    });
  } else {
    await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-mfa-settings" as any,
      data: {
        portalUser: portalUserId,
        totpSecretEncrypted: encrypted,
        totpEnabled: false,
        preferredMethod: "password",
      },
      overrideAccess: true,
    });
  }

  return {
    secret,
    otpauthUrl: buildTotpOtpauthUrl({
      secret,
      email: String(user.email ?? ""),
    }),
  };
}

export async function confirmTotpEnrollment(input: {
  portalUserId: number;
  token: string;
}): Promise<{ ok: true; recoveryCodes: string[] } | { ok: false; error: string }> {
  const settings = await getMfaSettings(input.portalUserId);
  if (!settings.totpSecretEncrypted || !settings.id) {
    return { ok: false, error: "Start TOTP enrollment first." };
  }
  const valid = verifyStoredTotpCode({
    encryptedSecret: settings.totpSecretEncrypted,
    token: input.token,
    portalUserId: input.portalUserId,
  });
  if (!valid) return { ok: false, error: "Invalid authenticator code." };

  const payload = await getPayload({ config });
  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-mfa-settings" as any,
    id: settings.id,
    data: {
      totpEnabled: true,
      enrolledAt: new Date().toISOString(),
    },
    overrideAccess: true,
  });

  const batch = generateRecoveryCodeBatch();
  // Invalidate prior unused codes for this user.
  const prior = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-recovery-codes" as any,
    where: {
      and: [
        { portalUser: { equals: input.portalUserId } },
        { usedAt: { exists: false } },
      ],
    },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });
  for (const doc of prior.docs) {
    await payload.delete({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-recovery-codes" as any,
      id: (doc as AnyDoc).id,
      overrideAccess: true,
    });
  }
  for (const hash of batch.hashes) {
    await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-recovery-codes" as any,
      data: {
        portalUser: input.portalUserId,
        codeHash: hash,
        batchId: batch.batchId,
      },
      overrideAccess: true,
    });
  }

  await appendPortalSecurityEvent({
    type: "totp.enabled",
    actorKind: "portal-user",
    actorPortalUserId: input.portalUserId,
    summary: "TOTP MFA enabled",
  });
  await appendPortalSecurityEvent({
    type: "recovery.generated",
    actorKind: "portal-user",
    actorPortalUserId: input.portalUserId,
    summary: "Recovery codes regenerated",
    metadata: { batchId: batch.batchId, count: batch.plaintextCodes.length },
  });

  await maybeCompleteSecurityEnrollment(input.portalUserId);
  return { ok: true, recoveryCodes: batch.plaintextCodes };
}

export async function savePasskeyRegistration(input: {
  portalUserId: number;
  credentialId: string;
  publicKey: Uint8Array;
  counter: number;
  transports?: string[];
  deviceType?: string;
  backedUp?: boolean;
  label?: string;
}) {
  const payload = await getPayload({ config });
  await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-passkeys" as any,
    data: {
      portalUser: input.portalUserId,
      credentialId: input.credentialId,
      publicKey: publicKeyToBase64Url(input.publicKey),
      counter: input.counter,
      transports: input.transports ?? [],
      deviceType: input.deviceType,
      backedUp: input.backedUp === true,
      label: input.label?.trim() || "Passkey",
    },
    overrideAccess: true,
  });
  await appendPortalSecurityEvent({
    type: "passkey.registered",
    actorKind: "portal-user",
    actorPortalUserId: input.portalUserId,
    summary: "Passkey registered",
  });
  await maybeCompleteSecurityEnrollment(input.portalUserId);
}

export async function maybeCompleteSecurityEnrollment(portalUserId: number): Promise<boolean> {
  const payload = await getPayload({ config });
  const user = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-users" as any,
    id: portalUserId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;
  if (user.securityEnrollmentCompletedAt) return true;

  const [passkeys, mfa] = await Promise.all([
    listPasskeysForUser(portalUserId),
    getMfaSettings(portalUserId),
  ]);
  if (
    !canCompleteSecurityEnrollment({
      hasPasskey: passkeys.length > 0,
      totpEnabled: mfa.totpEnabled,
    })
  ) {
    return false;
  }

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-users" as any,
    id: portalUserId,
    data: { securityEnrollmentCompletedAt: new Date().toISOString() },
    overrideAccess: true,
  });
  await appendPortalSecurityEvent({
    type: "security.enrollment_completed",
    actorKind: "portal-user",
    actorPortalUserId: portalUserId,
    summary: "Security enrollment completed",
  });
  return true;
}

export async function consumeRecoveryCode(input: {
  portalUserId: number;
  code: string;
}): Promise<boolean> {
  const payload = await getPayload({ config });
  const unused = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-recovery-codes" as any,
    where: {
      and: [
        { portalUser: { equals: input.portalUserId } },
        { usedAt: { exists: false } },
      ],
    },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });
  const hashes = unused.docs.map((d) => String((d as AnyDoc).codeHash));
  const match = findMatchingRecoveryCodeHash(input.code, hashes);
  if (!match) return false;
  const doc = unused.docs.find((d) => String((d as AnyDoc).codeHash) === match) as AnyDoc;
  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-recovery-codes" as any,
    id: doc.id,
    data: { usedAt: new Date().toISOString() },
    overrideAccess: true,
  });
  await appendPortalSecurityEvent({
    type: "recovery.used",
    actorKind: "portal-user",
    actorPortalUserId: input.portalUserId,
    summary: "Recovery code used",
  });
  return true;
}

export async function markStepUp(portalUserId: number): Promise<void> {
  const payload = await getPayload({ config });
  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-users" as any,
    id: portalUserId,
    data: { lastStepUpAt: new Date().toISOString() },
    overrideAccess: true,
  });
  await appendPortalSecurityEvent({
    type: "step_up.satisfied",
    actorKind: "portal-user",
    actorPortalUserId: portalUserId,
    summary: "Step-up authentication satisfied",
  });
}

export async function userRequiresSecurityEnrollment(portalUserId: number): Promise<boolean> {
  const payload = await getPayload({ config });
  const user = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-users" as any,
    id: portalUserId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;
  // Forced only when terms were accepted via invitation and enrollment incomplete.
  if (!user.termsAcceptedAt) return false;
  return !user.securityEnrollmentCompletedAt;
}
