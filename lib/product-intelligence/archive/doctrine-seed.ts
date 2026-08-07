/**
 * Doctrine seed linked from Decision Archive (P0-D).
 * Permanent laws only — not full doctrine population beyond archive needs.
 */

import type { DoctrineObject } from "../contracts";

const CREATED_AT = "2026-08-02T00:00:00.000Z";

export const DOCTRINE_OBJECT_ID = "doctrine:kxd-os-edition-1" as const;

export const EDITION_1_DOCTRINE: DoctrineObject = {
  id: DOCTRINE_OBJECT_ID,
  type: "doctrine",
  title: "KXD OS Edition 1 Doctrine (Decision-linked)",
  status: "protected",
  ownerRole: "cpo",
  createdAt: CREATED_AT,
  lastReviewedAt: CREATED_AT,
  nextReviewAt: "2027-02-02T00:00:00.000Z",
  evidenceIds: [],
  relatedObjectIds: [
    "decision:founder-home-today",
    "decision:shared-core",
    "decision:client-command-hq",
    "decision:connect-internal-first",
    "decision:product-intelligence",
    "decision:client-site-intelligence-v1",
  ],
  confidence: "declared",
  summary:
    "Edition 1 operating laws referenced by the Decision Archive, including Client Site Intelligence laws and the major-capability PI gate.",
  detail: {
    productLaws: [
      {
        id: "law-today-sole-home",
        lawClass: "product",
        statement:
          "When the founder logs into KXD OS, they always begin in Today. There is never a second home.",
        evidenceIds: [],
      },
      {
        id: "law-today-owns-attention",
        lawClass: "product",
        statement: "Today owns attention. Modules own depth.",
        evidenceIds: [],
      },
      {
        id: "law-client-command-hq",
        lawClass: "product",
        statement:
          "Client Command remains the permanent per-client headquarters name and purpose.",
        evidenceIds: [],
      },
      {
        id: "law-confidence-before-information",
        lawClass: "product",
        statement:
          "If there is a choice between more information and more confidence, choose confidence.",
        evidenceIds: [],
      },
      {
        id: "law-client-site-events-not-crm",
        lawClass: "product",
        statement:
          "Client-site events (including website leads) are attribution and operational facts — not a CRM or sales pipeline. KXD OS must not force client staff into heavy lead-stage hygiene for website forms.",
        evidenceIds: [],
      },
      {
        id: "law-client-visible-activity-business-value",
        lawClass: "product",
        statement:
          "Client-visible activity must represent meaningful business value. Commits, CI runs, failed deploys, file diffs, dependency bumps, and other developer noise must not appear as client-facing work.",
        evidenceIds: [],
      },
    ],
    architectureLaws: [
      {
        id: "law-shared-core",
        lawClass: "architecture",
        statement:
          "Shared Core is the single source of truth — no duplicate business logic or parallel data planes.",
        evidenceIds: [],
      },
      {
        id: "law-no-duplicate-intelligence",
        lawClass: "architecture",
        statement:
          "No duplicate intelligence layers. Facts before interpretation before action.",
        evidenceIds: [],
      },
      {
        id: "law-connect-isolation",
        lawClass: "architecture",
        statement:
          "Connect remains distinct from Client Communications, portal feedback, and message-kxd until deliberately replaced.",
        evidenceIds: [],
      },
      {
        id: "law-lead-sale-commission-orthogonal",
        lawClass: "architecture",
        statement:
          "Lead capture, confirmed sale, commission obligation, payment, and service are orthogonal. Website form submission must never automatically create commission due; OTP website-attributed commission becomes due only after explicit human sale confirmation.",
        evidenceIds: [],
      },
      {
        id: "law-activity-engine-client-work-memory",
        lawClass: "architecture",
        statement:
          "Activity Engine is the canonical relationship and client-work memory. Portal Work & Performance and client-visible surfaces must consume that memory — do not invent a parallel monthly-work ledger or second activity plane for Client Site Intelligence.",
        evidenceIds: [],
      },
    ],
    uxLaws: [
      {
        id: "law-reduce-cognitive-load",
        lawClass: "ux",
        statement:
          "Whenever there is a choice between adding information and reducing cognitive load, reduce cognitive load.",
        evidenceIds: [],
      },
      {
        id: "law-ai-not-homepage",
        lawClass: "ux",
        statement:
          "AI assists inside the experience. AI is not the homepage and not a chatbot destination.",
        evidenceIds: [],
      },
    ],
    buildAuthorizationRules: [
      {
        id: "law-chat-not-memory",
        lawClass: "build_authorization",
        statement:
          "Chat is not memory. Product Intelligence owns institutional meaning.",
        evidenceIds: [],
      },
      {
        id: "law-evidence-before-opinion",
        lawClass: "build_authorization",
        statement: "Evidence before opinion. Decisions before build.",
        evidenceIds: [],
      },
      {
        id: "law-product-evolution-deliberate",
        lawClass: "build_authorization",
        statement:
          "KXD OS evolves through deliberate product decisions, not accumulated commits.",
        evidenceIds: [],
      },
      {
        id: "law-no-automation-without-approval",
        lawClass: "build_authorization",
        statement: "No automation without explicit approval.",
        evidenceIds: [],
      },
      {
        id: "law-major-capability-pi-gate",
        lawClass: "build_authorization",
        statement:
          "Major capabilities follow IDEA → Product Intelligence review → Human Decision → Implementation → Verification → Product Intelligence evidence update → Release/Health/Valuation update. Exempt: bug fixes, copy, small UI polish, verifier-only work, dependency bumps, and non-semantic refactors.",
        evidenceIds: [],
      },
      {
        id: "law-client-site-intelligence-scoped-v1",
        lawClass: "build_authorization",
        statement:
          "Client Site Intelligence V1 authorizes generalized ClientSiteEvent ingest with OTP Carts as first reference. Forbidden until a new Decision: website-lead CRM, auto-commission on form submit, Stripe auto-invoicing of commissions, parallel monthly-work databases, broad GitHub/Vercel/GSC/GA4 client-visible auto-ingestion, event-bus/queue infrastructure without demonstrated need, merging otp-carts with On Track Performance, and using Product Intelligence or Continuous Intelligence as the operational lead store.",
        evidenceIds: [],
      },
    ],
  },
  updateChannel: "protected",
  version: "1.1.0",
};
