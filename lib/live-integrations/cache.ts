import "server-only";

import type { IntegrationProviderId } from "@/lib/integrations/types";
import type { LiveCacheMeta } from "./types";

interface CacheEntry<T> {
  data: T;
  fetchedAt: string;
  expiresAt: number;
  ttlSeconds: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export const DEFAULT_PROVIDER_TTL_SECONDS: Record<IntegrationProviderId, number> = {
  github: 300,
  vercel: 180,
  "google-analytics-4": 3600,
  "google-search-console": 3600,
  stripe: 600,
  cloudflare: 600,
  "google-business-profile": 3600,
  "google-workspace": 1800,
  "microsoft-365": 1800,
  resend: 900,
  payload: 120,
  "neon-postgresql": 300,
};

function cacheKey(providerId: IntegrationProviderId): string {
  return `live:${providerId}`;
}

export function getCached<T>(providerId: IntegrationProviderId): T | null {
  const entry = store.get(cacheKey(providerId));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) return null;
  return entry.data as T;
}

export function getCachedStale<T>(providerId: IntegrationProviderId): T | null {
  const entry = store.get(cacheKey(providerId));
  return entry ? (entry.data as T) : null;
}

export function setCached<T>(
  providerId: IntegrationProviderId,
  data: T,
  ttlSeconds?: number,
): LiveCacheMeta {
  const ttl = ttlSeconds ?? DEFAULT_PROVIDER_TTL_SECONDS[providerId] ?? 600;
  const fetchedAt = new Date();
  const expiresAt = fetchedAt.getTime() + ttl * 1000;

  store.set(cacheKey(providerId), {
    data,
    fetchedAt: fetchedAt.toISOString(),
    expiresAt,
    ttlSeconds: ttl,
  });

  return {
    providerId,
    fetchedAt: fetchedAt.toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    ttlSeconds: ttl,
    isFresh: true,
  };
}

export function getCacheMeta(providerId: IntegrationProviderId): LiveCacheMeta | null {
  const entry = store.get(cacheKey(providerId));
  if (!entry) return null;
  const isFresh = Date.now() <= entry.expiresAt;
  return {
    providerId,
    fetchedAt: entry.fetchedAt,
    expiresAt: new Date(entry.expiresAt).toISOString(),
    ttlSeconds: entry.ttlSeconds,
    isFresh,
  };
}

export function isCacheFresh(providerId: IntegrationProviderId): boolean {
  const meta = getCacheMeta(providerId);
  return meta?.isFresh ?? false;
}

export function clearLiveCache(providerId?: IntegrationProviderId): void {
  if (providerId) {
    store.delete(cacheKey(providerId));
    return;
  }
  store.clear();
}

export async function fetchJson<T>(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<{ ok: true; data: T; status: number } | { ok: false; error: string; status?: number }> {
  const timeoutMs = options.timeoutMs ?? 12_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        error: text.slice(0, 200) || `HTTP ${res.status}`,
        status: res.status,
      };
    }

    const data = (await res.json()) as T;
    return { ok: true, data, status: res.status };
  } catch (err) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : "Request failed";
    return { ok: false, error: message };
  }
}
