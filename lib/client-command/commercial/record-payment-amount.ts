/**
 * Pure helpers for Record Payment amount authority.
 * Operator-entered amount must never be silently replaced by obligation remaining.
 */

export function dollarsFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function parseAmountDollarsToCents(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

/**
 * Initial convenience amount when opening the form.
 * Row CTA may prefill remaining; primary CTA may suggest a default.
 * This runs only once at mount — never on obligation/mode changes.
 */
export function initialRecordPaymentAmountDollars(input: {
  initialObligationRemainingCents?: number | null;
  defaultOpenRemainingCents?: number | null;
}): string {
  if (
    typeof input.initialObligationRemainingCents === "number" &&
    Number.isInteger(input.initialObligationRemainingCents) &&
    input.initialObligationRemainingCents > 0
  ) {
    return dollarsFromCents(input.initialObligationRemainingCents);
  }
  const open = input.defaultOpenRemainingCents;
  if (typeof open === "number" && Number.isInteger(open) && open > 0) {
    return dollarsFromCents(Math.min(open, 35_000));
  }
  return "";
}

/**
 * When selecting a single obligation, keep the current operator amount.
 * Remaining may be shown as help text — never written into Amount.
 */
export function amountAfterObligationSelection(input: {
  currentAmountDollars: string;
  selectedRemainingCents: number | null;
}): { amountDollars: string; remainingHelp: string | null } {
  const remainingHelp =
    typeof input.selectedRemainingCents === "number" &&
    Number.isInteger(input.selectedRemainingCents) &&
    input.selectedRemainingCents > 0
      ? `Obligation remaining ${dollarsFromCents(input.selectedRemainingCents)}`
      : null;
  return {
    amountDollars: input.currentAmountDollars,
    remainingHelp,
  };
}

/**
 * Changing application mode must preserve operator amount.
 */
export function amountAfterApplicationModeChange(currentAmountDollars: string): string {
  return currentAmountDollars;
}
