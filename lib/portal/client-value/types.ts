/**
 * Client Value Projection — Batch 1 types (portal-safe presentation only).
 * Never includes secrets, property IDs, costs, or raw infrastructure docs.
 */

export type ClientValueAvailability =
  | "ready"
  | "monitoring"
  | "action-needed"
  | "unknown"
  | "disconnected"
  | "new-tracking"
  | "insufficient"
  | "not-entitled"
  | "empty";

export type ClientCareContinuityStatus =
  | "protected-and-active"
  | "monitoring"
  | "action-needed"
  | "renewal-unknown"
  | "not-configured";

export type ClientCareContinuityLine = {
  id: string;
  label: string;
  value: string;
  detail: string | null;
};

export type ClientCareContinuity = {
  availability: ClientValueAvailability;
  status: ClientCareContinuityStatus;
  headline: string;
  lead: string;
  lines: ClientCareContinuityLine[];
  /** Client-safe hosting label (never internal ops notes). */
  hostingLabel: string | null;
  responsiblePartyLabel: string | null;
};

export type ClientPerformanceStoryTone =
  | "positive"
  | "steady"
  | "caution"
  | "unknown";

export type ClientPerformanceStory = {
  availability: ClientValueAvailability;
  tone: ClientPerformanceStoryTone;
  whatMovedForward: string;
  whatItMeans: string;
  strongestSignal: string | null;
  whatKxdIsWatching: string;
  smartestNextMove: string;
  periodLabel: string;
};

export type ClientValueProjection = {
  /** Isolation stamp — must match authorized session client. */
  clientId: number;
  performanceStory: ClientPerformanceStory;
  careContinuity: ClientCareContinuity;
};

/** Allowlisted infrastructure fields used for Care & Continuity (names only). */
export const CLIENT_VALUE_INFRA_ALLOWLIST = [
  "hostingProvider",
  "nextRenewalDate",
  "domainExpirationDate",
  "domainAutoRenew",
  "primaryDomain",
] as const;

export type ClientValueInfraAllowlistKey =
  (typeof CLIENT_VALUE_INFRA_ALLOWLIST)[number];

/** Fields that must never appear in portal client-value output. */
export const CLIENT_VALUE_INFRA_DENYLIST = [
  "ga4PropertyId",
  "searchConsoleSiteUrl",
  "googleAdsCustomerId",
  "googleAdsLoginCustomerId",
  "githubRepo",
  "vercelProject",
  "dnsProvider",
  "domainRegistrar",
  "sslCertificateNotes",
  "notes",
  "internalNotes",
  "loginNotes",
  "credentials",
  "password",
  "token",
  "apiKey",
  "secret",
  "estimatedRenewalAmount",
  "renewalAmount",
  "cost",
] as const;
