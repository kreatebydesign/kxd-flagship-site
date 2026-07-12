/**
 * Future extension points — domain surfaces consume signals without
 * changing Executive Today composition.
 */

import type { ExecutiveSignal, SignalDomain } from "./types";

export const SIGNAL_EXTENSION_DOMAINS: readonly SignalDomain[] = [
  "client",
  "work",
  "review",
  "finance",
  "training",
  "onboarding",
  "relationship",
  "calendar",
  "business-development",
  "notifications",
  "system",
] as const;

/**
 * Filter signals for a future domain surface (Client Success, Finance, etc.).
 */
export function filterSignalsByDomain(
  signals: ExecutiveSignal[],
  domains: SignalDomain | SignalDomain[],
): ExecutiveSignal[] {
  const set = new Set(Array.isArray(domains) ? domains : [domains]);
  return signals.filter((s) => set.has(s.domain));
}

/**
 * Map domains to planned product surfaces.
 */
export const SIGNAL_SURFACE_MAP = {
  "client-success": ["client", "relationship", "onboarding", "review"] as SignalDomain[],
  finance: ["finance"] as SignalDomain[],
  "business-development": ["business-development", "finance"] as SignalDomain[],
  calendar: ["calendar"] as SignalDomain[],
  training: ["training"] as SignalDomain[],
  "website-review": ["review"] as SignalDomain[],
  notifications: ["notifications", "work", "review", "finance"] as SignalDomain[],
} as const;
