/**
 * Phase 32B — Google Ads reporting remaining work (honest status only).
 * Pipeline is implemented; live metrics remain config / entitlement gated.
 * Do not fabricate metrics or fake Connected without ReportingFacts.
 */

export type GoogleAdsWorkItemStatus =
  | "missing"
  | "partial"
  | "ready"
  | "not-started";

export type GoogleAdsRemainingWorkItem = {
  id: string;
  label: string;
  status: GoogleAdsWorkItemStatus;
  blocking: boolean;
  note: string;
};

/**
 * Static architecture assessment — what remains for live Ads reporting.
 * Values are structural truth in this codebase, not per-client live API checks.
 */
export function getGoogleAdsRemainingWork(): GoogleAdsRemainingWorkItem[] {
  return [
    {
      id: "developer-token",
      label: "Google Ads developer token",
      status: "partial",
      blocking: true,
      note: "GOOGLE_ADS_DEVELOPER_TOKEN wiring exists; env must be set before any Ads API call.",
    },
    {
      id: "customer-mapping",
      label: "Customer ID mapping on Client Infrastructure",
      status: "ready",
      blocking: true,
      note: "googleAdsCustomerId (+ optional googleAdsLoginCustomerId) fields resolve in reporting connection. Per-client values must be filled — never fabricate.",
    },
    {
      id: "authentication",
      label: "Ads-scoped OAuth / service account access",
      status: "partial",
      blocking: true,
      note: "Shared Google Reporting credentials mint a separate adwords-scoped token. Refresh token / SA must be Ads-authorized.",
    },
    {
      id: "provider",
      label: "Reporting provider (lib/reporting/providers/google/ads)",
      status: "ready",
      blocking: false,
      note: "ReportingProviderId includes ads; sourceProviderId is google-ads; client + bridge + normalize ship.",
    },
    {
      id: "normalization",
      label: "Ads metric normalization → ReportingFacts",
      status: "ready",
      blocking: false,
      note: "Maps cost_micros→ad_spend, clicks, conversions, cost_per_conversion→cost_per_lead (API-provided only), impressions when present.",
    },
    {
      id: "reporting-facts",
      label: "Persistence + ingest provider registration",
      status: "ready",
      blocking: false,
      note: "REPORTING_INGEST_PROVIDERS includes ads; syncReportingFacts persists entitled provider facts.",
    },
    {
      id: "entitlement",
      label: "google-ads entitlement + EP surface",
      status: "partial",
      blocking: true,
      note: "Capability vocabulary exists (google-ads). Must remain off until real facts; EP already refuses fabricated Ads metrics.",
    },
    {
      id: "executive-performance",
      label: "Executive Performance Ads panel",
      status: "ready",
      blocking: false,
      note: "UI panel exists and correctly shows not-connected / awaiting-signal without inventing numbers.",
    },
  ];
}

export function summarizeGoogleAdsReadiness(): {
  readyForLiveReporting: false;
  blockingItems: string[];
  message: string;
} {
  const items = getGoogleAdsRemainingWork();
  const blockingItems = items.filter((i) => i.blocking).map((i) => i.label);
  return {
    readyForLiveReporting: false,
    blockingItems,
    message:
      "Google Ads pipeline is implemented but config-gated: developer token, Ads-authorized credentials, per-client customer ID, and google-ads entitlement are required before live facts. Do not fake connected providers.",
  };
}
