/**
 * Pure contract commercial-value helpers.
 * Direct Agreements use status "executed" (not "signed") after acceptance.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

/** Contract statuses that contribute to contracted commercial value. */
const RECOGNIZED_CONTRACT_STATUSES = new Set(["signed", "executed"]);

/** Revenue event types whose amounts already sit inside contractedValue. */
export const CONTRACT_VALUE_REVENUE_EVENT_TYPES = new Set([
  "revenue.contract-signed",
  "revenue.contract-executed",
  "revenue.external-payment-recorded",
]);

export function isCommerciallyRecognizedContractStatus(status: unknown): boolean {
  return RECOGNIZED_CONTRACT_STATUSES.has(String(status ?? ""));
}

/**
 * Annualized contracted commercial value for a recognized agreement.
 * One-time Direct Agreements contribute projectAmount only (monthlyAmount = 0 → no MRR).
 */
export function contractedValueFromContract(contract: AnyDoc): number {
  if (!isCommerciallyRecognizedContractStatus(contract.status)) return 0;
  const monthly = Number(contract.monthlyAmount ?? 0);
  const project = Number(contract.projectAmount ?? 0);
  if (!Number.isFinite(monthly) || !Number.isFinite(project)) return 0;
  return project + monthly * 12;
}

/** One-time (non-MRR) portion of a recognized contract. */
export function oneTimeContractValue(contract: AnyDoc): number {
  if (!isCommerciallyRecognizedContractStatus(contract.status)) return 0;
  const project = Number(contract.projectAmount ?? 0);
  return Number.isFinite(project) && project > 0 ? project : 0;
}

export function shouldIncludeRevenueEventInLifetimeValue(eventType: unknown): boolean {
  return !CONTRACT_VALUE_REVENUE_EVENT_TYPES.has(String(eventType ?? ""));
}
