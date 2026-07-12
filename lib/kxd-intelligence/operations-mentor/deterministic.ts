import "server-only";

import { MENTOR_ANSWER_MAX_CHARS, MENTOR_STEP_MAX_CHARS, clip } from "./boundaries";
import { getMentorCapability } from "./capabilities";
import { firstRelatedDestination, reviewChecklist } from "./context";
import type {
  ArtifactReviewPlaceholder,
  OperationsGuidanceResponse,
  OperationsMentorContext,
} from "./types";

type Draft = Omit<OperationsGuidanceResponse, "usage">;

function base(
  context: OperationsMentorContext,
  partial: Omit<
    Draft,
    | "capability"
    | "mode"
    | "taskComplexity"
    | "needsClarification"
    | "clarificationPrompt"
    | "checklistCorrection"
    | "artifactReview"
    | "involveMatt"
    | "mattReason"
    | "warning"
    | "relatedHref"
    | "relatedLabel"
  > &
    Partial<
      Pick<
        Draft,
        | "needsClarification"
        | "clarificationPrompt"
        | "checklistCorrection"
        | "artifactReview"
        | "involveMatt"
        | "mattReason"
        | "warning"
        | "relatedHref"
        | "relatedLabel"
        | "mode"
        | "taskComplexity"
      >
    >,
): Draft {
  const cap = getMentorCapability(context.capability);
  const dest = firstRelatedDestination(context);
  return {
    capability: context.capability,
    conciseAnswer: clip(partial.conciseAnswer, MENTOR_ANSWER_MAX_CHARS),
    recommendedNextStep: clip(partial.recommendedNextStep, MENTOR_STEP_MAX_CHARS),
    reason: clip(partial.reason, MENTOR_STEP_MAX_CHARS),
    confidence: partial.confidence,
    involveMatt: partial.involveMatt ?? false,
    mattReason: partial.mattReason ?? null,
    relatedHref: partial.relatedHref ?? dest.href,
    relatedLabel: partial.relatedLabel ?? dest.label,
    checklistCorrection: partial.checklistCorrection ?? null,
    warning: partial.warning ?? null,
    needsClarification: partial.needsClarification ?? false,
    clarificationPrompt: partial.clarificationPrompt ?? null,
    mode: partial.mode ?? "deterministic",
    taskComplexity: partial.taskComplexity ?? cap?.complexity ?? "lookup",
    artifactReview: partial.artifactReview ?? null,
  };
}

function joinShort(items: string[], fallback: string): string {
  if (!items.length) return fallback;
  return items.slice(0, 3).join(" · ");
}

export function explainOperationalConcept(context: OperationsMentorContext): Draft {
  const os = joinShort(context.operationsFrame.osAlreadyDoes, "KXD OS tracks the operational record.");
  const you = joinShort(
    context.operationsFrame.yourResponsibility,
    "You verify and act with care.",
  );
  return base(context, {
    conciseAnswer: `${context.lessonTitle}: ${clip(context.lessonBody || context.lessonSummary, 200)} OS already handles: ${os}. You own: ${you}.`,
    recommendedNextStep:
      context.walkthrough[0]
        ? `Start with “${context.walkthrough[0].title}”.`
        : "Re-read the objective, then open the related workspace.",
    reason: "Guidance comes from this lesson’s operations frame — not invented policy.",
    confidence: "high",
  });
}

export function showExample(context: OperationsMentorContext): Draft {
  const example =
    context.examples[0] ||
    context.operationsFrame.successLooksLike[0] ||
    context.walkthrough[0]?.detail ||
    null;

  if (!example) {
    return base(context, {
      conciseAnswer:
        "This lesson doesn’t list a separate example yet. Use the walkthrough as the concrete pattern.",
      recommendedNextStep: context.walkthrough[0]
        ? `Follow “${context.walkthrough[0].title}” once.`
        : "Ask Matt if you need a live example from a real client.",
      reason: "Examples are limited to approved lesson content.",
      confidence: "medium",
      involveMatt: !context.walkthrough.length,
      mattReason: !context.walkthrough.length
        ? "No approved example is available in this lesson."
        : null,
    });
  }

  return base(context, {
    conciseAnswer: `Example from this lesson: ${example}`,
    recommendedNextStep: "Match that pattern in the related KXD OS surface, then return to the checklist.",
    reason: "Pulled from approved lesson examples or success criteria.",
    confidence: "high",
  });
}

export function walkThroughLesson(context: OperationsMentorContext): Draft {
  const steps = context.walkthrough.slice(0, 3);
  if (!steps.length) {
    return base(context, {
      conciseAnswer: "No guided walkthrough is defined for this lesson yet.",
      recommendedNextStep: "Use the lesson objective and checklist, or ask Matt for a live walkthrough.",
      reason: "Walkthroughs only come from approved curriculum.",
      confidence: "medium",
      involveMatt: true,
      mattReason: "Lesson has no walkthrough steps.",
    });
  }

  const line = steps
    .map((step, i) => `${i + 1}. ${step.title} — ${step.detail}`)
    .join(" ");

  return base(context, {
    conciseAnswer: clip(line, MENTOR_ANSWER_MAX_CHARS),
    recommendedNextStep: steps[0].href
      ? `Open “${steps[0].title}” and complete only that step first.`
      : `Do “${steps[0].title}” before moving on.`,
    reason: "Walkthrough steps are the approved path inside KXD OS.",
    confidence: "high",
    relatedHref: steps[0].href ?? null,
    relatedLabel: steps[0].title,
  });
}

export function reviewLearningProgress(context: OperationsMentorContext): Draft {
  const correction = reviewChecklist(context);
  const artifactReview: ArtifactReviewPlaceholder = {
    kind: "lesson-checklist",
    supportedNow: true,
    summary: "Lesson and checklist review is active. Invoice, proposal, and email review will use this same contract later.",
  };

  if (correction.readyToComplete) {
    return base(context, {
      conciseAnswer: `Checklist looks ready for “${context.lessonTitle}”. ${correction.completedCount} items marked.`,
      recommendedNextStep: "Mark the lesson complete when you can recite the objective in your own words.",
      reason: "Required checklist items are complete in current progress.",
      confidence: "high",
      checklistCorrection: correction,
      artifactReview,
    });
  }

  return base(context, {
    conciseAnswer: `Not ready yet. ${correction.guidance}`,
    recommendedNextStep: `Finish: ${correction.missingLabels[0] ?? "remaining checklist items"}.`,
    reason: "Check my work uses your live checklist state for this lesson.",
    confidence: "high",
    checklistCorrection: correction,
    artifactReview,
    warning: correction.missingLabels.length
      ? "Don’t mark complete until required items are honest."
      : null,
  });
}

export function recoverFromMistake(context: OperationsMentorContext): Draft {
  if (!context.learnerNote) {
    return base(context, {
      conciseAnswer: "Tell me what happened in one sentence — what you clicked, changed, or sent.",
      recommendedNextStep: "Add a short note, then ask again. I won’t change anything automatically.",
      reason: "Mistake recovery needs a concrete description before advising.",
      confidence: "high",
      needsClarification: true,
      clarificationPrompt: "What happened? (e.g. wrong status, wrong client, sent too early)",
      warning: "No destructive correction will run from Intelligence.",
      taskComplexity: "judgment",
    });
  }

  const likely =
    context.commonMistakes.find((m) =>
      context.learnerNote!.toLowerCase().includes(m.toLowerCase().slice(0, 12)),
    ) ||
    context.commonMistakes[0] ||
    "A step may have been skipped or a status may be incomplete.";

  const escalateHints = context.operationsFrame.escalateWhen;
  const involveMatt =
    /sent|client|invoice|money|delete|wrong client/i.test(context.learnerNote) ||
    escalateHints.length > 0 && /client|billing|deadline|risk/i.test(context.learnerNote);

  return base(context, {
    conciseAnswer: `Likely issue: ${likely}. Most Operations Experience mistakes are reversible if nothing left the studio.`,
    recommendedNextStep: involveMatt
      ? "Stop further client-facing action and notify Matt with what changed."
      : "Correct the checklist or Work status honestly, then re-run Check my work.",
    reason: "Recovery advice stays inside this lesson’s common mistakes and escalation frame.",
    confidence: "medium",
    involveMatt,
    mattReason: involveMatt
      ? "Client-facing or financial risk may be present — confirm with Matt."
      : null,
    warning: "Intelligence will not undo or delete records for you.",
    taskComplexity: "judgment",
  });
}

export function reviewBeforeSending(context: OperationsMentorContext): Draft {
  const practices = joinShort(
    context.bestPractices.length ? context.bestPractices : context.operationsFrame.yourResponsibility,
    "Verify facts in KXD OS before sending.",
  );

  return base(context, {
    conciseAnswer: `Before sending: ${practices} Never invent timing, pricing, or commitments.`,
    recommendedNextStep:
      "Compare your draft to the lesson success criteria, then ask Matt if anything feels like a promise.",
    reason: "Pre-send review uses approved best practices for this lesson.",
    confidence: "high",
    warning: "If the message includes pricing, dates, or scope, escalate to Matt.",
    involveMatt: /billing|invoice|price|deadline|commit/i.test(context.learnerNote ?? ""),
    mattReason: /billing|invoice|price|deadline|commit/i.test(context.learnerNote ?? "")
      ? "Sending may imply a commitment — confirm with Matt."
      : null,
    artifactReview: {
      kind: "client-communication",
      supportedNow: false,
      summary: "Full communication review arrives when Communications workspace plugs into this contract.",
    },
    taskComplexity: "review",
  });
}

export function recommendLearningNextStep(context: OperationsMentorContext): Draft {
  const correction = reviewChecklist(context);
  if (!correction.readyToComplete) {
    return base(context, {
      conciseAnswer: `Next: complete “${correction.missingLabels[0]}”.`,
      recommendedNextStep: correction.missingLabels[0]
        ? `Mark “${correction.missingLabels[0]}” only when it’s true.`
        : "Finish remaining checklist items.",
      reason: "Incomplete required checklist blocks lesson completion.",
      confidence: "high",
      checklistCorrection: correction,
    });
  }

  const step = context.walkthrough.find((row) => row.href) ?? context.walkthrough[0];
  if (step) {
    return base(context, {
      conciseAnswer: `Checklist is clear. Next learning move: ${step.title}.`,
      recommendedNextStep: step.detail,
      reason: "Next step follows the approved walkthrough after checklist readiness.",
      confidence: "high",
      relatedHref: step.href ?? null,
      relatedLabel: step.title,
    });
  }

  return base(context, {
    conciseAnswer: "Lesson checklist is complete. Return to the path and open the next lesson.",
    recommendedNextStep: "Open Operations Experience paths and continue the sequence.",
    reason: "No further walkthrough steps remain on this lesson.",
    confidence: "medium",
    relatedHref: "/admin/training",
    relatedLabel: "Operations Experience",
  });
}

export function mattStyleGuidance(context: OperationsMentorContext): Draft {
  const escalate = joinShort(
    context.operationsFrame.escalateWhen,
    "Escalate when authority or relationship risk appears.",
  );
  const success = joinShort(
    context.operationsFrame.successLooksLike,
    "Leave the system truthful.",
  );

  return base(context, {
    conciseAnswer: `Matt’s pattern here: keep the OS truthful, verify before you speak, and escalate early — ${escalate} Success looks like: ${success}.`,
    recommendedNextStep: "Do the smallest honest next step in the walkthrough; don’t improvise policy.",
    reason: "Founder style is derived from this lesson’s escalate/success framing — not invented voice.",
    confidence: "medium",
    taskComplexity: "judgment",
  });
}

export function buildDeterministicGuidance(context: OperationsMentorContext): Draft {
  switch (context.capability) {
    case "explain":
      return explainOperationalConcept(context);
    case "show-me":
      return showExample(context);
    case "walkthrough":
      return walkThroughLesson(context);
    case "check-work":
      return reviewLearningProgress(context);
    case "mistake":
      return recoverFromMistake(context);
    case "before-send":
      return reviewBeforeSending(context);
    case "next":
      return recommendLearningNextStep(context);
    case "matt-style":
      return mattStyleGuidance(context);
    default:
      return base(context, {
        conciseAnswer: "That mentor action isn’t available yet.",
        recommendedNextStep: "Choose one of the listed KXD Intelligence actions.",
        reason: "Unknown capability.",
        confidence: "high",
      });
  }
}
