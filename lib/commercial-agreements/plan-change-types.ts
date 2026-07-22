/**
 * Phase 37C — Controlled modern plan-change types.
 * Upgrades/downgrades are separate from first-time activation and agreement saves.
 */

import type { CommercialAgreementId } from "./types";
import type { PlanChangeClassification } from "@/lib/client-plans/catalog";
import type { ClientPlanKey, ClientPlanStatus } from "@/lib/client-plans/types";
import type {
  ActivationCapabilityChange,
  ActivationCommercialSnapshot,
  ActivationExcludedAction,
  ActivationPlanSnapshot,
} from "./activation-types";
import { ACTIVATION_EXCLUDED_ACTIONS } from "./activation-types";

export type PlanChangeEligibilityStatus =
  | "eligible"
  | "aligned"
  | "blocked"
  | "use_activation";

export type PlanChangeBlockCode =
  | "no_agreement"
  | "unknown_agreement"
  | "custom_legacy_manual"
  | "no_plan_use_activation"
  | "legacy_blocked"
  | "paused_blocked"
  | "custom_plan_blocked"
  | "invalid_commercial"
  | "inconsistent_state"
  | "overrides_manual_review"
  | "stale_preview"
  | "client_not_found"
  | "confirmation_required"
  | "removal_acknowledgment_required"
  | "unapproved_fields";

export type PlanChangePreview = {
  clientId: number;
  clientName: string;
  eligibility: PlanChangeEligibilityStatus;
  canChange: boolean;
  alreadyAligned: boolean;
  classification: PlanChangeClassification | "blocked" | null;
  classificationLabel: string | null;
  blockers: Array<{ code: PlanChangeBlockCode; message: string }>;
  warnings: string[];
  agreementId: CommercialAgreementId | null;
  agreementName: string | null;
  currentPlanKey: ClientPlanKey | null;
  currentPlanLabel: string | null;
  currentPlanStatus: ClientPlanStatus | null;
  proposedPlanKey: ClientPlanKey | null;
  proposedPlanLabel: string | null;
  proposedPlanStatus: ClientPlanStatus | null;
  commercial: ActivationCommercialSnapshot;
  current: ActivationPlanSnapshot;
  proposed: ActivationPlanSnapshot;
  capabilityChanges: ActivationCapabilityChange[];
  hasRemovals: boolean;
  overrideHandling: string;
  unchangedSystems: ActivationExcludedAction[];
  moduleDataNote: string;
  previewFingerprint: string;
  generatedAt: string;
};

export type PlanChangeResultStatus =
  | "changed"
  | "aligned"
  | "blocked"
  | "stale";

export type PlanChangeResult = {
  status: PlanChangeResultStatus;
  message: string;
  clientId: number;
  agreementId: CommercialAgreementId | null;
  classification: PlanChangeClassification | "blocked" | null;
  previousPlanKey: ClientPlanKey | null;
  previousPlanStatus: ClientPlanStatus | null;
  newPlanKey: ClientPlanKey | null;
  newPlanStatus: ClientPlanStatus | null;
  capabilityChanges: ActivationCapabilityChange[];
  preview?: PlanChangePreview;
};

/** Same excluded systems as activation — plan change does not expand the surface. */
export const PLAN_CHANGE_EXCLUDED_ACTIONS = ACTIVATION_EXCLUDED_ACTIONS;

export const PLAN_CHANGE_MODULE_DATA_NOTE =
  "Removing a module from the plan disables portal access for that module. Stored client records for that module are not deleted by this plan change.";
