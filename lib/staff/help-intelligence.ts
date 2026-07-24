/**
 * Deterministic (and optional AI-assisted) answers for staff help questions.
 * Never attributed as Matt. Escalates sensitive topics without inventing answers.
 */

import "server-only";

import type { WorkListItem } from "@/lib/work/types";
import type { StaffActor } from "./types";
import {
  answerStaffHelpDeterministic,
  detectStaffEscalationTopic,
  type StaffHelpIntelligenceAnswer,
} from "./help-intelligence-core";

export type {
  StaffHelpConfidence,
  StaffHelpIntelligenceAnswer,
  StaffHelpResponseSource,
} from "./help-intelligence-core";

export { answerStaffHelpDeterministic, detectStaffEscalationTopic };

/**
 * Optional bounded AI rewrite — only when OPENAI_API_KEY is set and the
 * deterministic answer does not already escalate. Never grants permission.
 */
async function maybeAiAssist(
  draft: StaffHelpIntelligenceAnswer,
  input: {
    question: string;
    work: WorkListItem | null;
    pagePath: string;
  },
): Promise<StaffHelpIntelligenceAnswer> {
  if (draft.requiresMatt) return draft;
  if (draft.confidence === "high") return draft;
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return draft;

  const context = [
    `Question: ${input.question.slice(0, 500)}`,
    `Page: ${input.pagePath}`,
    input.work
      ? `Authorized work: ${input.work.title}; status ${input.work.status}; client ${input.work.clientName}`
      : "No work item attached.",
    `Deterministic draft: ${draft.intelligenceResponse}`,
    "Rules: Short, calm, specific. Never invent prices, promises, or facts. Never claim to be Matt. Never grant permission for money, access, publishing, or external send.",
  ].join("\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.KXD_STAFF_HELP_MODEL?.trim() || "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content:
              "You are KXD Intelligence for an operations coordinator. Rewrite the draft into 2-4 short sentences. Start with 'KXD Intelligence:'. Do not invent facts.",
          },
          { role: "user", content: context },
        ],
      }),
    });
    if (!res.ok) return draft;
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text || text.length < 20) return draft;
    if (detectStaffEscalationTopic(text) && !draft.requiresMatt) {
      if (!/matt needs|review queue|must confirm/i.test(text)) {
        return draft;
      }
    }
    const clipped = text.length > 480 ? `${text.slice(0, 479).trimEnd()}…` : text;
    return {
      ...draft,
      intelligenceResponse: clipped.startsWith("KXD Intelligence")
        ? clipped
        : `KXD Intelligence: ${clipped}`,
      responseSource: "ai-assisted",
      confidence: "medium",
    };
  } catch {
    return draft;
  }
}

export async function answerStaffHelpQuestion(input: {
  question: string;
  pagePath: string;
  work?: WorkListItem | null;
  actor: StaffActor;
}): Promise<StaffHelpIntelligenceAnswer> {
  const draft = answerStaffHelpDeterministic({
    question: input.question,
    pagePath: input.pagePath,
    work: input.work ?? null,
    actor: input.actor,
  });
  return maybeAiAssist(draft, {
    question: input.question,
    work: input.work ?? null,
    pagePath: input.pagePath,
  });
}
