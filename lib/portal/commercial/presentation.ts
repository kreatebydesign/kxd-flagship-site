/**
 * Client-facing commercial labels — presentation only.
 */

import type { InvoiceObligationStatus } from "@/lib/proposal-lifecycle/types";

export function formatPortalObligationStatusLabel(
  status: InvoiceObligationStatus | string,
): string {
  const normalized = String(status).trim().toLowerCase();
  if (normalized === "paid") return "Paid";
  if (normalized === "overdue") return "Overdue";
  if (
    normalized === "sent" ||
    normalized === "viewed" ||
    normalized === "approved" ||
    normalized === "under-review" ||
    normalized === "draft-ready"
  ) {
    return "Due";
  }
  return "Upcoming";
}

export function formatPortalCommercialDate(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatPortalAgreementStatusLabel(input: {
  contractStatus: string;
  commercialStatus: string;
}): string {
  const contract = input.contractStatus.trim().toLowerCase();
  const commercial = input.commercialStatus.trim().toLowerCase();
  if (contract === "executed" || commercial === "executed" || commercial === "active") {
    return "Signed";
  }
  if (commercial === "paid") return "Signed";
  return "In progress";
}
