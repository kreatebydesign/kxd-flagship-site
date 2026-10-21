/**
 * Payload CSRF allowlist origins for cookie-based JWT auth.
 *
 * Payload rejects cookie tokens when `Origin` is present and not listed (common on
 * POST fetch from the browser). Preview Vercel hosts must be included alongside SITE.url.
 */
import { SITE } from "../site.ts";
import { NETWORK_HOST, PORTAL_HOST } from "../portal/constants.ts";

function addOrigin(set: Set<string>, raw: string | undefined | null): void {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed || /^\[SENSITIVE\]$/i.test(trimmed)) return;
  try {
    const parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    set.add(parsed.origin);
  } catch {
    /* ignore invalid */
  }
}

export function resolvePayloadCsrfOrigins(): string[] {
  const origins = new Set<string>();

  addOrigin(origins, SITE.url);

  for (const envKey of [
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_SERVER_URL",
    "SITE_URL",
  ] as const) {
    addOrigin(origins, process.env[envKey]);
  }

  addOrigin(origins, process.env.VERCEL_URL);
  addOrigin(origins, process.env.VERCEL_BRANCH_URL);

  addOrigin(origins, process.env.PORTAL_PUBLIC_URL);
  addOrigin(origins, `https://${PORTAL_HOST}`);
  addOrigin(origins, `https://${NETWORK_HOST}`);

  origins.add("http://localhost:3000");
  origins.add("http://127.0.0.1:3000");

  return [...origins];
}
