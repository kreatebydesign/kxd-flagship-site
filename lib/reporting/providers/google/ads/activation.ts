/**
 * Phase 32B — Safe Google Ads activation checklist (Shared Core documentation).
 */

export const GOOGLE_ADS_ACTIVATION_CHECKLIST = {
  developerTokenEnv: "GOOGLE_ADS_DEVELOPER_TOKEN",
  developerTokenWhereToGet:
    "Google Ads → Tools & Settings → Setup → API Center → Developer token (apply for Basic/Standard access as required).",
  developerTokenWhereToStore:
    "Vercel Production environment variables (and operator .env.local for local probes). Never commit. Never store on Client Infrastructure.",
  customerIdField: "ClientInfrastructure.googleAdsCustomerId",
  loginCustomerIdField: "ClientInfrastructure.googleAdsLoginCustomerId (optional MCC)",
  customerIdNormalization: "Non-digits stripped automatically (123-456-7890 → 1234567890).",
  oauthScope: "https://www.googleapis.com/auth/adwords",
  steps: [
    "Obtain / approve Google Ads developer token in API Center; set GOOGLE_ADS_DEVELOPER_TOKEN in Vercel.",
    "Ensure reporting credentials are Ads-authorized (OAuth refresh with adwords scope, or SA granted Ads access).",
    "Set googleAdsCustomerId on Client Infrastructure for the client (optional googleAdsLoginCustomerId for MCC).",
    "Dry-run: npm run activate:google-ads -- --client-slug=<slug>",
    "On successful probe: npm run activate:google-ads:apply -- --client-slug=<slug>",
    "Confirm Ads metrics in Executive Performance and /portal/partnership only after ReportingFacts exist.",
  ],
  doNot: [
    "Do not enable google-ads entitlement before a successful Ads API probe.",
    "Do not invent customer IDs or fabricate Connected Ads panels.",
  ],
} as const;
