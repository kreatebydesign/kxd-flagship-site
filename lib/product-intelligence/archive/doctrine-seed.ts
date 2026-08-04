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
  ],
  confidence: "declared",
  summary: "Edition 1 operating laws referenced by the Decision Archive.",
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
    ],
  },
  updateChannel: "protected",
  version: "1.0.0",
};
