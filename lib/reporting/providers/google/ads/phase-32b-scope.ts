/**
 * Phase 32B — Google Ads live reporting implementation scope.
 * Pipeline shipped (config / entitlement gated). Reference for operators.
 */

export const GOOGLE_ADS_PHASE_32B_SCOPE = {
  readyForImplementation: true,
  pipelineShipped: true,
  workstreams: [
    {
      id: "auth-model",
      label: "OAuth vs service-account limitations",
      detail:
        "Google Ads typically requires OAuth + developer token; service accounts alone are often insufficient. Decide and document the supported auth path.",
    },
    {
      id: "developer-token",
      label: "Developer token",
      detail: "Obtain and securely store Google Ads API developer token; wire into reporting auth config.",
    },
    {
      id: "account-hierarchy",
      label: "Manager / customer relationship",
      detail:
        "Support MCC login-customer-id when needed and per-client customer IDs. Never scrape Ads UI.",
    },
    {
      id: "infrastructure",
      label: "Client Infrastructure fields",
      detail: "Add googleAdsCustomerId (and optional loginCustomerId) to client-infrastructure resolution.",
    },
    {
      id: "entitlement",
      label: "Entitlement",
      detail:
        "Enable google-ads capability only after connection verifies. EP/briefing stay Not yet until facts exist.",
    },
    {
      id: "provider",
      label: "Provider adapter",
      detail:
        "Implement lib/reporting/providers/google/ads (client + bridge). Extend ReportingProviderId beyond ga4 | search-console.",
    },
    {
      id: "normalization",
      label: "Normalization",
      detail:
        "Map Ads metrics to canonical keys (ad_spend, clicks, conversions, cost_per_lead when provided by API — never invent).",
    },
    {
      id: "facts",
      label: "ReportingFacts",
      detail: "Persist normalized facts with provider google-ads and domain marketing.",
    },
    {
      id: "ingestion",
      label: "Ingestion",
      detail: "Register google-ads in REPORTING_INGEST_PROVIDERS and syncReportingFacts.",
    },
    {
      id: "automation",
      label: "Automation",
      detail: "Optional cron sync after manual verification — never automate without approval.",
    },
    {
      id: "verification",
      label: "Verification",
      detail:
        "Provider tests, live read verify, EP Ads panel Connected only with domain facts, briefing labels prepared vs live correctly.",
    },
  ],
} as const;
