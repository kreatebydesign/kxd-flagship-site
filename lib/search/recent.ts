import type { CommandSearchResult } from "./types";

export const RECENT_SEARCHES_KEY = "kxd-command-search-recent";
export const RECENT_ITEMS_KEY = "kxd-command-search-recent-items";
export const FREQUENT_KEY = "kxd-command-search-frequent";
export const MAX_RECENT_SEARCHES = 20;
export const MAX_RECENT_ITEMS = 20;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  return safeParse<string[]>(localStorage.getItem(RECENT_SEARCHES_KEY), []).slice(
    0,
    MAX_RECENT_SEARCHES,
  );
}

export function saveRecentSearch(query: string): void {
  if (typeof window === "undefined" || !query.trim()) return;
  const q = query.trim();
  const prev = loadRecentSearches().filter((s) => s !== q);
  const next = [q, ...prev].slice(0, MAX_RECENT_SEARCHES);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
}

export function loadRecentItems(): CommandSearchResult[] {
  if (typeof window === "undefined") return [];
  return safeParse<CommandSearchResult[]>(localStorage.getItem(RECENT_ITEMS_KEY), []).slice(
    0,
    MAX_RECENT_ITEMS,
  );
}

export function saveRecentItem(item: CommandSearchResult): void {
  if (typeof window === "undefined") return;
  const prev = loadRecentItems().filter((r) => r.id !== item.id);
  const next = [{ ...item, pinned: undefined, score: undefined }, ...prev].slice(
    0,
    MAX_RECENT_ITEMS,
  );
  localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(next));
}

export function loadFrequentMap(): Map<string, number> {
  if (typeof window === "undefined") return new Map();
  const obj = safeParse<Record<string, number>>(localStorage.getItem(FREQUENT_KEY), {});
  return new Map(Object.entries(obj));
}

export function recordFrequentOpen(id: string): void {
  if (typeof window === "undefined") return;
  const map = loadFrequentMap();
  map.set(id, (map.get(id) ?? 0) + 1);
  const obj = Object.fromEntries(map.entries());
  localStorage.setItem(FREQUENT_KEY, JSON.stringify(obj));
}

export function loadPinnedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  return new Set(safeParse<string[]>(localStorage.getItem("kxd-command-search-pinned-ids"), []));
}

export function togglePinnedId(id: string): boolean {
  if (typeof window === "undefined") return false;
  const ids = loadPinnedIds();
  if (ids.has(id)) {
    ids.delete(id);
  } else {
    ids.add(id);
  }
  localStorage.setItem("kxd-command-search-pinned-ids", JSON.stringify([...ids]));
  return ids.has(id);
}
