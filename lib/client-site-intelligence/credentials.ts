/**
 * Per-client ingest credential resolution — fail closed.
 * Secrets are server-only env vars; never import into client bundles.
 */

import {
  CSI_SOURCE_CREDENTIAL_REGISTRY,
  type CsiSourceCredentialBinding,
} from "./constants";

export type ResolveCsiCredentialResult =
  | { ok: true; binding: CsiSourceCredentialBinding; secret: string }
  | {
      ok: false;
      reason: "unknown_client_key" | "secret_not_configured";
    };

export function getCsiCredentialBinding(
  clientKey: string,
): CsiSourceCredentialBinding | null {
  const key = clientKey.trim().toLowerCase();
  return CSI_SOURCE_CREDENTIAL_REGISTRY[key] ?? null;
}

export function resolveCsiIngestSecret(
  clientKey: string,
  env: NodeJS.ProcessEnv = process.env,
): ResolveCsiCredentialResult {
  const binding = getCsiCredentialBinding(clientKey);
  if (!binding) {
    return { ok: false, reason: "unknown_client_key" };
  }
  const secret = env[binding.envVar]?.trim();
  if (!secret) {
    return { ok: false, reason: "secret_not_configured" };
  }
  return { ok: true, binding, secret };
}

/** Environment variables required for OTP Carts ingest (document for operators). */
export const CSI_REQUIRED_ENV_DOCS = [
  {
    name: "KXD_CSI_OTP_CARTS_INGEST_SECRET",
    purpose:
      "HMAC secret for OTP Carts website → KXD OS Client Site Intelligence ingest. Per-site; do not reuse across clients. Never NEXT_PUBLIC_. Recommend cryptographically random ≥32 bytes (e.g. openssl rand -base64 48). The same secret will later be configured server-side in the OTP Carts Vercel project for its adapter — not in browser bundles.",
    sensitive: true as const,
    requiredFor: "otp-carts website_lead ingest",
    recommendedFormat:
      "cryptographically random, ≥32 bytes entropy, base64 or hex; example generation: openssl rand -base64 48",
  },
] as const;
