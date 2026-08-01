/**
 * Phase 5 Batch 5C — Calm client-facing invoice status labels.
 * Does not invent overdue/receipt meanings.
 */

import type { StripeInvoiceProviderStatus } from "@/lib/stripe/invoice-read-types";

/** Mirrors KxdBadgeVariant values used by portal Billing. */
export type PortalInvoiceBadgeVariant =
  | "status"
  | "pending"
  | "success"
  | "warning";

export type PortalInvoiceStatusPresentation = {
  label: string;
  /** Accessible status text — never color alone. */
  ariaLabel: string;
  badgeVariant: PortalInvoiceBadgeVariant;
};

export function presentInvoiceStatus(
  status: StripeInvoiceProviderStatus,
): PortalInvoiceStatusPresentation {
  switch (status) {
    case "draft":
      return {
        label: "Draft",
        ariaLabel: "Invoice status: Draft",
        badgeVariant: "status",
      };
    case "open":
      return {
        label: "Open",
        ariaLabel: "Invoice status: Open",
        badgeVariant: "pending",
      };
    case "paid":
      return {
        label: "Paid",
        ariaLabel: "Invoice status: Paid",
        badgeVariant: "success",
      };
    case "uncollectible":
      return {
        label: "Uncollectible",
        ariaLabel: "Invoice status: Uncollectible",
        badgeVariant: "warning",
      };
    case "void":
      return {
        label: "Void",
        ariaLabel: "Invoice status: Void",
        badgeVariant: "status",
      };
    case "unknown":
    default:
      return {
        label: "Status unavailable",
        ariaLabel: "Invoice status: Unavailable",
        badgeVariant: "status",
      };
  }
}
