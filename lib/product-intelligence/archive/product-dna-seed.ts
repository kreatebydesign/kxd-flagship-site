/**
 * Product DNA seed linked from Decision Archive (P0-D Workstream 4).
 * Philosophy principles only — not roadmap, not features.
 */

import type { ProductDnaObject } from "../contracts";

const CREATED_AT = "2026-08-02T00:00:00.000Z";

export const PRODUCT_DNA_OBJECT_ID = "dna:kxd-os-edition-1" as const;

/**
 * Edition 1 Product DNA — permanent identity principles.
 * Harder to change than Doctrine. Never becomes roadmap.
 */
export const EDITION_1_PRODUCT_DNA: ProductDnaObject = {
  id: PRODUCT_DNA_OBJECT_ID,
  type: "product_dna",
  title: "KXD OS Edition 1 Product DNA",
  status: "protected",
  ownerRole: "founder",
  createdAt: CREATED_AT,
  lastReviewedAt: CREATED_AT,
  nextReviewAt: "2027-08-02T00:00:00.000Z",
  evidenceIds: [],
  relatedObjectIds: [
    "decision:product-philosophy",
    "decision:founder-home-today",
    "decision:ai-operating-philosophy",
  ],
  confidence: "declared",
  summary: "What KXD OS fundamentally is — confidence, calm, business truth, premium craft.",
  detail: {
    coreBeliefs: [
      {
        id: "dna-belief-business-before-software",
        statement: "Business before software.",
        evidenceIds: [],
      },
      {
        id: "dna-belief-one-truth",
        statement: "One truth.",
        evidenceIds: [],
      },
      {
        id: "dna-belief-invisible-complexity",
        statement: "Invisible complexity.",
        evidenceIds: [],
      },
    ],
    productPrinciples: [
      {
        id: "dna-principle-confidence-before-information",
        statement: "Confidence before information.",
        evidenceIds: [],
      },
      {
        id: "dna-principle-reduce-cognitive-load",
        statement: "Reduce cognitive load.",
        evidenceIds: [],
      },
      {
        id: "dna-principle-calm-beats-clutter",
        statement: "Calm beats clutter.",
        evidenceIds: [],
      },
      {
        id: "dna-principle-premium-over-feature-count",
        statement: "Premium over feature count.",
        evidenceIds: [],
      },
    ],
    founderPrinciples: [
      {
        id: "dna-founder-time-reclaimed",
        statement: "Founder time reclaimed is the ultimate KPI.",
        evidenceIds: [],
      },
      {
        id: "dna-founder-today-owns-attention",
        statement: "Today owns attention; modules own depth.",
        evidenceIds: [],
      },
    ],
    craftStandards: [
      {
        id: "dna-craft-studio-software",
        statement: "Studio software — editorial, intentional, executive, calm.",
        evidenceIds: [],
      },
      {
        id: "dna-craft-intelligence-disappears",
        statement: "Studio intelligence disappears into the workflow.",
        evidenceIds: [],
      },
    ],
    nonNegotiables: [
      {
        id: "dna-nn-not-chatbot",
        statement: "KXD OS is not an AI chatbot.",
        evidenceIds: [],
      },
      {
        id: "dna-nn-chat-not-memory",
        statement: "Chat is not memory.",
        evidenceIds: [],
      },
      {
        id: "dna-nn-never-roadmap",
        statement: "Product DNA never becomes roadmap or feature backlog.",
        evidenceIds: [],
      },
    ],
    neverBecomesRoadmap: true,
    neverBecomesFeatures: true,
  },
  updateChannel: "protected",
  version: "1.0.0",
};
