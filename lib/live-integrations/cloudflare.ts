import "server-only";

import { fetchJson } from "./cache";
import { envValue } from "./status";
import type { NormalizedCloudflare } from "./types";

export async function syncCloudflare(): Promise<{
  normalized: NormalizedCloudflare | null;
  recordsProcessed: number;
  error?: string;
}> {
  const token = envValue("CLOUDFLARE_API_TOKEN");
  const zoneId = envValue("CLOUDFLARE_ZONE_ID");

  if (!token) {
    return { normalized: null, recordsProcessed: 0, error: "CLOUDFLARE_API_TOKEN not configured" };
  }

  if (!zoneId) {
    return {
      normalized: null,
      recordsProcessed: 0,
      error: "CLOUDFLARE_ZONE_ID not configured",
    };
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const zoneRes = await fetchJson<{
    result?: {
      name?: string;
      status?: string;
      plan?: { name?: string };
    };
  }>(`https://api.cloudflare.com/client/v4/zones/${zoneId}`, { headers });

  if (!zoneRes.ok) {
    return { normalized: null, recordsProcessed: 0, error: zoneRes.error };
  }

  let records = 1;
  const zone = zoneRes.data.result;

  const sslRes = await fetchJson<{
    result?: Array<{ status?: string; expires_on?: string }>;
  }>(`https://api.cloudflare.com/client/v4/zones/${zoneId}/ssl/verification`, { headers });

  const sslCert = sslRes.ok ? sslRes.data.result?.[0] : undefined;
  if (sslRes.ok) records += 1;

  const dnsRes = await fetchJson<{ result?: unknown[] }>(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?per_page=1`,
    { headers },
  );
  const dnsCount = dnsRes.ok ? dnsRes.data.result?.length ?? 0 : null;
  if (dnsRes.ok) records += 1;

  const settingsRes = await fetchJson<{
    result?: { value?: string; id?: string }[];
  }>(`https://api.cloudflare.com/client/v4/zones/${zoneId}/settings`, { headers });

  let cachingEnabled: boolean | null = null;
  if (settingsRes.ok) {
    const cacheSetting = settingsRes.data.result?.find((s) => s.id === "cache_level");
    cachingEnabled = cacheSetting ? cacheSetting.value !== "bypass" : null;
    records += 1;
  }

  const securityAlerts: string[] = [];
  if (zone?.status && zone.status !== "active") {
    securityAlerts.push(`Zone status: ${zone.status}`);
  }
  if (sslCert?.status && sslCert.status !== "active") {
    securityAlerts.push(`SSL status: ${sslCert.status}`);
  }

  return {
    normalized: {
      domain: zone?.name ?? null,
      sslStatus: sslCert?.status ?? null,
      sslExpiresAt: sslCert?.expires_on ?? null,
      dnsRecordCount: dnsCount,
      domainStatus: zone?.status ?? null,
      cachingEnabled,
      securityAlerts,
    },
    recordsProcessed: records,
  };
}

export function isCloudflareConfigured(): boolean {
  return Boolean(envValue("CLOUDFLARE_API_TOKEN") && envValue("CLOUDFLARE_ZONE_ID"));
}
