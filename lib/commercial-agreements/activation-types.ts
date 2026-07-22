/**
 * Phase 37B — Controlled commercial-agreement activation types.
 * Preview and activate are separate from commercial recording.
 */

import type { CommercialAgreementId } from "./types";
import type { ClientPlanKey, ClientPlanStatus } from "@/lib/client-plans/types";

export type ActivationEligibilityStatus =
  | "eligible"
  | "already_active"
  | "blocked";

export type ActivationBlockCode =
  | "no_agreement"
  | "unknown_agreement"
  | "custom_legacy_manual"
  | "plan_change_blocked"
  | "paused_blocked"
  | "invalid_commercial"
  | "inconsistent_state"
  | "stale_preview"
  | "client_not_found"
  | "confirmation_required"
  | "unapproved_fields";

export type ActivationCapabilityChange = {
  key: string;
  label: string;
  kind: "added" | "removed" | "unchanged";
};

export type ActivationExcludedAction = {
  id: string;
  label: string;
};

export type ActivationCommercialSnapshot = {
  commercialAgreementId: CommercialAgreementId | null;
  agreementName: string | null;
  monthlyRetainerAmount: number | null;
  setupFee: number | null;
  monthlyServiceCredits: number | null;
  commercialAddOns: string[];
};

export type ActivationPlanSnapshot = {
  planKey: ClientPlanKey | null;
  planStatus: ClientPlanStatus | null;
  addOnModules: string[];
  removedModules: string[];
  effectiveModules: string[];
};

export type ActivationPreview = {
  clientId: number;
  clientName: string;
  eligibility: ActivationEligibilityStatus;
  canActivate: boolean;
  alreadyActive: boolean;
  blockers: Array<{ code: ActivationBlockCode; message: string }>;
  warnings: string[];
  agreementId: CommercialAgreementId | null;
  agreementName: string | null;
  proposedPlanKey: ClientPlanKey | null;
  proposedPlanLabel: string | null;
  proposedPlanStatus: ClientPlanStatus | null;
  commercial: ActivationCommercialSnapshot;
  current: ActivationPlanSnapshot;
  proposed: ActivationPlanSnapshot;
  capabilityChanges: ActivationCapabilityChange[];
  unchangedSystems: ActivationExcludedAction[];
  previewFingerprint: string;
  generatedAt: string;
};

export type ActivationResultStatus =
  | "activated"
  | "already_active"
  | "blocked"
  | "stale";

export type ActivationResult = {
  status: ActivationResultStatus;
  message: string;
  clientId: number;
  agreementId: CommercialAgreementId | null;
  previousPlanKey: ClientPlanKey | null;
  previousPlanStatus: ClientPlanStatus | null;
  activatedPlanKey: ClientPlanKey | null;
  activatedPlanStatus: ClientPlanStatus | null;
  capabilityChanges: ActivationCapabilityChange[];
  preview?: ActivationPreview;
};

/** Systems activation deliberately does not touch. */
export const ACTIVATION_EXCLUDED_ACTIONS: readonly ActivationExcludedAction[] = [
  { id: "commercial-terms", label: "Commercial terms (amounts, notes, add-on approvals)" },
  { id: "billing", label: "Billing, invoicing, or card charges" },
  { id: "email", label: "Email or notifications" },
  { id: "providers", label: "Provider connections (Google, Stripe, ads, analytics)" },
  { id: "infrastructure", label: "Client infrastructure settings" },
  { id: "reporting-config", label: "Reporting automation configuration" },
  { id: "portal-users", label: "Portal user accounts" },
  { id: "inventory-publish", label: "Inventory or website publication" },
  { id: "launch", label: "Client launch or inquiry creation" },
  { id: "contracts", label: "Contracts, e-signature, or PDF generation" },
] as const;
