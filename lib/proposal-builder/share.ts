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

/** Legacy plaintext publicToken fallback — hash compare when migrating. */
export function authorizeLegacyPublicToken(
  storedToken: string | null | undefined,
  provided: string,
): boolean {
  if (!storedToken) return false;
  return storedToken === provided;
}
