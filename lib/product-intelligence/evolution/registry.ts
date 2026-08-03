/**
 * Product Evolution type registry (P0-G).
 */

import type { ProductEvolutionTypeDefinition } from "./types";

export const PRODUCT_EVOLUTION_TYPE_DEFINITIONS: ProductEvolutionTypeDefinition[] =
  [
    {
      id: "product_milestone",
      title: "Product Milestone",
      purpose: "Meaningful product shape or operating-model change.",
    },
    {
      id: "architecture_milestone",
      title: "Architecture Milestone",
      purpose: "Durable layer, boundary, or system-map evolution.",
    },
    {
      id: "ux_milestone",
      title: "UX Milestone",
      purpose: "Founder/client experience or cognitive-load breakthrough.",
    },
    {
      id: "platform_milestone",
      title: "Platform Milestone",
      purpose: "Platform capability that changes what KXD OS can be.",
    },
    {
      id: "infrastructure_milestone",
      title: "Infrastructure Milestone",
      purpose: "Technical foundation change that enables product evolution.",
    },
    {
      id: "ai_milestone",
      title: "AI Milestone",
      purpose: "AI operating philosophy or assistance capability milestone.",
    },
    {
      id: "commercial_milestone",
      title: "Commercial Milestone",
      purpose: "Billing, agreements, or commercial readiness evolution.",
    },
    {
      id: "integration_milestone",
      title: "Integration Milestone",
      purpose: "External system integration that becomes product law.",
    },
    {
      id: "deployment_milestone",
      title: "Deployment Milestone",
      purpose: "Meaningful deploy/environment milestone — not routine deploys.",
    },
    {
      id: "verification_milestone",
      title: "Verification Milestone",
      purpose: "Verification/quality system that permanently raises trust.",
    },
  ];
