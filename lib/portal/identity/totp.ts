/**
 * Phase 4 Batch I — TOTP helpers (otplib v13).
 * Secrets must be encrypted before persistence.
 */

import { generateSecret, generateURI, verifySync } from "otplib";
import {
  decryptMfaSecret,
  encryptMfaSecret,
  isPortalMfaEncryptionConfigured,
} from "./crypto";

const usedCodes = new Map<string, number>();
const REPLAY_TTL_MS = 90_000;

export function createTotpSecret(): string {
  return generateSecret();
}

export function encryptTotpSecretForStorage(secret: string): string {
  return encryptMfaSecret(secret);
}

export function decryptTotpSecretFromStorage(ciphertext: string): string {
  return decryptMfaSecret(ciphertext);
}

export function buildTotpOtpauthUrl(input: {
  secret: string;
  email: string;
  issuer?: string;
}): string {
  const issuer = input.issuer ?? "KXD OS";
  return generateURI({
    issuer,
    label: input.email,
    secret: input.secret,
  });
}

export function verifyTotpCode(input: {
  secret: string;
  token: string;
  portalUserId: number;
}): boolean {
  const token = input.token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(token)) return false;

  const replayKey = `${input.portalUserId}:${token}`;
  const prior = usedCodes.get(replayKey);
  if (prior && Date.now() - prior < REPLAY_TTL_MS) {
    return false;
  }

  const result = verifySync({ token, secret: input.secret });
  const ok = result.valid === true;
  if (ok) {
    usedCodes.set(replayKey, Date.now());
    if (usedCodes.size > 5000) {
      const cutoff = Date.now() - REPLAY_TTL_MS;
      for (const [k, t] of usedCodes) {
        if (t < cutoff) usedCodes.delete(k);
      }
    }
  }
  return ok;
}

export function verifyStoredTotpCode(input: {
  encryptedSecret: string;
  token: string;
  portalUserId: number;
}): boolean {
  if (!isPortalMfaEncryptionConfigured()) {
    throw new Error("PORTAL_MFA_ENCRYPTION_KEY is required for TOTP verification.");
  }
  const secret = decryptTotpSecretFromStorage(input.encryptedSecret);
  return verifyTotpCode({
    secret,
    token: input.token,
    portalUserId: input.portalUserId,
  });
}

/** Test-only: clear replay cache. */
export function __resetTotpReplayCacheForTests(): void {
  usedCodes.clear();
}
