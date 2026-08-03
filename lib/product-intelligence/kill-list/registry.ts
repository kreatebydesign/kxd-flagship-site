/**
 * Product Kill List category + qualification registries (P0-I).
 */

import type {
  ProductKillListCategoryDefinition,
  ProductKillListQualificationDefinition,
} from "./types";

export const PRODUCT_KILL_LIST_CATEGORY_DEFINITIONS: ProductKillListCategoryDefinition[] =
  [
    {
      id: "ux",
      title: "UX",
      purpose: "Refusals that protect calm, clarity, and cognitive load.",
    },
    {
      id: "product",
      title: "Product",
      purpose: "Refusals that protect product identity and operating model.",
    },
    {
      id: "architecture",
      title: "Architecture",
      purpose: "Refusals that prevent parallel systems and boundary drift.",
    },
    {
      id: "ai",
      title: "AI",
      purpose: "Refusals that keep AI assistive — never chatbot gravity.",
    },
    {
      id: "workflow",
      title: "Workflow",
      purpose: "Refusals that protect founder/operator workflow integrity.",
    },
    {
      id: "commercial",
      title: "Commercial",
      purpose: "Refusals that protect commercial model and trust boundaries.",
    },
    {
      id: "platform",
      title: "Platform",
      purpose: "Refusals that keep platform scope coherent.",
    },
    {
      id: "infrastructure",
      title: "Infrastructure",
      purpose: "Refusals that reject infrastructure paths that redefine the product.",
    },
    {
      id: "strategy",
      title: "Strategy",
      purpose: "Strategic refusals that permanently shape direction.",
    },
    {
      id: "experience",
      title: "Experience",
      purpose: "Refusals that protect the lived experience of KXD OS.",
    },
  ];

export const PRODUCT_KILL_LIST_QUALIFICATION_DEFINITIONS: ProductKillListQualificationDefinition[] =
  [
    {
      id: "identity_boundary",
      title: "Identity Boundary",
      requirement:
        "Rejecting a concept that would create a second product identity or competing home.",
      disqualifies: "Abandoned experiments without identity consequence.",
      examples: ["Multiple founder dashboards", "Second homepage destination"],
    },
    {
      id: "philosophy_conflict",
      title: "Philosophy Conflict",
      requirement:
        "Rejecting a path that conflicts with Product DNA / Doctrine philosophy.",
      disqualifies: "Taste preferences without doctrinal conflict.",
      examples: ["Homepage chatbot", "AI as destination rather than assist"],
    },
    {
      id: "architecture_parallel",
      title: "Architecture Parallel",
      requirement:
        "Rejecting a parallel system that would duplicate Shared Core or communication planes.",
      disqualifies: "Temporary technical spikes without lasting architecture risk.",
      examples: [
        "Duplicate communication systems",
        "Native cloud storage that splits truth",
      ],
    },
    {
      id: "cognitive_load_protection",
      title: "Cognitive Load Protection",
      requirement:
        "Rejecting a surface that would permanently increase operator hesitation or noise.",
      disqualifies: "One-off UX bugs or unfinished prototypes.",
      examples: ["Notification overload", "Attention-splitting alert chrome"],
    },
    {
      id: "commercial_boundary",
      title: "Commercial Boundary",
      requirement:
        "Rejecting a commercial path that would undermine trust, clarity, or model integrity.",
      disqualifies: "Deferred billing polish without strategic refusal.",
      examples: ["Accounting-platform scope creep"],
    },
  ];
