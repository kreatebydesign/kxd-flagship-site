import { getLaunchPackagePreset } from "../packages/presets";
import type {
  LaunchWizardDraftPayload,
  LaunchWizardStepId,
  LaunchWizardValidationIssue,
} from "../types";
import { validateAutomationStep } from "./automation";
import { validateIdentityStep } from "./identity";
import { validateModulesStep } from "./modules";
import { validateTeamStep } from "./team";

export function validatePackageStep(
  payload: LaunchWizardDraftPayload,
): LaunchWizardValidationIssue[] {
  if (!getLaunchPackagePreset(payload.package.packageId)) {
    return [
      {
        stepId: "package",
        field: "packageId",
        code: "package.unknown",
        message: "Select a valid package preset.",
        level: "error",
      },
    ];
  }
  return [];
}

export function validateExperienceStep(
  payload: LaunchWizardDraftPayload,
): LaunchWizardValidationIssue[] {
  const choice = payload.experience.choiceId.trim();
  if (!choice) {
    return [
      {
        stepId: "experience",
        field: "choiceId",
        code: "experience.required",
        message: "Select an experience path (Default, Custom, or a profile).",
        level: "error",
      },
    ];
  }
  return [];
}

export function validateInfrastructureStep(
  payload: LaunchWizardDraftPayload,
): LaunchWizardValidationIssue[] {
  const issues: LaunchWizardValidationIssue[] = [];
  const infra = payload.infrastructure;
  const intentions = [
    infra.searchConsoleIntention,
    infra.ga4Intention,
    infra.googleAdsIntention,
  ];
  for (const intention of intentions) {
    if (intention === "connected") {
      issues.push({
        stepId: "infrastructure",
        code: "infrastructure.connected.claim",
        message:
          "Integrations cannot be marked Connected during launch — they must be authorized after launch.",
        level: "error",
      });
      break;
    }
  }
  return issues;
}

export type LaunchValidationContext = {
  slugTakenByClient?: boolean;
  slugTakenByDraft?: boolean;
  nameTakenByClient?: boolean;
  existingPortalEmails?: readonly string[];
};

export function validateStep(
  stepId: LaunchWizardStepId,
  payload: LaunchWizardDraftPayload,
  context?: LaunchValidationContext,
): LaunchWizardValidationIssue[] {
  switch (stepId) {
    case "identity":
      return validateIdentityStep(payload.identity, context);
    case "package":
      return validatePackageStep(payload);
    case "experience":
      return validateExperienceStep(payload);
    case "modules":
      return validateModulesStep(payload.package.packageId, payload.modules);
    case "infrastructure":
      return validateInfrastructureStep(payload);
    case "team":
      return validateTeamStep(payload.team, {
        existingPortalEmails: context?.existingPortalEmails,
      });
    case "automation":
      return validateAutomationStep(payload.automation);
    case "review":
    case "launch":
      return validateLaunchReadiness(payload, context);
    default:
      return [];
  }
}

export function validateLaunchReadiness(
  payload: LaunchWizardDraftPayload,
  context?: LaunchValidationContext,
): LaunchWizardValidationIssue[] {
  return [
    ...validateIdentityStep(payload.identity, context),
    ...validatePackageStep(payload),
    ...validateExperienceStep(payload),
    ...validateModulesStep(payload.package.packageId, payload.modules),
    ...validateInfrastructureStep(payload),
    ...validateTeamStep(payload.team, {
      existingPortalEmails: context?.existingPortalEmails,
    }),
    ...validateAutomationStep(payload.automation),
  ];
}

export function errorsOnly(
  issues: readonly LaunchWizardValidationIssue[],
): LaunchWizardValidationIssue[] {
  return issues.filter((issue) => issue.level === "error");
}
