/**
 * Hall of Fame category + qualification registries (P0-H).
 */

import type {
  HallOfFameCategoryDefinition,
  HallOfFameQualificationDefinition,
} from "./types";

export const HALL_OF_FAME_CATEGORY_DEFINITIONS: HallOfFameCategoryDefinition[] =
  [
    {
      id: "product",
      title: "Product",
      purpose: "Defining product identity or operating-model moments.",
    },
    {
      id: "architecture",
      title: "Architecture",
      purpose: "Moments that permanently changed system structure or boundaries.",
    },
    {
      id: "ux",
      title: "UX",
      purpose: "Permanent experience transformations — not visual polish alone.",
    },
    {
      id: "ai",
      title: "AI",
      purpose: "AI philosophy or assistance milestones that became product law.",
    },
    {
      id: "founder_experience",
      title: "Founder Experience",
      purpose: "Breakthroughs in how the founder operates the business day to day.",
    },
    {
      id: "client_experience",
      title: "Client Experience",
      purpose: "Moments that permanently raised client trust or clarity.",
    },
    {
      id: "commercial",
      title: "Commercial",
      purpose: "Commercial model or agreements moments with lasting identity impact.",
    },
    {
      id: "platform",
      title: "Platform",
      purpose: "Platform capability moments that changed what KXD OS can be.",
    },
    {
      id: "strategy",
      title: "Strategy",
      purpose: "Strategic commitments that permanently shaped direction.",
    },
    {
      id: "company",
      title: "Company",
      purpose: "Company-level moments that redefined how Kreate by Design operates.",
    },
  ];

export const HALL_OF_FAME_QUALIFICATION_DEFINITIONS: HallOfFameQualificationDefinition[] =
  [
    {
      id: "product_philosophy_shift",
      title: "Product Philosophy Shift",
      requirement:
        "A lasting change in what KXD OS believes or refuses to become.",
      disqualifies: "Feature launches, copy tweaks, temporary experiments.",
    },
    {
      id: "major_architectural_evolution",
      title: "Major Architectural Evolution",
      requirement:
        "A durable layer, boundary, or Shared Core change with lasting leverage.",
      disqualifies: "Refactors without product-law consequence.",
    },
    {
      id: "founder_workflow_breakthrough",
      title: "Founder Workflow Breakthrough",
      requirement:
        "A permanent improvement in founder morning/operating confidence or clarity.",
      disqualifies: "One-off convenience or personal preference hacks.",
    },
    {
      id: "new_product_law",
      title: "New Product Law",
      requirement:
        "A Decision that became permanent doctrine/DNA operating law.",
      disqualifies: "Tactical decisions without institutional permanence.",
    },
    {
      id: "permanent_ux_transformation",
      title: "Permanent UX Transformation",
      requirement:
        "A lasting cognitive-load or experience identity change for operators or clients.",
      disqualifies: "Routine UI polish or temporary layout experiments.",
    },
  ];
