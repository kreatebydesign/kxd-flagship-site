/**
 * Portal Billing presentation view models.
 * Allowlisted fields only — no customer IDs, mode, metadata, or provider errors.
 */

import type { InvoiceReadUnavailableCode } from "@/lib/stripe/invoice-read-types";
import type { PortalInvoiceBadgeVariant } from "./status";
import type { KxdBadgeVariant } from "@/components/os/KxdBadge";

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
  /**
   * Stripe-hosted payment page — retained for staff/Phase 5 compatibility.
   * Portal Billing Center V1 does not render Pay Balance or pay CTAs.
   */
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

/** Client-facing obligation / charge row from the KXD commercial ledger. */
export type PortalLedgerBalanceRow = {
  key: string;
  description: string;
  originalLabel: string;
  paidLabel: string;
  remainingLabel: string;
  dueLabel: string | null;
  statusLabel: string;
  statusBadgeVariant: KxdBadgeVariant;
  timingNote: string | null;
};

export type PortalLedgerPaymentRow = {
  key: string;
  paidOnLabel: string;
  label: string;
  methodLabel: string | null;
  detail: string | null;
  amountLabel: string;
};

export type PortalLedgerSummaryMetric = {
  label: string;
  value: string;
};

/**
 * Portal Billing Center ledger projection — Account Statement semantics.
 * Raw cents, obligation IDs, Stripe IDs, and internal notes are excluded.
 */
export type PortalLedgerBillingView =
  | {
      kind: "ready";
      clientLabel: string;
      statementDateLabel: string;
      accountStatus: "current" | "outstanding";
      accountStatusLabel: "You're current" | "Outstanding balance";
      currentlyDueLabel: string;
      paidToDateLabel: string;
      upcomingCount: number;
      upcomingSummaryLabel: string | null;
      summary: {
        currentlyDue: PortalLedgerSummaryMetric;
        paidToDate: PortalLedgerSummaryMetric;
        upcoming: PortalLedgerSummaryMetric;
      };
      currentlyDue: PortalLedgerBalanceRow[];
      upcomingItems: PortalLedgerBalanceRow[];
      paymentHistory: PortalLedgerPaymentRow[];
      statementPdfHref: "/api/portal/billing/account-statement/pdf";
    }
  | {
      kind: "empty";
      clientLabel: string;
      title: string;
      description: string;
    }
  | {
      kind: "unavailable";
      clientLabel: string;
      title: string;
      description: string;
    };

/** Combined Billing Center page model — ledger first; Stripe invoices secondary. */
export type PortalBillingCenterView = {
  ledger: PortalLedgerBillingView;
  invoices: PortalBillingView;
};

/** Compact overview card model — derived from a ready ledger view only. */
export type PortalBillingOverviewCardModel = {
  accountStatus: "current" | "outstanding";
  headline: string;
  amountLabel: string | null;
  supportingLabel: string;
  upcomingNote: string | null;
  billingHref: "/portal/invoices";
};
