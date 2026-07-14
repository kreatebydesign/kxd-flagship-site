/**
 * Phase 32A.1 / 32A.2 — Executive Client Briefing (dossier).
 * Leadership narrative — not CRM, changelog, or documentation.
 */

import type { ExecutivePlatformOpportunity } from "@/lib/executive-memory";

export type ExecutiveClientSummarySection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type BriefingMetricSource = "live-reporting-facts" | "prepared-report";

export type ExecutiveBriefingMetric = {
  label: string;
  value: string;
  source: BriefingMetricSource;
  /** Human provider / report label */
  sourceLabel: string;
  periodLabel: string | null;
};

export type ExecutiveBriefingResults = {
  live: {
    periodLabel: string | null;
    providerLabels: string[];
    metrics: ExecutiveBriefingMetric[];
    note: string | null;
  };
  prepared: {
    title: string;
    periodLabel: string | null;
    sourceLabel: string;
    outcomes: string[];
    metrics: ExecutiveBriefingMetric[];
    note: string;
  } | null;
};

export type ExecutiveBriefingWorkItem = {
  id: string;
  label: string;
  statement: string;
  owner: "kxd" | "client";
};

/** Narrative chapter — editorial prose built only from verified memory/facts. */
export type ExecutiveBriefingChapter = {
  id: string;
  title: string;
  paragraphs: string[];
};

export type ExecutiveClientSummary = {
  clientId: number | null;
  clientSlug: string;
  clientName: string;
  headline: string;
  overview: string;
  sections: ExecutiveClientSummarySection[];
  nextSteps: string[];
  composedAt: string;
  sources: {
    memoryItemCount: number;
    reportingProviderLabels: string[];
    periodLabel: string | null;
  };
};

/** Full leadership briefing view-model for /portal/partnership */
export type ExecutiveClientBriefing = {
  clientId: number | null;
  clientSlug: string;
  clientName: string;
  available: true;
  opening: {
    eyebrow: string;
    headline: string;
    perspective: string;
  };
  relationshipAtAGlance: {
    phase: string;
    focus: string;
    nextMilestone: string;
    health: string;
  };
  /** Story of the partnership — preferred presentation. */
  chapters: ExecutiveBriefingChapter[];
  built: string[];
  systems: string[];
  marketing: string[];
  currentWork: ExecutiveBriefingWorkItem[];
  awaitingClient: ExecutiveBriefingWorkItem[];
  results: ExecutiveBriefingResults;
  whatComesNext: string[];
  platformOpportunity: ExecutivePlatformOpportunity | null;
  recommendedNextSteps: string[];
  composedAt: string;
};

export type ExecutiveClientBriefingUnavailable = {
  available: false;
  clientSlug: string | null;
  clientName: string | null;
  reason: "no-memory" | "briefing-disabled" | "no-client";
};
