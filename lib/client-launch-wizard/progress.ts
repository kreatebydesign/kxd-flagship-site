/**
 * Phase 34A.1 — Progress derives from durable draft + validation, not mere visits.
 */

import { LAUNCH_WIZARD_STEPS } from "./constants";
import { errorsOnly, validateStep } from "./validation/steps";
import type {
  LaunchWizardDraftPayload,
  LaunchWizardStepId,
  LaunchWizardValidationIssue,
} from "./types";

export type LaunchStepProgressState =
  | "completed"
  | "current"
  | "upcoming"
  | "blocked"
  | "locked";

export type LaunchStepProgress = {
  id: LaunchWizardStepId;
  label: string;
  short: string;
  state: LaunchStepProgressState;
  issues: LaunchWizardValidationIssue[];
};

const EDITABLE_STEPS: LaunchWizardStepId[] = [
  "identity",
  "package",
  "experience",
  "modules",
  "infrastructure",
  "team",
  "automation",
];

export function isEditableLaunchStep(stepId: LaunchWizardStepId): boolean {
  return EDITABLE_STEPS.includes(stepId);
}

export function buildLaunchStepProgress(input: {
  currentStep: LaunchWizardStepId;
  payload: LaunchWizardDraftPayload;
  uniqueness?: {
    slugTakenByClient?: boolean;
    slugTakenByDraft?: boolean;
    nameTakenByClient?: boolean;
  };
}): LaunchStepProgress[] {
  const currentIndex = LAUNCH_WIZARD_STEPS.findIndex((s) => s.id === input.currentStep);

  return LAUNCH_WIZARD_STEPS.map((step, index) => {
    const issues =
      step.id === "review" || step.id === "launch"
        ? validateStep("review", input.payload, input.uniqueness)
        : isEditableLaunchStep(step.id)
          ? validateStep(step.id, input.payload, input.uniqueness)
          : [];
    const hard = errorsOnly(issues);

    let state: LaunchStepProgressState = "upcoming";
    if (step.id === input.currentStep) {
      state = hard.length > 0 ? "blocked" : "current";
    } else if (index < currentIndex) {
      state = hard.length > 0 ? "blocked" : "completed";
    } else if (
      step.id === "launch" &&
      errorsOnly(validateStep("review", input.payload, input.uniqueness)).length > 0
    ) {
      state = "locked";
    }

    return {
      id: step.id,
      label: step.label,
      short: step.short,
      state,
      issues: hard,
    };
  });
}

/** Step may be opened only if prior required steps have no hard errors. */
export function canNavigateToStep(
  target: LaunchWizardStepId,
  payload: LaunchWizardDraftPayload,
  uniqueness?: {
    slugTakenByClient?: boolean;
    slugTakenByDraft?: boolean;
    nameTakenByClient?: boolean;
  },
): { ok: true } | { ok: false; message: string; blockerStep: LaunchWizardStepId } {
  const targetIndex = LAUNCH_WIZARD_STEPS.findIndex((s) => s.id === target);
  for (let i = 0; i < targetIndex; i += 1) {
    const step = LAUNCH_WIZARD_STEPS[i];
    if (!step || step.id === "review" || step.id === "launch") continue;
    if (!isEditableLaunchStep(step.id)) continue;
    const hard = errorsOnly(validateStep(step.id, payload, uniqueness));
    if (hard.length > 0) {
      return {
        ok: false,
        message: hard[0]?.message ?? `${step.label} needs attention first.`,
        blockerStep: step.id,
      };
    }
  }
  return { ok: true };
}
