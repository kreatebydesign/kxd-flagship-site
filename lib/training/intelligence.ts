/**
 * KXD Intelligence — mentor entry for Operations Experience UI.
 * Phase 21C: structured guidance via `lib/kxd-intelligence/operations-mentor`.
 */

import {
  MENTOR_CAPABILITIES,
  type MentorCapabilityId,
} from "@/lib/kxd-intelligence/operations-mentor/capabilities";
import type { TrainingIntelligencePrompt, TrainingLessonDefinition } from "./types";

export const KXD_INTELLIGENCE_CAPABILITIES = MENTOR_CAPABILITIES.map((row) => ({
  id: row.id,
  label: row.label,
  description: row.description,
}));

export type KxdIntelligenceCapabilityId = MentorCapabilityId;

export interface KxdIntelligenceContext {
  surface: string;
  pathSlug?: string | null;
  lessonSlug?: string | null;
  clientId?: number | null;
  workId?: number | null;
  href?: string | null;
  learnerKey?: string | null;
}

export interface KxdIntelligenceAssistRequest {
  capability: KxdIntelligenceCapabilityId;
  context: KxdIntelligenceContext;
  note?: string | null;
  checklistCompletedIds?: string[];
  clientRequestKey?: string | null;
}

/**
 * @deprecated Prefer requestOperationsGuidance via /api/admin/training/intelligence.
 * Kept as a thin pointer so older imports resolve to the permanent mentor.
 */
export async function requestKxdIntelligenceAssist(
  input: KxdIntelligenceAssistRequest,
): Promise<{
  available: true;
  intelligenceLayer: "kxd-intelligence";
  capability: KxdIntelligenceCapabilityId;
  message: string;
}> {
  return {
    available: true,
    intelligenceLayer: "kxd-intelligence",
    capability: input.capability,
    message:
      "Use POST /api/admin/training/intelligence with capability + lesson context. No guidance runs on page load.",
  };
}

export function defaultIntelligencePromptsForLesson(
  lesson: TrainingLessonDefinition,
): TrainingIntelligencePrompt[] {
  if (lesson.content.intelligencePrompts.length > 0) {
    return lesson.content.intelligencePrompts.map((prompt) => {
      const cap = MENTOR_CAPABILITIES.find((row) => row.id === prompt.id);
      return {
        id: prompt.id,
        label: cap?.label ?? prompt.label,
        prompt: prompt.prompt,
      };
    });
  }
  return MENTOR_CAPABILITIES.map((row) => ({
    id: row.id,
    label: row.label,
    prompt: `${row.label} for “${lesson.title}”.`,
  }));
}
