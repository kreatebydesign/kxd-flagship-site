/**
 * Staff guidance — reuses Operations Intelligence Mentor patterns.
 * Deterministic first; AI only when interpretation adds value (provider slot).
 * Never invents work, priority, facts, or permissions. No AI on page load.
 */

import type { StaffActor, StaffGuidancePrompt, StaffTodayData } from "./types";

export const STAFF_GUIDANCE_PROMPTS: StaffGuidancePrompt[] = [
  { id: "why-first", label: "Explain why this is first", prompt: "Explain why this is first" },
  { id: "walkthrough", label: "Walk me through it", prompt: "Walk me through this" },
  { id: "context", label: "Summarize the client context", prompt: "Summarize this client context" },
  { id: "draft", label: "Prepare a safe starting draft", prompt: "Prepare the first draft" },
  { id: "missing", label: "Check what is missing", prompt: "What information is missing?" },
  { id: "check", label: "Review my work", prompt: "Check my work" },
  {
    id: "prepare-matt",
    label: "Help me prepare this for Matt",
    prompt: "Help me prepare this for Matt",
  },
  { id: "why-wait", label: "Explain why I must wait", prompt: "Why must I wait?" },
  { id: "next", label: "What should I do after this?", prompt: "What should I do next?" },
  { id: "wrap-up", label: "Help me wrap up today", prompt: "Help me wrap up today" },
  { id: "matt", label: "Should I ask Matt?", prompt: "Should I continue or ask Matt?" },
  { id: "explain", label: "Explain this page", prompt: "Explain this page" },
];

export type StaffGuidanceRequest = {
  promptId: string;
  pagePath: string;
  workId?: number | null;
  note?: string | null;
};

export type StaffGuidanceResponse = {
  conciseAnswer: string;
  recommendedNextStep: string;
  reason: string;
  involveMatt: boolean;
  mattReason: string | null;
  mode: "deterministic";
  aiGenerated: false;
  evidence: string[];
  warning: string | null;
};

const SAFE_ASSISTED = [
  "Summarize assigned work",
  "Organize the daily sequence",
  "Explain workflow status",
  "Draft internal notes for review",
  "Draft client communications for Matt's approval",
  "Identify missing client information",
  "Prepare invoice verification summaries",
  "Prepare onboarding checklists",
  "Suggest scheduling options",
  "Check a draft against KXD standards",
  "Prepare an approval packet for Matt",
  "Recommend continue, wait, or escalate",
  "Help wrap up the day from real activity",
] as const;

const NEVER_INDEPENDENT = [
  "Send external messages",
  "Approve upgrades",
  "Grant access or entitlements",
  "Finalize pricing, scope, proposals, or agreements",
  "Charge, refund, invoice, or pay money",
  "Publish public content",
  "Schedule restricted or external meetings",
  "Delete material data",
  "Change roles or permissions",
  "Modify integrations or production configuration",
  "Mark work complete without intentional confirmation",
  "Invent priority or fabricate tasks",
] as const;

export function listSafeAssistedActions(): readonly string[] {
  return SAFE_ASSISTED;
}

export function listRestrictedActions(): readonly string[] {
  return NEVER_INDEPENDENT;
}

export function buildDeterministicStaffGuidance(input: {
  actor: StaffActor;
  request: StaffGuidanceRequest;
  today?: Pick<
    StaffTodayData,
    "primaryAction" | "todaySummary" | "plan" | "waitingOnMatt" | "morning"
  > | null;
}): StaffGuidanceResponse {
  const { actor, request, today } = input;
  const id = request.promptId;
  const start = today?.primaryAction;

  if (id === "why-first" || id === "explain" || id === "next") {
    return {
      conciseAnswer: today
        ? `${today.todaySummary} Your Start Here is: ${start?.title ?? start?.label}. ${start?.reason ?? ""}`
        : "Open your staff home. KXD Intelligence will show one clear next step from real assignments.",
      recommendedNextStep: start?.label ?? "Return to staff home",
      reason:
        "Deterministic plan from overdue work, Matt priority, due dates, returned items, planned work, and training — never invented.",
      involveMatt: false,
      mattReason: null,
      mode: "deterministic",
      aiGenerated: false,
      evidence: start?.evidence ?? [],
      warning: null,
    };
  }

  if (id === "why-wait") {
    const waiting = today?.waitingOnMatt?.[0];
    return {
      conciseAnswer: waiting
        ? `"${waiting.title}" is waiting because: ${waiting.decisionNeeded} You already prepared what you can.`
        : "Items wait on Matt when they need approval, judgment, or studio action you are not authorized to finish alone.",
      recommendedNextStep: "Continue ready work. Do not reopen blocked items repeatedly.",
      reason: "Waiting-on-Matt items are separated so you stay productive without spinning.",
      involveMatt: Boolean(waiting?.followUpAppropriate),
      mattReason: waiting?.followUpAppropriate
        ? "A calm follow-up may be appropriate after a full day."
        : null,
      mode: "deterministic",
      aiGenerated: false,
      evidence: waiting ? [waiting.preparedSummary] : [],
      warning: "Do not invent urgency to bypass Matt.",
    };
  }

  if (id === "wrap-up") {
    return {
      conciseAnswer:
        "Open Wrap up today. It lists what you completed, what you prepared for Matt, what is still underway, and blockers — from real Work Engine activity only.",
      recommendedNextStep: "Open end-of-day wrap-up",
      reason: "Wrap-up never auto-completes work or silently changes dates.",
      involveMatt: false,
      mattReason: null,
      mode: "deterministic",
      aiGenerated: false,
      evidence: [
        `Actionable today: ${today?.morning.actionableCount ?? "—"}`,
        `Waiting on Matt: ${today?.morning.waitingOnMattCount ?? "—"}`,
      ],
      warning: null,
    };
  }

  if (id === "approval" || id === "matt" || id === "prepare-matt") {
    return {
      conciseAnswer:
        "Anything that changes money, access, public content, pricing, or client promises returns to Matt. You may prepare drafts and checklists; you may not finalize alone.",
      recommendedNextStep: "Prepare the packet, then submit for Matt's review.",
      reason: "Permission boundary for operations_coordinator authority.",
      involveMatt: true,
      mattReason: "Approval or judgment required before external or sensitive action.",
      mode: "deterministic",
      aiGenerated: false,
      evidence: [`Role: ${actor.staffRole}`, `Page: ${request.pagePath}`],
      warning: "Do not send, publish, charge, or grant access yourself.",
    };
  }

  if (id === "check" || id === "missing") {
    return {
      conciseAnswer:
        "Check that every fact came from KXD records or Matt — not invention. Confirm the checklist items you can honestly mark complete.",
      recommendedNextStep: "Use Check my work on the guided assignment screen.",
      reason: "Output quality depends on evidence, not speed.",
      involveMatt: false,
      mattReason: null,
      mode: "deterministic",
      aiGenerated: false,
      evidence: request.workId ? [`Work #${request.workId}`] : [],
      warning: null,
    };
  }

  if (id === "draft" || id === "example" || id === "walkthrough" || id === "context") {
    return {
      conciseAnswer:
        id === "context"
          ? "Use only client facts already on this assignment and in authorized records. If a fact is missing, say so — do not invent it."
          : "Drafts and walkthroughs are assistance only. Label AI-assisted drafts when used, review every line, and never send without Matt when the action is external or sensitive.",
      recommendedNextStep:
        id === "walkthrough"
          ? "Open guided work mode and follow each step in order."
          : "Write a short draft, then run Check my work.",
      reason: "Safe assisted drafting is allowed; silent sending is not.",
      involveMatt: false,
      mattReason: null,
      mode: "deterministic",
      aiGenerated: false,
      evidence: ["Drafts require intentional human review"],
      warning: "AI drafts must be reviewed before submission.",
    };
  }

  return {
    conciseAnswer:
      "I can explain your daily plan, walk you through work, help you draft for review, and tell you when Matt must approve. I will not invent tasks or take restricted actions.",
    recommendedNextStep: start?.label ?? "Return to your Start here action",
    reason: "Deterministic fallback — available even when AI is offline.",
    involveMatt: false,
    mattReason: null,
    mode: "deterministic",
    aiGenerated: false,
    evidence: [`Capability prompt: ${id}`],
    warning: null,
  };
}
