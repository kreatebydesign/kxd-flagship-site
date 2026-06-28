import "server-only";

import { envPresent, envValue } from "./status";
import type { NormalizedMicrosoft365 } from "./types";

export async function syncMicrosoft365(): Promise<{
  normalized: NormalizedMicrosoft365 | null;
  recordsProcessed: number;
  error?: string;
}> {
  const tenantId = envValue("MICROSOFT_TENANT_ID");
  const clientId = envValue("MICROSOFT_CLIENT_ID");

  if (!tenantId && !clientId) {
    return {
      normalized: null,
      recordsProcessed: 0,
      error: "MICROSOFT_TENANT_ID or MICROSOFT_CLIENT_ID not configured",
    };
  }

  const serverApiConfigured = envPresent("MICROSOFT_CLIENT_SECRET");

  return {
    normalized: {
      tenantId: tenantId ?? null,
      clientId: clientId ?? null,
      mailboxStatus: serverApiConfigured ? "credentials-present" : "configuration-partial",
      aliasHealth: serverApiConfigured ? "pending-sync" : "not-verified",
      storageUsedGb: null,
      deliveryIssues: serverApiConfigured
        ? []
        : ["Microsoft Graph API not connected — client secret and OAuth pending"],
      serverApiConfigured,
    },
    recordsProcessed: 1,
  };
}

export function isMicrosoft365Configured(): boolean {
  return envPresent("MICROSOFT_TENANT_ID") || envPresent("MICROSOFT_CLIENT_ID");
}
