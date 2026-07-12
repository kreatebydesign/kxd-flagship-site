import "server-only";

import { detectUnsupportedTopic, unsupportedTopicResponse } from "./boundaries";
import { getMentorCapability } from "./capabilities";
import type { OperationsGuidanceResponse, OperationsMentorContext } from "./types";

type Draft = Omit<OperationsGuidanceResponse, "usage">;

/**
 * Assess whether Matt must be involved before the learner acts.
 */
export function assessEscalationNeed(context: OperationsMentorContext): {
  involveMatt: boolean;
  mattReason: string | null;
  warning: string | null;
  unsupportedTopic: string | null;
} {
  const unsupported = detectUnsupportedTopic(context.learnerNote);
  if (unsupported) {
    const u = unsupportedTopicResponse(unsupported);
    return {
      involveMatt: true,
      mattReason: u.mattReason,
      warning: u.warning,
      unsupportedTopic: unsupported,
    };
  }

  const escalateHints = context.operationsFrame.escalateWhen;
  const note = context.learnerNote?.toLowerCase() ?? "";
  const hit = escalateHints.find((hint) => {
    const tokens = hint.toLowerCase().split(/\W+/).filter((t) => t.length > 4);
    return tokens.some((t) => note.includes(t));
  });

  if (hit) {
    return {
      involveMatt: true,
      mattReason: hit,
      warning: "This matches an approved escalation condition for this lesson.",
      unsupportedTopic: null,
    };
  }

  if (context.capability === "before-send" && /send|sent|email|client/i.test(note)) {
    return {
      involveMatt: /price|invoice|commit|deadline|legal/i.test(note),
      mattReason: /price|invoice|commit|deadline|legal/i.test(note)
        ? "Sending may create a commitment — confirm with Matt."
        : null,
      warning: "Pause before anything client-facing leaves the studio.",
      unsupportedTopic: null,
    };
  }

  return {
    involveMatt: false,
    mattReason: null,
    warning: null,
    unsupportedTopic: null,
  };
}

export function applyEscalationToDraft(
  context: OperationsMentorContext,
  draft: Draft,
): Draft {
  const assessment = assessEscalationNeed(context);
  const cap = getMentorCapability(context.capability);

  if (assessment.unsupportedTopic) {
    const u = unsupportedTopicResponse(assessment.unsupportedTopic);
    return {
      ...draft,
      conciseAnswer: u.conciseAnswer,
      recommendedNextStep: u.recommendedNextStep,
      reason: u.reason,
      confidence: u.confidence,
      involveMatt: true,
      mattReason: u.mattReason,
      warning: u.warning,
      taskComplexity: "escalation",
      mode: "deterministic",
    };
  }

  return {
    ...draft,
    involveMatt: draft.involveMatt || assessment.involveMatt,
    mattReason: draft.mattReason || assessment.mattReason,
    warning: draft.warning || assessment.warning,
    taskComplexity: draft.involveMatt || assessment.involveMatt
      ? "escalation"
      : draft.taskComplexity ?? cap?.complexity ?? "lookup",
  };
}
