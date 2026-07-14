/**
 * Phase 32B — Safe GA4 activation checklist (Shared Core documentation).
 * Do not enable website-analytics until Viewer access is verified via probe.
 */

export const GA4_ACTIVATION_CHECKLIST = {
  serviceAccountExample: "kxd-os-reporting@kxd-os.iam.gserviceaccount.com",
  /**
   * Production uses Vercel OIDC + GCP Workload Identity (GCP_* env).
   * Local typically needs GOOGLE_REPORTING_SERVICE_ACCOUNT_JSON or OAuth.
   */
  authNote:
    "Local dry-runs report not-configured without SA JSON/OAuth; production Vercel OIDC (GCP_*) is the intended path.",
  steps: [
    "Set Client Infrastructure.ga4PropertyId for the client (digits or properties/N — normalized automatically).",
    "In GA4 Admin → Property Access Management, grant Viewer to the reporting service account on that property.",
    "Confirm Google Reporting auth: production GCP_* OIDC, or local GOOGLE_REPORTING_SERVICE_ACCOUNT_JSON / OAuth.",
    "Dry-run: npm run activate:ga4 -- --client-slug=<slug> (or --client-id=<id>).",
    "On successful probe: npm run activate:ga4:apply -- --client-slug=<slug>",
    "That enables website-analytics and ingests ga4 ReportingFacts for the default executive period.",
    "Confirm Sessions / Users / Pageviews / Conversions in Executive Performance and /portal/partnership.",
  ],
  doNot: [
    "Do not enable website-analytics before successful access verification.",
    "Do not fabricate Website metrics in Executive Performance or briefing.",
  ],
} as const;

/** @deprecated Prefer GA4_ACTIVATION_CHECKLIST — kept for older verify imports. */
export const PRIMAL_GA4_ACTIVATION = {
  ...GA4_ACTIVATION_CHECKLIST,
  clientSlug: null,
  propertyId: null as string | null,
} as const;
