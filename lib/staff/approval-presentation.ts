/**
 * Approval / Review / Decision presentation helpers.
 *
 * Schema fields may still say requiresMatt / mattResponse — those are routing
 * identifiers. Product-facing copy uses Review / Approval / Decision language.
 *
 * Assigned approver identity is Edition 1 interim: escalations route to studio
 * founder oversight. A future Approval Policies / Authority Matrix layer should
 * resolve assignee per policy — not hardcode product language around a person.
 */

/** Truthful current assignee for open escalations (founder oversight). */
export const CURRENT_STUDIO_APPROVER_NAME = "Matt Lunger";

const TOPIC_STATE_LABEL: Record<string, string> = {
  pricing: "Pricing approval required",
  "financial execution": "Financial authorization required",
  "client commitments": "Client commitment approval required",
  "external communications or publishing": "Publishing approval required",
  "access or entitlements": "Access approval required",
  HR: "HR review required",
  legal: "Legal review required",
  "scope changes": "Scope-change approval required",
  "destructive actions": "Destructive action authorization required",
  "unsafe instructions": "Decision Required",
};

/** Context-specific approval state when a sensitive topic is classified. */
export function approvalStateLabelForTopic(topic: string | null | undefined): string {
  if (!topic) return "Approval Required";
  return TOPIC_STATE_LABEL[topic] ?? "Approval Required";
}

function topicPhrase(topic: string): string {
  switch (topic) {
    case "pricing":
      return "Pricing";
    case "financial execution":
      return "Financial authorization";
    case "client commitments":
      return "Client commitments";
    case "external communications or publishing":
      return "Publishing or external messaging";
    case "access or entitlements":
      return "Access changes";
    case "HR":
      return "HR decisions";
    case "legal":
      return "Legal questions";
    case "scope changes":
      return "Scope changes";
    case "destructive actions":
      return "Destructive actions";
    case "unsafe instructions":
      return "This request";
    default:
      return "This decision";
  }
}

/**
 * Deterministic escalation reply stored on the help request.
 * One conversational response — UI must not add a second escalation bubble.
 */
export function buildEscalationIntelligenceResponse(topic: string): string {
  const phrase = topicPhrase(topic);
  return `KXD Intelligence: ${phrase} requires an authorized approver. I’ve routed this for approval — prepare context while you wait, and do not invent an answer or act alone.`;
}

export function escalationRecommendedNextStep(): string {
  return "Await approval — do not invent an answer or act alone.";
}

/**
 * Display name for the person currently receiving escalations.
 * Returns null when no truthful assignee can be shown (future multi-approver).
 */
export function resolveAssignedApproverName(input?: {
  requiresApproval?: boolean;
  hasApproverResponse?: boolean;
}): string | null {
  if (!input?.requiresApproval) return null;
  // Edition 1: all open escalations route to founder oversight.
  return CURRENT_STUDIO_APPROVER_NAME;
}

export function assignedApproverLine(name: string | null | undefined): string | null {
  if (!name?.trim()) return null;
  return `Assigned approver: ${name.trim()}`;
}

/**
 * Count chip / aria copy — product language, never a person name.
 * e.g. "1 approval required" / "3 approvals required"
 */
export function approvalRequiredCountLabel(count: number): string {
  const n = Math.max(0, Math.floor(count));
  if (n <= 0) return "";
  return n === 1 ? "1 approval required" : `${n} approvals required`;
}
