/**
 * Knowledge boundaries — never invent policy.
 */

const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; topic: string }> = [
  { pattern: /\b(pric(e|ing)|quote|discount|retainer amount|hourly rate)\b/i, topic: "pricing" },
  { pattern: /\b(billing terms?|payment terms?|net\s*\d+|refund)\b/i, topic: "billing terms" },
  { pattern: /\b(contract|legal|liability|nda|indemnit)/i, topic: "legal" },
  { pattern: /\b(fire|hire|salary|payroll|hr decision|terminate)\b/i, topic: "HR" },
  { pattern: /\b(password|permission|admin access|security clearance|vpn)\b/i, topic: "security permissions" },
  { pattern: /\b(commit(ment)? to the client|promise the client|guarantee delivery)\b/i, topic: "client commitments" },
];

export function detectUnsupportedTopic(note: string | null | undefined): string | null {
  const text = note?.trim() ?? "";
  if (!text) return null;
  for (const row of FORBIDDEN_PATTERNS) {
    if (row.pattern.test(text)) return row.topic;
  }
  return null;
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
