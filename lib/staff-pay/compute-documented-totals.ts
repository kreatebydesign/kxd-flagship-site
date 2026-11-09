import { preliminaryGrossCentsForMinutes } from "./money";
import type { StaffPayHistoricalEntryView } from "./historical-entries";

export function sumHistoricalEntryPreliminaryGrossCents(
  entries: StaffPayHistoricalEntryView[],
): number {
  return entries.reduce((s, e) => s + e.preliminaryGrossCents, 0);
}

export function sumHistoricalEntryMinutes(entries: StaffPayHistoricalEntryView[]): number {
  return entries.reduce((s, e) => s + e.payableMinutes, 0);
}

/** Documented unpaid gross = verified Time Clock + owner-approved historical durations. */
export function computeDocumentedGrossSubtotalCents(input: {
  verifiedPreliminaryGrossCents: number;
  historicalEntries: StaffPayHistoricalEntryView[];
}): number {
  return (
    input.verifiedPreliminaryGrossCents +
    sumHistoricalEntryPreliminaryGrossCents(input.historicalEntries)
  );
}

export function historicalEntriesInPayPeriod(
  entries: StaffPayHistoricalEntryView[],
  payPeriodId: number,
  periodStart: string,
  periodEnd: string,
): StaffPayHistoricalEntryView[] {
  return entries.filter((e) => {
    if (e.payPeriodId === payPeriodId) return true;
    return e.localDateKey >= periodStart && e.localDateKey <= periodEnd;
  });
}

export function computePayPeriodDocumentedGrossCents(input: {
  verifiedPreliminaryGrossCents: number;
  historicalEntries: StaffPayHistoricalEntryView[];
  payPeriodId: number;
  periodStart: string;
  periodEnd: string;
}): number {
  const hist = historicalEntriesInPayPeriod(
    input.historicalEntries,
    input.payPeriodId,
    input.periodStart,
    input.periodEnd,
  );
  return input.verifiedPreliminaryGrossCents + sumHistoricalEntryPreliminaryGrossCents(hist);
}

export function verifiedMinutesFromShiftLines(
  lines: Array<{ minutes: number; status: string; endedAt: string | null }>,
): number {
  return lines.reduce((s, l) => s + (l.status === "completed" && l.endedAt ? l.minutes : 0), 0);
}

export function verifiedGrossFromShiftLines(
  lines: Array<{ preliminaryGrossCents: number; minutes: number; status: string; endedAt: string | null }>,
): number {
  return lines.reduce(
    (s, l) => s + (l.status === "completed" && l.endedAt ? l.preliminaryGrossCents : 0),
    0,
  );
}

export function preliminaryGrossForMinutesAtRate(minutes: number, hourlyRateCents: number): number {
  return preliminaryGrossCentsForMinutes(minutes, hourlyRateCents);
}
