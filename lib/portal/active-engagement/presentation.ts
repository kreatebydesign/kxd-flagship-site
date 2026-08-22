/**
 * Client-facing engagement labels — presentation only.
 * Does not mutate commercial records.
 */

import { formatCommercialStatus } from "@/lib/client-command/commercial/map-agreement";

export function formatPortalEngagementStatus(input: {
  commercialStatus: string | null | undefined;
  contractStatus?: string | null | undefined;
  paymentStatus?: string | null | undefined;
}): string {
  const commercial = String(input.commercialStatus ?? "").trim().toLowerCase();
  const contract = String(input.contractStatus ?? "").trim().toLowerCase();
  const payment = String(input.paymentStatus ?? "").trim().toLowerCase();

  const executed =
    contract === "executed" || commercial === "executed" || commercial === "active";
  const paid = payment === "paid";

  if (executed && paid) return "Active";
  if (executed) return "Active";
  if (commercial === "accepted" && contract === "executed") return "Active";
  if (commercial === "paid") return "Active";

  return formatCommercialStatus(input.commercialStatus ?? input.contractStatus);
}

/** Payment line on engagement card — never maps paid → Active. */
export function formatPortalPaymentLabel(status: string | null | undefined): string | null {
  if (!status?.trim()) return null;
  const normalized = status.trim().toLowerCase();
  if (normalized === "paid") return "Paid";
  return formatCommercialStatus(status);
}
