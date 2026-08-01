/**
 * Phase 4 Batch I — invitation tokens, hashing, and MFA secret encryption.
 * Pure Node crypto. No secrets logged.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const INVITATION_TOKEN_BYTES = 32;
export const INVITATION_TTL_MS = 48 * 60 * 60 * 1000;
export const RECOVERY_CODE_COUNT = 10;
export const STEP_UP_WINDOW_MS = 15 * 60 * 1000;

export function normalizePortalEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateInvitationToken(): string {
  return randomBytes(INVITATION_TOKEN_BYTES).toString("base64url");
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function invitationTokensMatch(rawToken: string, storedHash: string): boolean {
  const a = Buffer.from(hashInvitationToken(rawToken), "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function invitationExpiresAt(fromMs = Date.now()): Date {
  return new Date(fromMs + INVITATION_TTL_MS);
}

export function generateRecoveryCode(): string {
  // 4 groups of 4 alphanumeric chars — easy to write, high entropy enough with 10 codes.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(16);
  let out = "";
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) out += "-";
    out += alphabet[bytes[i]! % alphabet.length]!;
  }
  return out;
}

export function hashRecoveryCode(code: string): string {
  const normalized = code.replace(/[-\s]/g, "").toUpperCase();
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

export function recoveryCodesMatch(rawCode: string, storedHash: string): boolean {
  const a = Buffer.from(hashRecoveryCode(rawCode), "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function mfaKeyBytes(): Buffer | null {
  const raw = process.env.PORTAL_MFA_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  // Accept 64-char hex or 44-char base64 (32 bytes).
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  try {
    const buf = Buffer.from(raw, "base64");
    if (buf.length === 32) return buf;
  } catch {
    /* fall through */
  }
  return null;
}

export function isPortalMfaEncryptionConfigured(): boolean {
  return mfaKeyBytes() != null;
}

export function requirePortalMfaEncryptionKey(): Buffer {
  const key = mfaKeyBytes();
  if (!key) {
    throw new Error(
      "PORTAL_MFA_ENCRYPTION_KEY is required for MFA operations (32-byte key as hex or base64).",
    );
  }
  return key;
}

/** Encrypt UTF-8 plaintext → base64url(iv || tag || ciphertext). */
export function encryptMfaSecret(plaintext: string): string {
  const key = requirePortalMfaEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function decryptMfaSecret(payload: string): string {
  const key = requirePortalMfaEncryptionKey();
  const buf = Buffer.from(payload, "base64url");
  if (buf.length < 12 + 16 + 1) {
    throw new Error("Invalid MFA ciphertext.");
  }
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function generateTotpSecretBase32(): string {
  // 20 bytes → base32 for authenticator apps
  const bytes = randomBytes(20);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31]!;
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31]!;
  }
  return output;
}
