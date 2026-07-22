/**
 * Phase 37D — Controlled legacy-to-modern conversion types.
 * Preserves CES access; never silently reduces client-facing modules.
 */

import type { CommercialAgreementId } from "./types";
import type { ClientPlanKey, ClientPlanStatus } from "@/lib/client-plans/types";
import type {
  ActivationCapabilityChange,
  ActivationCommercialSnapshot,
  ActivationExcludedAction,
} from "./activation-types";
import { ACTIVATION_EXCLUDED_ACTIONS } from "./activation-types";

export type LegacyConversionEligibilityStatus =
  | "eligible"
  | "already_converted"
  | "use_plan_change"
  | "use_activation"
  | "blocked";

export type LegacyConversionBlockCode =
  | "no_agreement"
  | "unknown_agreement"
  | "custom_legacy_manual"
  | "not_legacy"
  | "modern_plan_use_plan_change"
  | "paused_blocked"
  | "invalid_commercial"
  | "inconsistent_state"
  | "unsupported_modules"
  | "access_loss"
  | "overrides_manual_review"
  | "stale_preview"
  | "client_not_found"
  | "confirmation_required"
  | "unapproved_fields";

export type LegacyModuleBucket = {
  key: string;
  label: string;
};

export type LegacyConversionPreview = {
  clientId: number;
  clientName: string;
  eligibility: LegacyConversionEligibilityStatus;
  canConvert: boolean;
  alreadyConverted: boolean;
  noAccessLoss: boolean;
  blockers: Array<{ code: LegacyConversionBlockCode; message: string }>;
  warnings: string[];
  agreementId: CommercialAgreementId | null;
  agreementName: string | null;
  currentPlanKey: ClientPlanKey | null;
  currentPlanStatus: ClientPlanStatus | null;
  proposedPlanKey: ClientPlanKey | null;
  proposedPlanLabel: string | null;
  proposedPlanStatus: ClientPlanStatus | null;
  commercial: ActivationCommercialSnapshot;
  currentLegacyModules: LegacyModuleBucket[];
  targetBaselineModules: LegacyModuleBucket[];
  retainedInPlan: LegacyModuleBucket[];
  preservedAsAddOns: LegacyModuleBucket[];
  newlyIncluded: LegacyModuleBucket[];
  unsupportedModules: LegacyModuleBucket[];
  proposedEffectiveModules: LegacyModuleBucket[];
  proposedAddOnModules: string[];
  proposedRemovedModules: string[];
  capabilityChanges: ActivationCapabilityChange[];
  overrideHandling: string;
  unchangedSystems: ActivationExcludedAction[];
  moduleDataNote: string;
  previewFingerprint: string;
  generatedAt: string;
};

export type LegacyConversionResultStatus =
  | "converted"
  | "already_converted"
  | "blocked"
  | "stale";

export type LegacyConversionResult = {
  status: LegacyConversionResultStatus;
  message: string;
  clientId: number;
  agreementId: CommercialAgreementId | null;
  previousPlanKey: ClientPlanKey | null;
  previousPlanStatus: ClientPlanStatus | null;
  newPlanKey: ClientPlanKey | null;
  newPlanStatus: ClientPlanStatus | null;
  preservedAddOnModules: string[];
  newlyIncludedModules: string[];
  capabilityChanges: ActivationCapabilityChange[];
  preview?: LegacyConversionPreview;
};

export const LEGACY_CONVERSION_EXCLUDED_ACTIONS = ACTIVATION_EXCLUDED_ACTIONS;

export const LEGACY_CONVERSION_MODULE_DATA_NOTE =
  "Conversion updates plan assignment and portal module access configuration only. Stored client records owned by modules are not deleted.";

export const LEGACY_CONVERSION_OVERRIDE_HANDLING =
  "Legacy modules outside the modern plan baseline are preserved as plan add-ons. Removal overrides stay empty so current access is not reduced.";
