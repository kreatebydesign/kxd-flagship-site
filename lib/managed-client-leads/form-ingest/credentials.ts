/**
 * Credential resolution for managed-client form ingest.
 */

import {
  MCI_FORM_INGEST_CREDENTIAL_REGISTRY,
  type ManagedClientFormIngestCredential,
} from "./constants";

export function resolveMciFormIngestCredential(
  clientKey: string,
): ManagedClientFormIngestCredential | null {
  const key = String(clientKey ?? "").trim();
  if (!key) return null;
  return MCI_FORM_INGEST_CREDENTIAL_REGISTRY[key] ?? null;
}

export function resolveMciFormIngestSecret(
  credential: ManagedClientFormIngestCredential,
): string | null {
  const secret = process.env[credential.envVar]?.trim() ?? "";
  return secret.length > 0 ? secret : null;
}
