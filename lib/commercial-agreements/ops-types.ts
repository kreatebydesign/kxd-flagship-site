/**
 * Operator workspace types for commercial terms recorded on client records.
 * Phase 36A stores commercial agreements as fields on `clients` — not a separate collection.
 */

import type { CommercialAddOnId, CommercialAgreementId } from "./types";

/** Lifecycle of the commercial recording itself (derived from schema, not a separate enum). */
export type CommercialRecordStatus = "unset" | "recorded";

/**
 * Plan/access provisioning — separate from commercial recording.
 * Derived from planKey / planStatus; never mutated by commercial saves.
 */
export type CommercialProvisioningState = "not_provisioned" | "plan_assigned";

export type ClientCommercialAgreementRecord = {
  clientId: number;
  clientName: string;
  clientSlug: string | null;
  commercialAgreementId: CommercialAgreementId | null;
  agreementName: string | null;
  monthlyRetainerAmount: number | null;
  setupFee: number | null;
  monthlyServiceCredits: number | null;
  commercialAddOns: CommercialAddOnId[];
  commercialNotes: string | null;
  recordStatus: CommercialRecordStatus;
  planKey: string | null;
  planStatus: string | null;
  provisioningState: CommercialProvisioningState;
  catalogMonthly: number | null;
  catalogSetupFee: number | null;
  catalogCredits: number | null;
  updatedAt: string | null;
  createdAt: string | null;
};

export type CommercialAgreementSaveInput = {
  commercialAgreementId: CommercialAgreementId;
  monthlyRetainerAmount: number | null;
  setupFee: number | null;
  monthlyServiceCredits: number | null;
  commercialAddOns: string[];
  commercialNotes: string | null;
};

export type CommercialAgreementFieldErrors = Partial<
  Record<
    | "commercialAgreementId"
    | "monthlyRetainerAmount"
    | "setupFee"
    | "monthlyServiceCredits"
    | "commercialAddOns"
    | "commercialNotes"
    | "clientId",
    string
  >
>;

export type CommercialAgreementListFilters = {
  search?: string;
  agreementId?: CommercialAgreementId | "unset" | "all";
  clientId?: number;
  recordStatus?: CommercialRecordStatus | "all";
};
