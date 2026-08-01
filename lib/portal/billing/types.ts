/**
 * Phase 5 Batch 5C — Portal Billing presentation view model.
 * Allowlisted fields only — no customer IDs, mode, metadata, or provider errors.
 */

import type { InvoiceReadUnavailableCode } from "@/lib/stripe/invoice-read-types";
import type { PortalInvoiceBadgeVariant } from "./status";

export type PortalBillingInvoiceRow = {
  /** Stable React key — not shown as primary client-facing content. */
  key: string;
  displayNumber: string;
  statusLabel: string;
  statusAriaLabel: string;
  badgeVariant: PortalInvoiceBadgeVariant;
  amountDueLabel: string;
  amountPaidLabel: string | null;
  amountRemainingLabel: string | null;
  createdLabel: string | null;
  dueLabel: string | null;
  paidLabel: string | null;
  /** Stripe-hosted invoice page when available. */
  viewInvoiceUrl: string | null;
  /** Stripe-hosted payment page — only when status is open and URL present. */
  payUrl: string | null;
};

export type PortalBillingView =
  | {
      kind: "ready";
      clientLabel: string;
      invoices: PortalBillingInvoiceRow[];
      hasMore: boolean;
      paginationNote: string | null;
    }
  | {
      kind: "empty";
      clientLabel: string;
      title: string;
      description: string;
    }
  | {
      kind: "unavailable";
      clientLabel: string | null;
      title: string;
      description: string;
      /** Internal code for deterministic tests — never rendered in UI copy. */
      reasonCode: InvoiceReadUnavailableCode;
    };
