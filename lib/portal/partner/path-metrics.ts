/**
 * Shared partner operating-path counts.
 * Partner Home and Network Command must use the same predicates.
 */

export const PARTNER_QUALIFIED_VISIBILITY_STATES = [
  "qualified",
  "discovery_booked",
  "proposal_in_motion",
  "won",
] as const;

export const PARTNER_DISCOVERY_VISIBILITY_STATES = [
  "discovery_booked",
  "proposal_in_motion",
  "won",
] as const;

export const PARTNER_OPEN_BOOKING_STATUSES = [
  "submitted",
  "scheduled",
  "confirmed",
] as const;

export const PARTNER_RATE_MIN_DENOMINATOR = 3;

export type PartnerPathMetrics = {
  submittedLeads: number;
  qualifiedLeads: number;
  bookedFromLeads: number;
  bookedCalls: number;
  wonClients: number;
};

export function isQualifiedPartnerVisibility(state: string): boolean {
  return (PARTNER_QUALIFIED_VISIBILITY_STATES as readonly string[]).includes(
    state,
  );
}

export function isDiscoveryPartnerVisibility(state: string): boolean {
  return (PARTNER_DISCOVERY_VISIBILITY_STATES as readonly string[]).includes(
    state,
  );
}

export function isOpenPartnerBookingStatus(status: string): boolean {
  return (PARTNER_OPEN_BOOKING_STATUSES as readonly string[]).includes(status);
}

export function countPartnerPathMetrics(input: {
  visibilityStates: readonly string[];
  openBookingCount: number;
}): PartnerPathMetrics {
  const submittedLeads = input.visibilityStates.length;
  const qualifiedLeads = input.visibilityStates.filter((state) =>
    isQualifiedPartnerVisibility(state),
  ).length;
  const bookedFromLeads = input.visibilityStates.filter((state) =>
    isDiscoveryPartnerVisibility(state),
  ).length;
  const wonClients = input.visibilityStates.filter(
    (state) => state === "won",
  ).length;
  const openBookingCount = Number.isFinite(input.openBookingCount)
    ? Math.max(0, input.openBookingCount)
    : 0;

  return {
    submittedLeads,
    qualifiedLeads,
    bookedFromLeads,
    bookedCalls: Math.max(bookedFromLeads, openBookingCount),
    wonClients,
  };
}

/**
 * Conversion rates use a funnel subset as the numerator.
 * Extra open bookings can raise `bookedCalls` above qualified; they must not
 * inflate the percentage. Numerators are capped at the denominator.
 */
export function partnerConversionRate(
  numerator: number,
  denominator: number,
): { numerator: number; denominator: number; percent: number | null } {
  const n = Number.isFinite(numerator) ? Math.max(0, numerator) : 0;
  const d = Number.isFinite(denominator) ? Math.max(0, denominator) : 0;
  if (d < PARTNER_RATE_MIN_DENOMINATOR) {
    return { numerator: n, denominator: d, percent: null };
  }
  const capped = Math.min(n, d);
  return {
    numerator: capped,
    denominator: d,
    percent: Math.round((capped / d) * 100),
  };
}
