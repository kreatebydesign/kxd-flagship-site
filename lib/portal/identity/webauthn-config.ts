/**
 * Phase 4 Batch I — WebAuthn relying party configuration.
 */

import { PORTAL_HOST } from "@/lib/portal/constants";

export function resolveWebAuthnRpID(): string {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    return PORTAL_HOST;
  }
  const fromEnv = process.env.PORTAL_WEBAUTHN_RP_ID?.trim();
  if (fromEnv) return fromEnv;
  return "localhost";
}

export function resolveWebAuthnRpName(): string {
  return "KXD OS Portal";
}

export function resolveWebAuthnAllowedOrigins(): string[] {
  const origins = new Set<string>();
  origins.add(`https://${PORTAL_HOST}`);
  origins.add("http://localhost:3000");
  origins.add("http://127.0.0.1:3000");

  const publicUrl = process.env.PORTAL_PUBLIC_URL?.trim();
  if (publicUrl) {
    try {
      origins.add(new URL(publicUrl).origin);
    } catch {
      /* ignore */
    }
  }

  const extra = process.env.PORTAL_WEBAUTHN_ORIGINS?.split(",") ?? [];
  for (const o of extra) {
    const t = o.trim();
    if (t) origins.add(t.replace(/\/$/, ""));
  }

  return [...origins];
}

export function isAllowedWebAuthnOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  return resolveWebAuthnAllowedOrigins().includes(origin);
}
