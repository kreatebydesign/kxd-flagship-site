/**
 * Phase 32A / 32B — Live executive reporting readiness (honest status).
 * Surfaces what is blocking Website Analytics / Google Ads — never invents connection.
 */

import type { ReportingCapabilityId } from "@/lib/reporting/domain";
import {
  getGoogleAdsRemainingWork,
  summarizeGoogleAdsReadiness,
  type GoogleAdsRemainingWorkItem,
} from "./providers/google/ads/remaining-work";

export type ProviderReadinessStatus =
  | "live"
  | "pipeline-ready-entitlement-blocked"
  | "pipeline-ready-config-blocked"
  | "pipeline-ready-auth-blocked"
  | "not-implemented"
  | "unknown";

export type ProviderReadiness = {
  providerId: "google-search-console" | "google-analytics-4" | "google-ads";
  capabilityId: ReportingCapabilityId;
  status: ProviderReadinessStatus;
  /** Exactly what is blocking live metrics — empty when live/ready. */
  blockers: string[];
  notes: string[];
};

export type ExecutiveReportingReadiness = {
  searchConsole: ProviderReadiness;
  websiteAnalytics: ProviderReadiness;
  googleAds: ProviderReadiness;
  googleAdsRemainingWork: GoogleAdsRemainingWorkItem[];
};

/**
 * Architecture-level readiness from connection inputs.
 * Per-client live diagnosis still comes from connection + facts + sync errors.
 */
export function getExecutiveReportingReadiness(input?: {
  /** When known from experience profile. */
  enabledCapabilities?: ReportingCapabilityId[];
  ga4PropertyId?: string | null;
  searchConsoleSiteUrl?: string | null;
  googleAdsCustomerId?: string | null;
  hasSearchFacts?: boolean;
  hasWebsiteFacts?: boolean;
  hasAdsFacts?: boolean;
  googleAuthMode?: "configured" | "not-configured" | "invalid-configuration" | string;
  /** Whether GOOGLE_ADS_DEVELOPER_TOKEN is present (env). */
  googleAdsDeveloperTokenConfigured?: boolean;
}): ExecutiveReportingReadiness {
  const caps = new Set(input?.enabledCapabilities ?? []);
  const auth = input?.googleAuthMode ?? "unknown";

  const searchBlockers: string[] = [];
  if (auth === "not-configured") searchBlockers.push("Google Reporting credentials are not configured.");
  if (auth === "invalid-configuration") searchBlockers.push("Google Reporting credentials are invalid.");
  if (!input?.searchConsoleSiteUrl) {
    searchBlockers.push("Search Console site URL is not configured on client infrastructure.");
  }
  if (!caps.has("seo") && input?.enabledCapabilities) {
    searchBlockers.push("seo capability is not enabled for this client.");
  }

  const searchStatus: ProviderReadinessStatus = input?.hasSearchFacts
    ? "live"
    : searchBlockers.length
      ? searchBlockers.some((b) => b.includes("credentials"))
        ? "pipeline-ready-auth-blocked"
        : searchBlockers.some((b) => b.includes("capability"))
          ? "pipeline-ready-entitlement-blocked"
          : "pipeline-ready-config-blocked"
      : "unknown";

  const ga4Blockers: string[] = [];
  if (!caps.has("website-analytics") && input?.enabledCapabilities) {
    ga4Blockers.push("website-analytics capability is not enabled for this client.");
  }
  if (!input?.ga4PropertyId) {
    ga4Blockers.push("GA4 property ID is not configured on client infrastructure.");
  } else if (input.enabledCapabilities && !caps.has("website-analytics")) {
    ga4Blockers.push(
      `GA4 property ${input.ga4PropertyId} is stored but entitlement holds website analytics.`,
    );
  }
  if (auth === "not-configured") ga4Blockers.push("Google Reporting credentials are not configured.");
  if (auth === "invalid-configuration") ga4Blockers.push("Google Reporting credentials are invalid.");
  ga4Blockers.push(
    "Property must grant the reporting service account Viewer access in GA4 Admin → Property Access Management.",
  );
  ga4Blockers.push("After entitlement + access, run ingest for provider=ga4 into ReportingFacts.");

  let ga4Status: ProviderReadinessStatus = "pipeline-ready-config-blocked";
  if (input?.hasWebsiteFacts) ga4Status = "live";
  else if (input?.enabledCapabilities && !caps.has("website-analytics")) {
    ga4Status = "pipeline-ready-entitlement-blocked";
  } else if (auth === "not-configured" || auth === "invalid-configuration") {
    ga4Status = "pipeline-ready-auth-blocked";
  } else if (!input?.ga4PropertyId) {
    ga4Status = "pipeline-ready-config-blocked";
  } else {
    ga4Status = "pipeline-ready-entitlement-blocked";
  }

  const adsSummary = summarizeGoogleAdsReadiness();
  const adsBlockers: string[] = [];
  const developerTokenConfigured = input?.googleAdsDeveloperTokenConfigured;
  if (developerTokenConfigured === false) {
    adsBlockers.push("GOOGLE_ADS_DEVELOPER_TOKEN is not configured.");
  }
  if (auth === "not-configured") {
    adsBlockers.push("Google Reporting credentials are not configured (required for Ads API access).");
  }
  if (auth === "invalid-configuration") {
    adsBlockers.push("Google Reporting credentials are invalid.");
  }
  if (!input?.googleAdsCustomerId) {
    adsBlockers.push(
      "Google Ads customer ID is not configured on client infrastructure.",
    );
  }
  if (!caps.has("google-ads") && input?.enabledCapabilities) {
    adsBlockers.push("google-ads capability is not enabled for this client.");
  }
  adsBlockers.push(
    "Do not enable google-ads entitlement or show Connected without real Ads ReportingFacts.",
  );
  for (const label of adsSummary.blockingItems) {
    const already = adsBlockers.some((b) => b.includes(label));
    if (!already) adsBlockers.push(`${label} — still required for live Ads.`);
  }

  let adsStatus: ProviderReadinessStatus = "pipeline-ready-config-blocked";
  if (input?.hasAdsFacts) {
    adsStatus = "live";
  } else if (input?.enabledCapabilities && !caps.has("google-ads")) {
    adsStatus = "pipeline-ready-entitlement-blocked";
  } else if (
    developerTokenConfigured === false ||
    auth === "not-configured" ||
    auth === "invalid-configuration"
  ) {
    adsStatus = "pipeline-ready-auth-blocked";
  } else if (!input?.googleAdsCustomerId) {
    adsStatus = "pipeline-ready-config-blocked";
  } else if (input?.enabledCapabilities && !caps.has("google-ads")) {
    adsStatus = "pipeline-ready-entitlement-blocked";
  } else {
    adsStatus = "pipeline-ready-config-blocked";
  }

  return {
    searchConsole: {
      providerId: "google-search-console",
      capabilityId: "seo",
      status: searchStatus,
      blockers: input?.hasSearchFacts ? [] : searchBlockers.filter(Boolean),
      notes: [
        "Provider, normalize, ingest, and EP Search panel are complete.",
        "Live when ReportingFacts exist for the selected period.",
      ],
    },
    websiteAnalytics: {
      providerId: "google-analytics-4",
      capabilityId: "website-analytics",
      status: ga4Status,
      blockers: input?.hasWebsiteFacts ? [] : ga4Blockers,
      notes: [
        "GA4 client, normalize, bridge, and ingest are implemented.",
        "EP Website panel already refuses fabricated metrics.",
      ],
    },
    googleAds: {
      providerId: "google-ads",
      capabilityId: "google-ads",
      status: adsStatus,
      blockers: input?.hasAdsFacts ? [] : adsBlockers,
      notes: [
        adsSummary.message,
        "Provider layer (ads → google-ads source) is pipeline-ready; remaining gates are env, customer ID, Ads-authorized credentials, and entitlement.",
      ],
    },
    googleAdsRemainingWork: getGoogleAdsRemainingWork(),
  };
}

export {
  getGoogleAdsRemainingWork,
  summarizeGoogleAdsReadiness,
} from "./providers/google/ads/remaining-work";
