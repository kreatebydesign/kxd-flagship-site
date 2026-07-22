/**
 * Phase 37E — Controlled custom plan construction types.
 * Uses canonical planKey "custom" + planAddOnModules (empty baseline).
 */

import type { CommercialAgreementId } from "./types";
import type { ClientPlanKey, ClientPlanStatus } from "@/lib/client-plans/types";
import type {
  ActivationCapabilityChange,
  ActivationCommercialSnapshot,
  ActivationExcludedAction,
} from "./activation-types";
import { ACTIVATION_EXCLUDED_ACTIONS } from "./activation-types";

export type CustomPlanEligibilityStatus =
  | "eligible"
  | "aligned"
  | "blocked"
  | "use_standard_flow";

export type CustomPlanBlockCode =
  | "no_agreement"
  | "unknown_agreement"
  | "standard_agreement"
  | "not_custom_agreement"
  | "paused_blocked"
  | "invalid_commercial"
  | "inconsistent_state"
  | "unsupported_modules"
  | "invalid_selection"
  | "empty_selection"
  | "dependency_unmet"
  | "stale_preview"
  | "client_not_found"
  | "confirmation_required"
  | "removal_acknowledgment_required"
  | "unapproved_fields";

export type CustomSelectableModule = {
  key: string;
  label: string;
  category: string;
  description: string;
  currentlyIncluded: boolean;
};

export type CustomModuleBucket = {
  key: string;
  label: string;
};

export type CustomPlanPreview = {
  clientId: number;
  clientName: string;
  eligibility: CustomPlanEligibilityStatus;
  canApply: boolean;
  alreadyAligned: boolean;
  hasRemovals: boolean;
  operation: "activate" | "revise" | null;
  blockers: Array<{ code: CustomPlanBlockCode; message: string }>;
  warnings: string[];
  agreementId: CommercialAgreementId | null;
  agreementName: string | null;
  currentPlanKey: ClientPlanKey | null;
  currentPlanStatus: ClientPlanStatus | null;
  proposedPlanKey: "custom" | null;
  proposedPlanStatus: ClientPlanStatus | null;
  commercial: ActivationCommercialSnapshot;
  selectableModules: CustomSelectableModule[];
  currentEffectiveModules: CustomModuleBucket[];
  proposedEffectiveModules: CustomModuleBucket[];
  addedModules: CustomModuleBucket[];
  removedModules: CustomModuleBucket[];
  unchangedModules: CustomModuleBucket[];
  unsupportedCurrentModules: CustomModuleBucket[];
  proposedAddOnModules: string[];
  proposedRemovedModules: string[];
  capabilityChanges: ActivationCapabilityChange[];
  unchangedSystems: ActivationExcludedAction[];
  moduleDataNote: string;
  accessNote: string;
  previewFingerprint: string;
  generatedAt: string;
};

export type CustomPlanResultStatus =
  | "activated"
  | "changed"
  | "aligned"
  | "blocked"
  | "stale";

export type CustomPlanResult = {
  status: CustomPlanResultStatus;
  message: string;
  clientId: number;
  agreementId: CommercialAgreementId | null;
  previousPlanKey: ClientPlanKey | null;
  previousPlanStatus: ClientPlanStatus | null;
  newPlanKey: ClientPlanKey | null;
  newPlanStatus: ClientPlanStatus | null;
  addedModules: string[];
  removedModules: string[];
  capabilityChanges: ActivationCapabilityChange[];
  preview?: CustomPlanPreview;
};

export const CUSTOM_PLAN_EXCLUDED_ACTIONS = ACTIVATION_EXCLUDED_ACTIONS;

export const CUSTOM_PLAN_MODULE_DATA_NOTE =
  "This operation changes access configuration only. Stored client records owned by modules are not deleted.";

export const CUSTOM_PLAN_ACCESS_NOTE =
  "Selected modules grant entitlement access only. Providers, infrastructure, reporting connections, and billing are not configured by this change.";
