/**
 * Pure deterministic staff-help answers + escalation.
 * Kept free of server-only so verify scripts can import safely.
 */

import {
  buildEscalationIntelligenceResponse,
  escalationRecommendedNextStep,
} from "@/lib/staff/approval-presentation";
import { detectSensitiveTopic } from "@/lib/staff/sensitive-topics";
import type { WorkListItem } from "@/lib/work/types";
import type { StaffActor } from "./types";

export type StaffHelpResponseSource =
  | "deterministic"
  | "ai-assisted"
  | "none";

export type StaffHelpConfidence = "high" | "medium" | "low";

export interface StaffHelpIntelligenceAnswer {
  intelligenceResponse: string;
  responseSource: StaffHelpResponseSource;
  confidence: StaffHelpConfidence;
  requiresMatt: boolean;
  recommendedNextStep: string;
}

/** Sensitive / authority topics — centralized in sensitive-topics.ts */
export function detectStaffEscalationTopic(question: string): string | null {
  return detectSensitiveTopic(question);
}

function workContextLine(work: WorkListItem | null | undefined): string {
  if (!work) return "";
  const bits = [
    `Work: ${work.title}`,
    `Status: ${work.status}`,
    work.clientName && work.clientName !== "Internal"
      ? `Client: ${work.clientName}`
      : "Internal studio work",
    work.dueDate ? `Due ${work.dueDate.slice(0, 10)}` : null,
  ].filter(Boolean);
  return bits.join(". ") + ".";
}

/** Deterministic answer — no AI, no network. */
export function answerStaffHelpDeterministic(input: {
  question: string;
  pagePath: string;
  work: WorkListItem | null;
  actor: StaffActor;
}): StaffHelpIntelligenceAnswer {
  const q = input.question.trim();
  const lower = q.toLowerCase();
  const workLine = workContextLine(input.work);

  const escalation = detectStaffEscalationTopic(q);
  if (escalation) {
    return {
      intelligenceResponse: buildEscalationIntelligenceResponse(escalation),
      responseSource: "deterministic",
      confidence: "high",
      requiresMatt: true,
      recommendedNextStep: escalationRecommendedNextStep(),
    };
  }

  if (/what should i do next|where do i start|start here/i.test(lower)) {
    return {
      intelligenceResponse: workLine
        ? `KXD Intelligence: Here’s how to move forward. ${workLine} Open the guided work checklist, confirm every fact from KXD records, then take the next safe step shown there.`
        : "KXD Intelligence: Here’s how to move forward. Return to your Daily Staff Plan and use Start Here. Complete one item before opening another.",
      responseSource: "deterministic",
      confidence: "high",
      requiresMatt: false,
      recommendedNextStep: "Open Start Here or the guided work checklist.",
    };
  }

  if (/missing|what information|what do i need/i.test(lower)) {
    return {
      intelligenceResponse:
        "KXD Intelligence: Confirm client name, requested change, due date, and any notes Matt already left. If a fact is not in KXD records, write that it is missing — do not invent it.",
      responseSource: "deterministic",
      confidence: "high",
      requiresMatt: false,
      recommendedNextStep: "List missing facts, then continue preparation.",
    };
  }

  if (/status mean|what does .* status|waiting on|blocked|review mean/i.test(lower)) {
    return {
      intelligenceResponse:
        "KXD Intelligence: Review means an authorized approver must decide before it finishes. Awaiting Approval means the studio side is blocked on that decision or another internal step. Blocked means something must clear before you continue — document it, then move to ready work.",
      responseSource: "deterministic",
      confidence: "high",
      requiresMatt: false,
      recommendedNextStep: "Leave waiting items alone and continue ready work.",
    };
  }

  if (/prepare .* matt|for matt|approval|submit for review/i.test(lower)) {
    return {
      intelligenceResponse:
        "KXD Intelligence: Prepare a short facts-only packet: what was requested, what you verified, what is still missing, and the draft. Submit for Approval. Do not send, publish, charge, or promise anything to the client.",
      responseSource: "deterministic",
      confidence: "high",
      requiresMatt: false,
      recommendedNextStep: "Use Prepare for Review on the guided work screen.",
    };
  }

  if (/why .* approv|require approval|must matt/i.test(lower)) {
    return {
      intelligenceResponse:
        "KXD Intelligence: Anything that changes money, access, public content, pricing, or client promises requires approval. You may prepare; you may not finalize alone.",
      responseSource: "deterministic",
      confidence: "high",
      requiresMatt: false,
      recommendedNextStep: "Prepare the packet, then submit for approval.",
    };
  }

  if (/where (should|do) i find|where is|how do i find/i.test(lower)) {
    return {
      intelligenceResponse: input.work
        ? `KXD Intelligence: Start on this assignment’s guided work screen and the summary already on file. ${workLine} Use training if the procedure is unfamiliar.`
        : "KXD Intelligence: Use your Daily Staff Plan for assigned work, Training for procedures, and Request a Decision only when you are blocked on judgment or authority.",
      responseSource: "deterministic",
      confidence: "medium",
      requiresMatt: false,
      recommendedNextStep: "Open the related staff screen and check existing records first.",
    };
  }

  if (/can i proceed|am i allowed|may i /i.test(lower)) {
    return {
      intelligenceResponse:
        "KXD Intelligence: You may proceed inside your checklist and permission boundary. If the action sends externally, changes money, access, or public content — stop and prepare it for review instead.",
      responseSource: "deterministic",
      confidence: "high",
      requiresMatt: false,
      recommendedNextStep: "Follow the guided checklist; escalate sensitive outcomes.",
    };
  }

  if (/draft|structure|internal note|how should i write/i.test(lower)) {
    return {
      intelligenceResponse:
        "KXD Intelligence: Structure the internal draft as: (1) request, (2) verified facts, (3) open questions, (4) proposed next step. Label anything AI-assisted. Keep it internal until an authorized approver approves external send.",
      responseSource: "deterministic",
      confidence: "high",
      requiresMatt: false,
      recommendedNextStep: "Write the short draft, then Check my work.",
    };
  }

  if (/procedure|training|how do i complete|how do i do this step/i.test(lower)) {
    return {
      intelligenceResponse:
        "KXD Intelligence: Open the related Training lesson when you need the procedure, then return to guided work. Complete the checklist in order. If the lesson and the assignment conflict, request a decision.",
      responseSource: "deterministic",
      confidence: "medium",
      requiresMatt: false,
      recommendedNextStep: "Open Training, then resume the assignment checklist.",
    };
  }

  return {
    intelligenceResponse: workLine
      ? `KXD Intelligence: Here’s how to move forward. ${workLine} Read the request, verify facts already in KXD, prepare the next draft or update inside your authority, and request a decision only when approval or judgment is required.`
      : "KXD Intelligence: Here’s how to move forward. Use your Daily Staff Plan Start Here action. Work from verified records only. Request a Decision when the next step needs approval or judgment.",
    responseSource: "deterministic",
    confidence: "medium",
    requiresMatt: false,
    recommendedNextStep: "Take the next checklist step, or request a decision if still blocked.",
  };
}
