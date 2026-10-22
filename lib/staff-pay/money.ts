/** Deterministic money math — integer cents only. */

export function preliminaryGrossCentsForMinutes(
  minutes: number,
  hourlyRateCents: number,
): number {
  if (minutes <= 0 || hourlyRateCents <= 0) return 0;
  return Math.round((minutes * hourlyRateCents) / 60);
}

export function formatUsdFromCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  return `${sign}$${dollars}.${String(remainder).padStart(2, "0")}`;
}
