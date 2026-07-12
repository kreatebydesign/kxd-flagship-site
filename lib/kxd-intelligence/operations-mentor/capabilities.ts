/**
 * Mentor actions — single source of labels for UI + services.
 */

export const MENTOR_CAPABILITIES = [
  {
    id: "explain",
    label: "Explain this differently",
    description: "Clarify the lesson in plain language.",
    complexity: "lookup" as const,
  },
  {
    id: "show-me",
    label: "Show me an example",
    description: "Point to a concrete example from the lesson.",
    complexity: "lookup" as const,
  },
  {
    id: "walkthrough",
    label: "Walk me through this",
    description: "Guide the next calm step in KXD OS.",
    complexity: "lookup" as const,
  },
  {
    id: "check-work",
    label: "Check my work",
    description: "Review checklist and lesson readiness.",
    complexity: "review" as const,
  },
  {
    id: "mistake",
    label: "I think I made a mistake",
    description: "Recover calmly without destructive automation.",
    complexity: "judgment" as const,
  },
  {
    id: "before-send",
    label: "Review before sending",
    description: "Pause before client or internal communication.",
    complexity: "review" as const,
  },
  {
    id: "next",
    label: "What should I do next?",
    description: "Recommend the next learning or OS step.",
    complexity: "lookup" as const,
  },
  {
    id: "matt-style",
    label: "How would Matt normally handle this?",
    description: "Founder judgment pattern from approved lesson framing.",
    complexity: "judgment" as const,
  },
] as const;

export type MentorCapabilityId = (typeof MENTOR_CAPABILITIES)[number]["id"];

export function getMentorCapability(id: string) {
  return MENTOR_CAPABILITIES.find((row) => row.id === id) ?? null;
}

export function isMentorCapabilityId(id: string): id is MentorCapabilityId {
  return MENTOR_CAPABILITIES.some((row) => row.id === id);
}
