/**
 * Client Site Intelligence V1 — approved architecture contract (decision institutionalization).
 * Institutional memory only. No ingest API, collections, HMAC runtime, UI, or OTP adapter.
 */

import { CSI_RECORDED_AT } from "./ids";

/** PI + Human Decision verdict for Client Site Intelligence. */
export const CLIENT_SITE_INTELLIGENCE_PI_VERDICT = {
  id: "verdict:client-site-intelligence-v1",
  recordedAt: CSI_RECORDED_AT,
  verdict: "PROCEED_WITH_CHANGES" as const,
  summary:
    "Client Site Intelligence is approved as a scoped Shared Core capability. Generalized ClientSiteEvent ingestion with OTP Carts as the first production reference. Website leads are attribution events, not CRM. Commission becomes due only after human-confirmed sale. Activity Engine remains relationship/work memory. Parallel SEO/content growth for OTP proceeds independently.",
  productFit:
    "Strengthens every KXD-managed client website as an intelligence source into the corresponding client workspace without turning KXD OS into a CRM or noise feed.",
  architectureFit:
    "Extends Shared Core + Activity Engine + existing portal Work & Performance. Must not invent a second monthly-work ledger, website-lead CRM, or parallel event bus without demonstrated need.",
  founderValue:
    "Client-facing monthly value becomes honest and evidence-bound; KXD retains a clean attribution path for website-driven OTP cart sales ($300 after human confirmation).",
  productValue:
    "One generalized client-site event contract replaces OTP-specific silos and prepares multi-client website intelligence.",
  valuationNote:
    "NEEDS HUMAN DECISION for any material numeric platform valuation. OTP commission rule ($300/confirmed sale) is a commercial attribution fact, not a Stripe auto-invoice product.",
} as const;

/** Explicit V1 scope — implementation must not exceed without a new Decision. */
export const CLIENT_SITE_INTELLIGENCE_V1_SCOPE = {
  inScope: [
    "Generalized ClientSiteEvent Shared Core concept (website_lead and curated event classes)",
    "OTP Carts as first production reference implementation (clientKey otp-carts)",
    "Signed, idempotent website → KXD OS ingest for website leads",
    "Minimal lead lifecycle: new → (optional acknowledged) → sold_confirmed | closed_no_sale → commission_due → commission_paid",
    "Human confirmation required before commission becomes due ($300 OTP rule)",
    "Activity Engine publish for relationship/work memory",
    "Portal Work & Performance / client-visible surfaces consume Activity Engine memory",
    "Manual honest July/August 2026 OTP monthly-value backfill from evidence",
    "Internal vs client-visible vocabulary controls (business value only client-facing)",
    "Parallel OTP SEO/content organic growth track (separate roadmap)",
  ],
  outOfScopeV1: [
    "Website-lead CRM / sales pipeline for anonymous form leads",
    "Automatic commission on form submission",
    "Stripe auto-invoicing of commissions",
    "Parallel monthly-work database or ledger",
    "Broad GitHub/Vercel/GSC/GA4 client-visible auto-ingestion",
    "Event-bus / queue infrastructure without demonstrated need",
    "Merging OTP Carts (otp-carts) with On Track Performance (otp)",
    "Using Product Intelligence or Continuous Intelligence as the operational lead store",
    "Client-visible commit/CI/failed-deploy/dependency noise feeds",
    "Usage Reality / Continuous Intelligence completion claims",
  ],
} as const;

/** Recommended implementation batches — order is binding for V1 after this Decision. */
export const CLIENT_SITE_INTELLIGENCE_IMPLEMENTATION_BATCHES = [
  {
    id: "csi-v1-a",
    title: "ClientSiteEvent contract + signed OTP lead ingest + idempotency",
    note: "Shared Core seam only. No CRM UI. Email delivery on OTP site remains fail-soft.",
  },
  {
    id: "csi-v1-b",
    title: "Operator confirm-sale / commission obligation states",
    note: "Minimal human confirmation UI. Orthogonal to Stripe billing and service activation.",
  },
  {
    id: "csi-v1-c",
    title: "Activity publish + curated July/August 2026 OTP monthly value backfill",
    note: "Activity Engine only. No second monthly ledger. Honest dates/evidence only.",
  },
  {
    id: "csi-v1-d",
    title: "Portal Work & Performance / client-visible vocabulary polish",
    note: "Consume Activity Engine; do not invent parallel presentation truth.",
  },
  {
    id: "after-csi-v1",
    title: "Curated adapters (GSC/Vercel/GitHub) + additional managed client sites",
    note: "Requires trustworthy evidence + visibility controls; never auto-noise.",
  },
] as const;

/**
 * Discoverable gate summary for Cursor / humans.
 * Overall Client Site Intelligence V1 is still incomplete.
 * Foundation batch csi-v1-a implemented locally (not production-proven).
 */
/**
 * Platform major-capability gate — owned here for CSI release on main
 * (does not require the KXD Sign PI pack).
 */
export const MAJOR_CAPABILITY_PI_GATE = {
  id: "gate:major-capability-pi",
  flow: [
    "IDEA",
    "PRODUCT_INTELLIGENCE_REVIEW",
    "HUMAN_DECISION",
    "IMPLEMENTATION",
    "VERIFICATION",
    "PRODUCT_INTELLIGENCE_EVIDENCE_UPDATE",
    "RELEASE_HEALTH_VALUATION_UPDATE",
  ] as const,
  qualifiesAsMajor: [
    "new named product surface or public trust ceremony",
    "new security/auth boundary",
    "new commercial/legal evidence path",
    "new persistence model or data plane",
    "capability significant enough for kill-list consideration",
    "multi-batch / platform-scale work",
  ] as const,
  exempt: [
    "bug fixes",
    "copy changes",
    "small UI polish",
    "verifier-only work",
    "dependency bumps",
    "non-semantic refactors",
  ] as const,
} as const;

export const CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE = {
  id: "gate:client-site-intelligence-v1",
  verdict: "PROCEED_WITH_CHANGES",
  decisionId: "decision:client-site-intelligence-v1",
  implemented: false,
  shipped: false,
  productionProven: false,
  capabilityState: "IN_IMPLEMENTATION",
  referenceClientKey: "otp-carts",
  foundationBatch: "csi-v1-a",
  foundationImplementedLocally: true,
  foundationProductionProven: false,
  nextImplementationBatch: "csi-v1-b",
  ingestApiImplemented: true,
  hmacImplemented: true,
  collectionsImplemented: true,
  saleConfirmationUiImplemented: false,
  commissionUiImplemented: false,
  julyAugustBackfillImplemented: false,
  continuousIntelligenceUnchanged: true,
  productDnaUnchanged: true,
} as const;
