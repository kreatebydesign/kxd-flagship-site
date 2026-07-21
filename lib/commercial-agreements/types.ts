/**
 * Internal commercial agreement catalog for new-client operations.
 * Public package facts live in lib/partnerships; this layer adds entitlement
 * mapping and operator-facing commercial context without changing CES access.
 */

import type { PartnershipAddOn, PartnershipPackageId } from "@/lib/partnerships/packages";

/** Entitlement preset ids from the launch wizard — kept as a string union to avoid cycles. */
export type CommercialEntitlementPresetId =
  | "starter"
  | "growth"
  | "premium"
  | "enterprise"
  | "custom";

export type CommercialAgreementId =
  | "kxd-partnership"
  | "kxd-operating"
  | "kxd-executive"
  | "custom-legacy";

export type CommercialAddOnId = PartnershipAddOn["id"];

export type CommercialAgreementDefinition = {
  id: CommercialAgreementId;
  /** Exact public commercial name, or Custom / Legacy Agreement. */
  name: string;
  summary: string;
  /** Maps to Shared Core entitlement preset for NEW launches only. */
  entitlementPresetId: CommercialEntitlementPresetId;
  monthlyStarting: number | null;
  monthlyLabel: string | null;
  setupFee: number | null;
  setupLabel: string | null;
  monthlyServiceCredits: number | null;
  recommended?: boolean;
  /** Public partnership id when this agreement mirrors /pricing. */
  publicPackageId: PartnershipPackageId | null;
  /** Optional commercial add-ons — never auto-enabled on selection. */
  availableAddOnIds: readonly CommercialAddOnId[];
  /** Operator guidance: commercial vs capability baseline. */
  capabilityNote: string;
};
