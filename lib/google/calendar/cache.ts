/**
 * Phase 25C — Short-lived deterministic cache for Calendar reads.
 * Never caches credentials or refresh tokens.
 */

import "server-only";

interface Entry<T> {
  data: T;
  expiresAt: number;
  fetchedAt: string;
}

const store = new Map<string, Entry<unknown>>();

/** Calendar list / metadata — minutes. */
export const CALENDAR_METADATA_TTL_MS = 15 * 60 * 1000;

/** Free/busy — short-lived. */
export const CALENDAR_FREEBUSY_TTL_MS = 60 * 1000;

export function getCalendarCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCalendarCache<T>(
  key: string,
  data: T,
  ttlMs: number,
): void {
  store.set(key, {
    data,
    fetchedAt: new Date().toISOString(),
    expiresAt: Date.now() + ttlMs,
  });
}

export function clearCalendarReadCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
