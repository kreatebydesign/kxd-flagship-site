/**
 * Client Command — presentation stage → MCI field mapping (Primal Phase 1, Build 1).
 * Pure. The reverse of presentation.ts: given a chosen calm stage, returns the
 * exact lifecycle fields to patch on client-inquiries. Never invents new fields.
 */

import type { UpdateClientInquiryLifecycleInput } from "@/lib/managed-client-leads/update-lifecycle";
import type { LeadPresentationStage } from "./types";

export type LeadStageTransitionPatch = Pick<
  UpdateClientInquiryLifecycleInput,
  "operationalStatus" | "disposition" | "qualificationState" | "outcomeState"
>;

/** All stages a Client Command user may choose from the stage control. */
export const SELECTABLE_LEAD_STAGES: readonly LeadPresentationStage[] = [
  "NEW",
  "CONTACTED",
  "FOLLOW_UP",
  "QUALIFIED",
  "WON",
  "LOST",
] as const;

/**
 * Maps a chosen presentation stage to the MCI lifecycle fields that realize it.
 * WON/LOST intentionally do not set outcomeNote/lostReason/wonRevenueCents —
 * those are captured by the dedicated won/lost actions that call this plus
 * their own evidence fields (see LeadLifecycleActions).
 */
export function applyLeadPresentationStage(
  stage: LeadPresentationStage,
): LeadStageTransitionPatch {
  switch (stage) {
    case "NEW":
      return { operationalStatus: "new", disposition: "none" };
    case "CONTACTED":
      return { operationalStatus: "acknowledged", disposition: "contacted" };
    case "FOLLOW_UP":
      return { operationalStatus: "in_progress", disposition: "nurturing" };
    case "QUALIFIED":
      return { qualificationState: "qualified" };
    case "WON":
      return { operationalStatus: "closed", outcomeState: "won" };
    case "LOST":
      return { operationalStatus: "closed", outcomeState: "lost" };
    default:
      return {};
  }
}
