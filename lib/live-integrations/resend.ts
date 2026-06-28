import "server-only";

import { fetchJson } from "./cache";
import { envValue } from "./status";
import type { NormalizedResend } from "./types";

export async function syncResend(): Promise<{
  normalized: NormalizedResend | null;
  recordsProcessed: number;
  error?: string;
}> {
  const apiKey = envValue("RESEND_API_KEY");
  const fromEmail = envValue("RESEND_FROM_EMAIL");

  if (!apiKey) {
    return { normalized: null, recordsProcessed: 0, error: "RESEND_API_KEY not configured" };
  }

  const domainsRes = await fetchJson<{ data?: unknown[] }>("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!domainsRes.ok) {
    return { normalized: null, recordsProcessed: 0, error: domainsRes.error };
  }

  return {
    normalized: {
      fromEmail: fromEmail ?? null,
      domainCount: domainsRes.data.data?.length ?? 0,
      deliveryStatus: "api-reachable",
      apiReachable: true,
    },
    recordsProcessed: 1,
  };
}

export function isResendConfigured(): boolean {
  return Boolean(envValue("RESEND_API_KEY"));
}
