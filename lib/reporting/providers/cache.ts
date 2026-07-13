/**
 * Phase 29C — Client-scoped reporting provider cache.
 *
 * Process-local Map — reduces duplicate calls within a warm runtime.
 * Not a durable cross-instance cache (Vercel serverless / multi-instance).
 *
 * Success and negative (error) entries are stored separately so a rate-limit
 * or auth failure cannot overwrite the last successful result for the same key.
 */

import type { PeriodWindow } from "@/lib/reporting/domain";
import { periodKey } from "@/lib/reporting/domain/period";
import { encodeConnectionIdentity } from "./connection-resolve";
import {
  REPORTING_PROVIDER_METRIC_SET_VERSION,
  type ReportingProviderId,
  type ReportingProviderResult,
} from "./types";

interface CacheEntry {
  result: ReportingProviderResult;
  fetchedAt: string;
  expiresAt: number;
  ttlSeconds: number;
  kind: "success" | "negative";
}

const successStore = new Map<string, CacheEntry>();
const negativeStore = new Map<string, CacheEntry>();

/** Soft bound — oldest entries evicted when exceeded. */
export const REPORTING_PROVIDER_CACHE_MAX_ENTRIES = 200;

const TTL = {
  ga4Current: 15 * 60,
  ga4Historical: 6 * 60 * 60,
  gsc: 6 * 60 * 60,
  negative: 5 * 60,
} as const;

function includesToday(period: PeriodWindow): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return period.start.slice(0, 10) <= today && period.end.slice(0, 10) >= today;
}

function evictExpired(store: Map<string, CacheEntry>): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) store.delete(key);
  }
}

function evictOverflow(store: Map<string, CacheEntry>): void {
  if (store.size <= REPORTING_PROVIDER_CACHE_MAX_ENTRIES) return;
  const overflow = store.size - REPORTING_PROVIDER_CACHE_MAX_ENTRIES;
  const keys = store.keys();
  for (let i = 0; i < overflow; i++) {
    const next = keys.next();
    if (next.done) break;
    store.delete(next.value);
  }
}

export function reportingProviderCacheKey(input: {
  clientId: number;
  provider: ReportingProviderId;
  connectionIdentity: string;
  period: PeriodWindow;
}): string {
  return [
    "reporting-provider",
    `c${input.clientId}`,
    input.provider,
    encodeConnectionIdentity(input.connectionIdentity),
    periodKey(input.period),
    REPORTING_PROVIDER_METRIC_SET_VERSION,
  ].join(":");
}

export function ttlForProviderResult(
  provider: ReportingProviderId,
  period: PeriodWindow,
  status: ReportingProviderResult["status"],
): number {
  if (status !== "connected" && status !== "no-rows") return TTL.negative;
  if (provider === "search-console") return TTL.gsc;
  return includesToday(period) ? TTL.ga4Current : TTL.ga4Historical;
}

export function getReportingProviderCache(key: string): {
  result: ReportingProviderResult;
  isFresh: boolean;
  fetchedAt: string;
  kind: "success" | "negative";
} | null {
  evictExpired(successStore);
  evictExpired(negativeStore);

  const success = successStore.get(key);
  if (success) {
    return {
      result: success.result,
      isFresh: Date.now() <= success.expiresAt,
      fetchedAt: success.fetchedAt,
      kind: "success",
    };
  }

  const negative = negativeStore.get(key);
  if (negative && Date.now() <= negative.expiresAt) {
    return {
      result: negative.result,
      isFresh: true,
      fetchedAt: negative.fetchedAt,
      kind: "negative",
    };
  }

  return null;
}

/** Last successful result only — used for stale fallback after transient failures. */
export function getReportingProviderSuccessCache(key: string): {
  result: ReportingProviderResult;
  fetchedAt: string;
  isFresh: boolean;
} | null {
  evictExpired(successStore);
  const entry = successStore.get(key);
  if (!entry) return null;
  return {
    result: entry.result,
    fetchedAt: entry.fetchedAt,
    isFresh: Date.now() <= entry.expiresAt,
  };
}

export function setReportingProviderCache(
  key: string,
  result: ReportingProviderResult,
  ttlSeconds: number,
): void {
  const fetchedAt = new Date().toISOString();
  const isSuccess = result.status === "connected" || result.status === "no-rows";
  const entry: CacheEntry = {
    result,
    fetchedAt,
    expiresAt: Date.now() + ttlSeconds * 1000,
    ttlSeconds,
    kind: isSuccess ? "success" : "negative",
  };

  if (isSuccess) {
    successStore.set(key, entry);
    // Do not clear negative — short negative TTL can coexist; success takes precedence on read.
    evictOverflow(successStore);
  } else {
    negativeStore.set(key, entry);
    evictOverflow(negativeStore);
  }
}

export function clearReportingProviderCache(prefixOrKey?: string): void {
  if (!prefixOrKey) {
    successStore.clear();
    negativeStore.clear();
    return;
  }
  for (const store of [successStore, negativeStore]) {
    if (store.has(prefixOrKey)) {
      store.delete(prefixOrKey);
      continue;
    }
    for (const key of store.keys()) {
      if (key.startsWith(prefixOrKey)) store.delete(key);
    }
  }
}

export function reportingProviderCacheSize(): number {
  return successStore.size + negativeStore.size;
}

export function reportingProviderSuccessCacheSize(): number {
  return successStore.size;
}
