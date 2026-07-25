/**
 * Knowledge boundaries — never invent policy.
 * Sensitive detection is centralized in Shared Core staff classifier.
 */

import { detectSensitiveTopic } from "@/lib/staff/sensitive-topics";

export function detectUnsupportedTopic(note: string | null | undefined): string | null {
  return detectSensitiveTopic(note);
}

export function unsupportedTopicResponse(topic: string): {
  conciseAnswer: string;
  recommendedNextStep: string;
  reason: string;
  involveMatt: true;
  mattReason: string;
  warning: string;
  confidence: "high";
} {
  return {
    conciseAnswer: `I can’t confirm ${topic} from approved Operations Experience knowledge.`,
    recommendedNextStep: "Ask Matt before acting on this.",
    reason: "This topic requires founder confirmation — guessing would be unsafe.",
    involveMatt: true,
    mattReason: `${topic} is outside automatic Operations guidance.`,
    warning: "Do not invent pricing, terms, commitments, legal answers, HR decisions, or permissions.",
    confidence: "high",
  };
}

/** Soft cap — keep mentor responses short. */
export const MENTOR_ANSWER_MAX_CHARS = 420;
export const MENTOR_STEP_MAX_CHARS = 220;

export function clip(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}
