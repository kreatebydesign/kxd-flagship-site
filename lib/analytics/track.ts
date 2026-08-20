/**
 * Safe public-site GA4 event helper.
 * No-ops off production hosts and when gtag is unavailable.
 */

"use client";

import {
  acquisitionContextToEventParams,
  getBrowserAcquisitionContext,
} from "./ai-referral";
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

/**
 * Merge page-level params with captured acquisition context.
 * Custom params only — does not set GA4 traffic source/medium fields.
 */
export function withAcquisitionContext(
  params?: EventParams,
): Record<string, string | number | boolean> {
  const cleaned: Record<string, string | number | boolean> = {
    ...acquisitionContextToEventParams(getBrowserAcquisitionContext()),
  };
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export function trackPublicEvent(
  eventName: string,
  params?: EventParams,
): void {
  if (!isAllowedHost()) return;
  if (typeof window.gtag !== "function") return;

  window.gtag("event", eventName, withAcquisitionContext(params));
}
