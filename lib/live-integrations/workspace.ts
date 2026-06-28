import "server-only";

import { envPresent, envValue } from "./status";
import type { NormalizedWorkspace } from "./types";

export async function syncWorkspace(): Promise<{
  normalized: NormalizedWorkspace | null;
  recordsProcessed: number;
  error?: string;
}> {
  const domain = envValue("GOOGLE_WORKSPACE_DOMAIN");

  if (!domain) {
    return {
      normalized: null,
      recordsProcessed: 0,
      error: "GOOGLE_WORKSPACE_DOMAIN not configured",
    };
  }

  const serverApiConfigured =
    envPresent("GOOGLE_WORKSPACE_SERVICE_ACCOUNT") || envPresent("GOOGLE_APPLICATION_CREDENTIALS");

  return {
    normalized: {
      domain,
      mailboxStatus: serverApiConfigured ? "api-credentials-present" : "domain-configured",
      aliasHealth: serverApiConfigured ? "pending-sync" : "not-verified",
      storageUsedGb: null,
      deliveryIssues: serverApiConfigured ? [] : ["Workspace Admin API not connected — OAuth pending"],
      serverApiConfigured,
    },
    recordsProcessed: 1,
  };
}

export function isWorkspaceConfigured(): boolean {
  return envPresent("GOOGLE_WORKSPACE_DOMAIN");
}
