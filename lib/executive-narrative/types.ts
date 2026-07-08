/**
 * Phase 17D — Executive Narrative Layer
 * Deterministic narrative from Business Brain + Pulse.
 * Explains state — never decides, recommends, automates, or renders UI.
 */

import type { BusinessBrainResult } from "@/lib/business-brain";
import type { PulseResult } from "@/lib/pulse";

export type NarrativeTone = "calm" | "measured" | "attentive" | "pressured" | "urgent";

export interface NarrativeSection {
  id: string;
  title: string;
  paragraphs: string[];
  sentences: string[];
}

export interface ExecutiveNarrativeDigest {
  headline: string;
  fullText: string;
  sentences: string[];
  wordCount: number;
}

export type ExecutiveNarrativeResult = {
  generatedAt: string;
  opening: NarrativeSection;
  businessState: NarrativeSection;
  changes: NarrativeSection;
  attention: NarrativeSection;
  stability: NarrativeSection;
  closing: NarrativeSection;
  overallTone: NarrativeTone;
  digest: ExecutiveNarrativeDigest;
};

export interface ExecutiveNarrativeInput {
  brain: BusinessBrainResult;
  pulse: PulseResult;
}
