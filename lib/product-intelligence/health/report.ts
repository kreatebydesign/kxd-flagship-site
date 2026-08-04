/**
 * Platform Health Report contract (P0-E).
 * Structure only — generation is not authorized.
 */

import type { PlatformHealthReportContract } from "./types";
import { PLATFORM_HEALTH_QUESTION } from "./types";

export const PLATFORM_HEALTH_REPORT_CONTRACT: PlatformHealthReportContract = {
  schemaVersion: "P0-E",
  title: "KXD OS Platform Health Report",
  permanentQuestion: PLATFORM_HEALTH_QUESTION,
  generationAuthorized: false,
  sections: {
    overallPlatformHealth: {
      field: "overallPlatformHealth",
      requires: ["value", "explanation", "evidence", "confidence"],
    },
    biggestImprovement: {
      field: "biggestImprovement",
      requires: ["domainId", "explanation", "evidenceIds"],
    },
    biggestRisk: {
      field: "biggestRisk",
      requires: ["domainId", "explanation", "evidenceIds"],
    },
    mostValuableDecision: {
      field: "mostValuableDecision",
      requires: ["decisionId", "explanation"],
    },
    weakestArea: {
      field: "weakestArea",
      requires: ["domainId", "explanation", "evidenceIds"],
    },
    recommendedFocus: {
      field: "recommendedFocus",
      requires: ["statement", "linkedDomainIds", "reason"],
    },
    reasoning: {
      field: "reasoning",
      requires: ["summary", "linkedMovementIds"],
    },
    evidence: {
      field: "evidence",
      requires: ["evidenceIds"],
    },
  },
};
