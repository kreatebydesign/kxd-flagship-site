/**
 * Opaque high-entropy share tokens with hashed storage.
 */

import { createHash, randomBytes } from "crypto";
import { newId } from "./document.ts";
import type { ShareLinkRecord } from "./types.ts";

export function generateShareToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashShareToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenPrefix(token: string): string {
  return token.slice(0, 8);
}

export function createShareLinkRecord(input: {
  version: number;
  createdBy?: string | null;
  expiresAt?: string | null;
  rawToken?: string;
}): { record: ShareLinkRecord; rawToken: string } {
  const rawToken = input.rawToken ?? generateShareToken();
  const record: ShareLinkRecord = {
    id: newId("share"),
    tokenHash: hashShareToken(rawToken),
    tokenPrefix: tokenPrefix(rawToken),
    version: input.version,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy ?? null,
    expiresAt: input.expiresAt ?? null,
    revokedAt: null,
    firstViewedAt: null,
    lastViewedAt: null,
    viewCount: 0,
  };
  return { record, rawToken };
}

export function findActiveShareLink(
  links: ShareLinkRecord[] | unknown,
  rawToken: string,
): ShareLinkRecord | null {
  if (!Array.isArray(links)) return null;
  const hash = hashShareToken(rawToken);
  const now = Date.now();
  for (const link of links as ShareLinkRecord[]) {
    if (link.tokenHash !== hash) continue;
    if (link.revokedAt) return null;
    if (link.expiresAt) {
      const exp = new Date(link.expiresAt).getTime();
      if (!Number.isNaN(exp) && exp < now) return null;
    }
    return link;
  }
  return null;
}

export function isShareLinkActive(link: ShareLinkRecord | null | undefined): boolean {
  if (!link) return false;
  if (link.revokedAt) return false;
  if (link.expiresAt) {
    const exp = new Date(link.expiresAt).getTime();
    if (!Number.isNaN(exp) && exp < Date.now()) return false;
  }
  return true;
}

/**
 * V1 and current hashed links resolve by SHA-256 match.
 * An empty shareLinks array must not invalidate a still-current publicTokenHash.
 */
export function isHashedPublicTokenAuthorized(input: {
  providedToken: string;
  publicTokenHash?: string | null;
  revoked?: boolean | null;
  publicTokenExpiresAt?: string | null;
  shareLinks?: unknown;
}): boolean {
  if (input.revoked) return false;
  if (input.publicTokenExpiresAt) {
    const exp = new Date(String(input.publicTokenExpiresAt)).getTime();
    if (!Number.isNaN(exp) && exp < Date.now()) return false;
  }
  if (findActiveShareLink(input.shareLinks, input.providedToken)) return true;
  const stored = String(input.publicTokenHash ?? "").trim();
  if (!stored) return false;
  return stored === hashShareToken(input.providedToken);
}

/** Legacy plaintext publicToken fallback — hash compare when migrating. */
export function authorizeLegacyPublicToken(
  storedToken: string | null | undefined,
  provided: string,
): boolean {
  if (!storedToken) return false;
  return storedToken === provided;
}
