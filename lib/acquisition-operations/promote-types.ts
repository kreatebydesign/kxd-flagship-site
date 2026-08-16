/**
 * Shared promotion result contracts for KXD Acquisition → sales-leads.
 */

import type { SalesDoc } from "@/lib/sales/types";
import type { KxdSourceRecordType } from "./contexts";
import type { PromotionProvenance } from "./provenance";

export type PromoteToSalesSuccess = {
  ok: true;
  salesLeadId: number;
  sourceRecordType: KxdSourceRecordType;
  sourceRecordId: number;
  created: boolean;
  salesLead: SalesDoc;
  provenance: PromotionProvenance;
};

export type PromoteToSalesFailure = {
  ok: false;
  message: string;
  code?: "not_found" | "conflict" | "not_eligible" | "error";
};

export type PromoteToSalesResult = PromoteToSalesSuccess | PromoteToSalesFailure;

export type PromoteToSalesOptions = {
  operatorLabel?: string;
};
