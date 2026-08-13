/**
 * Pure Active Engagement helpers — client-safe commercial presentation.
 * No Stripe IDs or operator fields.
 */

/**
 * Resolve monthly capacity hours for client-facing display.
 * Prefer locked agreement structured capacity when present; otherwise use
 * client operational monthly service credits. Never invent values.
 */
export function resolveEngagementCapacityHours(input: {
  agreementCapacityHours: number | null | undefined;
  monthlyServiceCredits: number | null | undefined;
}): number | null {
  const fromAgreement = input.agreementCapacityHours;
  if (typeof fromAgreement === "number" && Number.isFinite(fromAgreement) && fromAgreement >= 0) {
    return fromAgreement;
  }
  const fromCredits = input.monthlyServiceCredits;
  if (typeof fromCredits === "number" && Number.isFinite(fromCredits) && fromCredits > 0) {
    return fromCredits;
  }
  return null;
}

/**
 * Only explicit payment status becomes a client-facing payment label.
 * Never infer Paid from Active / executed commercial status alone.
 */
export function resolveEngagementPaymentStatus(
  explicitPaymentStatus: string | null | undefined,
): string | null {
  const status = String(explicitPaymentStatus ?? "").trim();
  return status || null;
}
