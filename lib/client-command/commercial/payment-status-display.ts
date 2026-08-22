import type { ContractLifecyclePackage } from "@/lib/proposal-lifecycle/types";

export const AGREEMENT_PAYMENT_AWAITING_EXECUTION_LABEL =
  "Payment received — awaiting contract execution";

export function formatPaymentStatusLabel(status: string | null | undefined): string {
  if (!status) return "Pending";
  const map: Record<string, string> = {
    paid: "Paid",
    pending: "Pending",
    "payment-pending": "Pending",
    linked: "Linked",
  };
  return map[status] ?? status.replace(/-/g, " ");
}

function findInitialObligationId(pkg: ContractLifecyclePackage): string | null {
  const fromPlan = pkg.billingPlan?.obligations?.find((o) => o.kind === "initial");
  if (fromPlan?.id) return fromPlan.id;
  const installments = pkg.structuredPaymentTerms?.installments ?? [];
  if (installments[0]?.id) return installments[0].id;
  return null;
}

/** Billing-plan initial obligation is the authoritative paid signal when present. */
export function isBillingPlanInitialObligationPaid(pkg: ContractLifecyclePackage): boolean {
  const initial = pkg.billingPlan?.obligations?.find((o) => o.kind === "initial");
  return Boolean(initial && initial.status === "paid");
}

export function hasPendingVerifiedInitialPayment(pkg: ContractLifecyclePackage): boolean {
  const pending = pkg.pendingVerifiedStripePayments ?? [];
  if (!pending.length) return false;
  const initialId = findInitialObligationId(pkg);
  if (initialId) {
    return pending.some((p) => p.obligationId === initialId);
  }
  return pending.length > 0;
}

export function resolveAgreementPaymentStatusFallbackKey(
  pkg: ContractLifecyclePackage,
  commercialOrContractStatus?: string | null,
): string {
  const status = commercialOrContractStatus ?? pkg.commercialStatus ?? "";
  return (
    pkg.paymentReferences?.paymentStatus ||
    (status === "paid" || status === "active"
      ? "paid"
      : status === "payment-pending"
        ? "payment-pending"
        : "pending")
  );
}

/**
 * Operator-facing Payment Status for commercial agreements.
 * Billing-plan obligations are authoritative when a billing plan exists.
 */
export function resolveAgreementPaymentStatusLabel(
  pkg: ContractLifecyclePackage,
  commercialOrContractStatus?: string | null,
): string {
  if (isBillingPlanInitialObligationPaid(pkg)) {
    return "Paid";
  }
  if (hasPendingVerifiedInitialPayment(pkg)) {
    return AGREEMENT_PAYMENT_AWAITING_EXECUTION_LABEL;
  }
  return formatPaymentStatusLabel(
    resolveAgreementPaymentStatusFallbackKey(pkg, commercialOrContractStatus),
  );
}

export function isAgreementPaymentMarkedPaid(pkg: ContractLifecyclePackage): boolean {
  return isBillingPlanInitialObligationPaid(pkg);
}
