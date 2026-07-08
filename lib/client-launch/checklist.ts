/**
 * Client Launch Readiness — canonical checklist steps.
 * Maps the launch path every client follows inside KXD OS.
 */

import type { ClientLaunchReadiness, LaunchChecklistItem, LaunchChecklistStepId } from "./types";

export interface LaunchChecklistStepDefinition {
  id: LaunchChecklistStepId;
  label: string;
  description: string;
  /** When false, step can remain incomplete without blocking overall "ready". */
  requiredForReady: boolean;
}

export const LAUNCH_CHECKLIST_STEPS: readonly LaunchChecklistStepDefinition[] = [
  {
    id: "client-created",
    label: "Client created",
    description: "Active client record exists in KXD OS.",
    requiredForReady: true,
  },
  {
    id: "workspace-configured",
    label: "Workspace configured",
    description: "Client Experience Profile is active with brand settings.",
    requiredForReady: true,
  },
  {
    id: "modules-enabled",
    label: "Modules enabled",
    description: "At least one CES module is enabled for the client workspace.",
    requiredForReady: true,
  },
  {
    id: "portal-access-created",
    label: "Portal access created",
    description: "At least one active portal user can sign in.",
    requiredForReady: true,
  },
  {
    id: "review-ready",
    label: "Website Review ready",
    description: "Website URL and Website Review module are configured when review is enabled.",
    requiredForReady: true,
  },
  {
    id: "welcome-complete",
    label: "Welcome experience complete",
    description: "All active portal users have completed the first-login welcome flow.",
    requiredForReady: false,
  },
  {
    id: "client-ready",
    label: "Client ready for collaboration",
    description: "All required launch steps are complete — client can collaborate in the portal.",
    requiredForReady: true,
  },
] as const;

function stepComplete(
  stepId: LaunchChecklistStepId,
  readiness: Pick<
    ClientLaunchReadiness,
    | "workspaceReady"
    | "portalReady"
    | "usersReady"
    | "modulesReady"
    | "welcomeReady"
    | "reviewReady"
    | "overallStatus"
  >,
): boolean {
  switch (stepId) {
    case "client-created":
      return readiness.workspaceReady || readiness.portalReady;
    case "workspace-configured":
      return readiness.workspaceReady;
    case "modules-enabled":
      return readiness.modulesReady;
    case "portal-access-created":
      return readiness.usersReady;
    case "review-ready":
      return readiness.reviewReady;
    case "welcome-complete":
      return readiness.welcomeReady;
    case "client-ready":
      return readiness.overallStatus === "ready";
    default:
      return false;
  }
}

export function buildLaunchChecklist(
  readiness: Pick<
    ClientLaunchReadiness,
    | "workspaceReady"
    | "portalReady"
    | "usersReady"
    | "modulesReady"
    | "welcomeReady"
    | "reviewReady"
    | "overallStatus"
  >,
): LaunchChecklistItem[] {
  return LAUNCH_CHECKLIST_STEPS.map((step) => ({
    id: step.id,
    label: step.label,
    description: step.description,
    requiredForReady: step.requiredForReady,
    complete: stepComplete(step.id, readiness),
  }));
}

export function requiredChecklistComplete(checklist: LaunchChecklistItem[]): boolean {
  return checklist
    .filter((item) => item.requiredForReady)
    .every((item) => item.complete);
}
