/**
 * Future Bets category + maturity registries (P0-J).
 */

import type {
  FutureBetCategoryDefinition,
  FutureBetMaturityDefinition,
} from "./types";

export const FUTURE_BET_CATEGORY_DEFINITIONS: FutureBetCategoryDefinition[] = [
  {
    id: "ai",
    title: "AI",
    purpose: "Protected convictions about AI assistance inside KXD OS.",
  },
  {
    id: "founder_experience",
    title: "Founder Experience",
    purpose: "Future founder-operating breakthroughs worth protecting.",
  },
  {
    id: "client_experience",
    title: "Client Experience",
    purpose: "Future client-trust or clarity directions before commitment.",
  },
  {
    id: "workflow",
    title: "Workflow",
    purpose: "Workflow futures that may redefine operating rhythm.",
  },
  {
    id: "automation",
    title: "Automation",
    purpose: "Automation convictions that still require explicit approval.",
  },
  {
    id: "platform",
    title: "Platform",
    purpose: "Platform capability futures that could expand what KXD OS is.",
  },
  {
    id: "infrastructure",
    title: "Infrastructure",
    purpose: "Infrastructure directions believed important but not yet decided.",
  },
  {
    id: "commercial",
    title: "Commercial",
    purpose: "Commercial model futures kept as conviction, not commitment.",
  },
  {
    id: "strategy",
    title: "Strategy",
    purpose: "Strategic futures that shape long-horizon direction.",
  },
  {
    id: "product",
    title: "Product",
    purpose: "Product identity futures protected from premature build.",
  },
];

export const FUTURE_BET_MATURITY_DEFINITIONS: FutureBetMaturityDefinition[] = [
  {
    id: "observation",
    title: "Observation",
    meaning: "Seen as potentially important; not yet explored.",
    isRoadmap: false,
  },
  {
    id: "exploration",
    title: "Exploration",
    meaning: "Actively understood as a possible future direction.",
    isRoadmap: false,
  },
  {
    id: "conviction",
    title: "Conviction",
    meaning: "Believed strategically important — still not scheduled.",
    isRoadmap: false,
  },
  {
    id: "candidate",
    title: "Candidate",
    meaning: "Ready for Decision consideration with evidence pack.",
    isRoadmap: false,
  },
  {
    id: "approved",
    title: "Approved",
    meaning:
      "Approved as a protected conviction. Still NOT roadmap. Requires Decision Archive entry before build.",
    isRoadmap: false,
  },
  {
    id: "retired",
    title: "Retired",
    meaning: "No longer an active Future Bet — reason must be recorded later.",
    isRoadmap: false,
  },
];
