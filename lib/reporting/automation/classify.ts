/**
 * Phase 33A.1 — Provider state classification (no invented health).
 */

import {
  REPORTING_PROVIDER_CAPABILITY,
  type ReportingProviderId,
} from "@/lib/reporting/providers/types";
import type {
  ReportingIntegrationStatus,
  ReportingSyncOutcome,
} from "./types";

/** Minimal connection shape — avoids importing server-only loaders. */
export type ReportingConnectionPreflight = {
  enabledCapabilities: readonly string[];
  searchConsoleSiteUrl?: string | null;
  ga4PropertyId?: string | null;
  googleAdsCustomerId?: string | null;
  authMode?: string | null;
};

export function providerConfigPresent(
  provider: ReportingProviderId,
  connection: ReportingConnectionPreflight | null,
): boolean {
  if (!connection) return false;
  if (provider === "search-console") return Boolean(connection.searchConsoleSiteUrl);
  if (provider === "ga4") return Boolean(connection.ga4PropertyId);
  return Boolean(connection.googleAdsCustomerId);
}

export function providerAuthAvailable(
  connection: ReportingConnectionPreflight | null,
): boolean {
  if (!connection) return false;
  return (
    connection.authMode === "vercel-oidc" ||
    connection.authMode === "service-account" ||
    connection.authMode === "oauth-refresh"
  );
}

export function classifyPreflight(input: {
  providerAutomationEnabled: boolean;
  clientAutomationEnabled: boolean;
  provider: ReportingProviderId;
  connection: ReportingConnectionPreflight | null;
}): {
  proceed: boolean;
  outcome: ReportingSyncOutcome;
  integrationStatus: ReportingIntegrationStatus;
  message: string;
  countsAsFailure: false;
} {
  if (!input.clientAutomationEnabled || !input.providerAutomationEnabled) {
    return {
      proceed: false,
      outcome: "skipped-automation-disabled",
      integrationStatus: "automation-disabled",
      message: "Reporting automation disabled for this client/provider.",
      countsAsFailure: false,
    };
  }

  const capability = REPORTING_PROVIDER_CAPABILITY[input.provider];
  if (!input.connection?.enabledCapabilities.includes(capability)) {
    return {
      proceed: false,
      outcome: "skipped-not-entitled",
      integrationStatus: "not-entitled",
      message: `${capability} is not entitled — provider skipped.`,
      countsAsFailure: false,
    };
  }

  if (!providerConfigPresent(input.provider, input.connection)) {
    return {
      proceed: false,
      outcome: "skipped-not-configured",
      integrationStatus: "not-configured",
      message: "Integration is entitled but not configured on Client Infrastructure.",
      countsAsFailure: false,
    };
  }

  if (!providerAuthAvailable(input.connection)) {
    return {
      proceed: false,
      outcome: "skipped-auth-unavailable",
      integrationStatus: "auth-unavailable",
      message: "Reporting credentials are unavailable for this execution host.",
      countsAsFailure: false,
    };
  }

  return {
    proceed: true,
    outcome: "deferred",
    integrationStatus: "idle",
    message: "Ready to execute.",
    countsAsFailure: false,
  };
}

/** Whether an attempted-execution outcome should increment consecutiveFailures. */
export function outcomeIncrementsFailures(outcome: ReportingSyncOutcome): boolean {
  return (
    outcome === "error" ||
    outcome === "timeout" ||
    outcome === "unauthorized" ||
    outcome === "forbidden" ||
    outcome === "invalid" ||
    outcome === "unavailable"
  );
}

export function integrationStatusAfterAttempt(
  outcome: ReportingSyncOutcome,
): ReportingIntegrationStatus {
  if (outcome === "synced" || outcome === "synced-empty") return "healthy";
  if (outcome === "skipped-not-entitled") return "not-entitled";
  if (outcome === "skipped-automation-disabled") return "automation-disabled";
  if (outcome === "skipped-not-configured") return "not-configured";
  if (outcome === "skipped-auth-unavailable") return "auth-unavailable";
  if (outcome === "skipped-awaiting-client") return "awaiting-client";
  if (outcomeIncrementsFailures(outcome)) return "temporarily-failing";
  return "idle";
}
