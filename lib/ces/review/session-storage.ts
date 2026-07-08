import type { ReviewSessionPin } from "./types";
import { REVIEW_SESSION_STORAGE_PREFIX } from "./capture";

export function reviewSessionStorageKey(sessionId: string): string {
  return `${REVIEW_SESSION_STORAGE_PREFIX}${sessionId}`;
}

export function loadSessionPins(sessionId: string): ReviewSessionPin[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(reviewSessionStorageKey(sessionId));
    if (!raw) return [];
    return JSON.parse(raw) as ReviewSessionPin[];
  } catch {
    return [];
  }
}

export function saveSessionPins(sessionId: string, pins: ReviewSessionPin[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(reviewSessionStorageKey(sessionId), JSON.stringify(pins));
  } catch {
    // Quota or private mode — session pins remain in memory only
  }
}

export function nextPinNumber(pins: ReviewSessionPin[]): number {
  if (pins.length === 0) return 1;
  return Math.max(...pins.map((p) => p.number)) + 1;
}
