/**
 * Phase 18A — Ritual intelligence view models.
 * Presentation shapes only — no business logic duplication.
 */

import type { BusinessContext } from "@/lib/business-context";
import type { BusinessBrainResult } from "@/lib/business-brain";
import type { ExecutiveNarrativeResult, NarrativeSection, NarrativeTone } from "@/lib/executive-narrative";
import type { PulseResult } from "@/lib/pulse";

export interface RitualIntelligenceBundle {
  narrative: ExecutiveNarrativeResult;
  context: BusinessContext;
  brain: BusinessBrainResult;
  pulse: PulseResult;
}

export interface RitualNarrativeBlock {
  id: string;
  title: string;
  paragraphs: string[];
}

export interface MorningBriefIntelligence {
  tone: NarrativeTone;
  postureLabel: string;
  contextSummary: string;
  sections: RitualNarrativeBlock[];
  readingTexts: string[];
}

export interface FocusAwarenessItem {
  id: string;
  title: string;
  context: string;
}

export interface FocusIntelligence {
  postureLabel: string;
  postureDescription: string;
  domains: FocusAwarenessItem[];
  attentionAreas: FocusAwarenessItem[];
  executionLandscape: string;
}

export interface ReviewPatternItem {
  id: string;
  label: string;
  description: string;
}

export interface WeeklyReviewIntelligence {
  contextSummary: string;
  postureLabel: string;
  meaningfulChanges: string[];
  patterns: ReviewPatternItem[];
  stableAreas: string[];
  movementNarrative: string[];
}

export type { NarrativeSection, NarrativeTone };
