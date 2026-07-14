/**
 * Phase 34A.1 — Deterministic launch stages (no fabricated percentages).
 */

export type LaunchStageId =
  | "validating"
  | "creating-client"
  | "preparing-infrastructure"
  | "applying-package"
  | "creating-experience"
  | "preparing-portal"
  | "configuring-automation"
  | "finalizing";

export type LaunchStageState = "pending" | "active" | "complete" | "failed";

export type LaunchStage = {
  id: LaunchStageId;
  label: string;
  state: LaunchStageState;
};

export const LAUNCH_STAGE_DEFINITIONS: Array<{ id: LaunchStageId; label: string }> = [
  { id: "validating", label: "Validate" },
  { id: "creating-client", label: "Create Client" },
  { id: "preparing-infrastructure", label: "Prepare Infrastructure" },
  { id: "applying-package", label: "Configure Workspace" },
  { id: "creating-experience", label: "Set Experience" },
  { id: "preparing-portal", label: "Prepare Portal" },
  { id: "configuring-automation", label: "Configure Automation" },
  { id: "finalizing", label: "Finalize Launch" },
];

export function buildLaunchStages(input: {
  phase: "idle" | "running" | "success" | "failed";
  activeStageId?: LaunchStageId | null;
  failedStageId?: LaunchStageId | null;
}): LaunchStage[] {
  if (input.phase === "idle") {
    return LAUNCH_STAGE_DEFINITIONS.map((stage) => ({ ...stage, state: "pending" }));
  }
  if (input.phase === "success") {
    return LAUNCH_STAGE_DEFINITIONS.map((stage) => ({ ...stage, state: "complete" }));
  }

  const activeIndex = LAUNCH_STAGE_DEFINITIONS.findIndex(
    (stage) => stage.id === (input.failedStageId || input.activeStageId),
  );

  return LAUNCH_STAGE_DEFINITIONS.map((stage, index) => {
    if (input.phase === "failed" && stage.id === input.failedStageId) {
      return { ...stage, state: "failed" as const };
    }
    if (input.phase === "failed" && index < activeIndex) {
      return { ...stage, state: "complete" as const };
    }
    if (input.phase === "running" && stage.id === input.activeStageId) {
      return { ...stage, state: "active" as const };
    }
    if (input.phase === "running" && index < activeIndex) {
      return { ...stage, state: "complete" as const };
    }
    return { ...stage, state: "pending" as const };
  });
}

/** Client-side pacing through deterministic stages while awaiting server result. */
export function nextOptimisticLaunchStage(
  current: LaunchStageId | null,
): LaunchStageId | null {
  if (!current) return "validating";
  const index = LAUNCH_STAGE_DEFINITIONS.findIndex((stage) => stage.id === current);
  return LAUNCH_STAGE_DEFINITIONS[index + 1]?.id ?? "finalizing";
}
