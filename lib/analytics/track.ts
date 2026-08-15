/**
 * Safe public-site GA4 event helper.
 * No-ops off production hosts and when gtag is unavailable.
 */

"use client";

import { PUBLIC_ANALYTICS_HOSTS } from "./config";

type EventParams = Record<string, string | number | boolean | undefined | null>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function isAllowedHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return (PUBLIC_ANALYTICS_HOSTS as readonly string[]).includes(host);
}

export function trackPublicEvent(
  eventName: string,
  params?: EventParams,
): void {
  if (!isAllowedHost()) return;
  if (typeof window.gtag !== "function") return;

  const cleaned: Record<string, string | number | boolean> = {};
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      cleaned[key] = value;
    }
  }

  window.gtag("event", eventName, cleaned);
}
