import { preliminaryGrossCentsForMinutes } from "../money";
import type { StaffPayHistoricalEntryView } from "../historical-entries";
import type { StaffWagePaymentAllocationView } from "./types";

export type PayableShiftSlice = {
  shiftId: number;
  localDateKey: string;
  minutes: number;
  hourlyRateCents: number;
  preliminaryGrossCents: number;
  payPeriodId: number | null;
  status: string;
  endedAt: string | null;
};

export type SettledAllocationSlice = Pick<
  StaffWagePaymentAllocationView,
  "shiftId" | "historicalEntryId" | "grossCents" | "payableMinutes" | "status" | "sourceKind"
>;

export function isShiftPayable(shift: PayableShiftSlice): boolean {
  return shift.status === "completed" && shift.endedAt != null && shift.minutes > 0;
}

export function documentedGrossFromShifts(shifts: PayableShiftSlice[]): number {
  return shifts
    .filter(isShiftPayable)
    .reduce((s, row) => s + row.preliminaryGrossCents, 0);
}

export function documentedMinutesFromShifts(shifts: PayableShiftSlice[]): number {
  return shifts.filter(isShiftPayable).reduce((s, row) => s + row.minutes, 0);
}

export function documentedGrossFromHistorical(entries: StaffPayHistoricalEntryView[]): number {
  return entries.reduce((s, e) => s + e.preliminaryGrossCents, 0);
}

export function documentedMinutesFromHistorical(entries: StaffPayHistoricalEntryView[]): number {
  return entries.reduce((s, e) => s + e.payableMinutes, 0);
}

export function settledGrossFromAllocations(allocations: SettledAllocationSlice[]): number {
  return allocations
    .filter((a) => a.status === "active")
    .reduce((s, a) => s + a.grossCents, 0);
}

export function settledMinutesFromAllocations(allocations: SettledAllocationSlice[]): number {
  return allocations
    .filter((a) => a.status === "active")
    .reduce((s, a) => s + a.payableMinutes, 0);
}

export function computeStaffWageSettlementTotals(input: {
  shifts: PayableShiftSlice[];
  historicalEntries: StaffPayHistoricalEntryView[];
  allocations: SettledAllocationSlice[];
}): {
  documentedGrossCents: number;
  documentedMinutes: number;
  settledGrossCents: number;
  settledMinutes: number;
  outstandingGrossCents: number;
  outstandingMinutes: number;
} {
  const documentedGrossCents =
    documentedGrossFromShifts(input.shifts) + documentedGrossFromHistorical(input.historicalEntries);
  const documentedMinutes =
    documentedMinutesFromShifts(input.shifts) + documentedMinutesFromHistorical(input.historicalEntries);
  const settledGrossCents = settledGrossFromAllocations(input.allocations);
  const settledMinutes = settledMinutesFromAllocations(input.allocations);
  return {
    documentedGrossCents,
    documentedMinutes,
    settledGrossCents,
    settledMinutes,
    outstandingGrossCents: Math.max(0, documentedGrossCents - settledGrossCents),
    outstandingMinutes: Math.max(0, documentedMinutes - settledMinutes),
  };
}

export function allocationCoversSource(
  allocations: SettledAllocationSlice[],
  source: { sourceKind: "time_shift"; shiftId: number } | { sourceKind: "historical_entry"; historicalEntryId: number },
): boolean {
  return allocations.some((a) => {
    if (a.status !== "active") return false;
    if (source.sourceKind === "time_shift") {
      return a.sourceKind === "time_shift" && a.shiftId === source.shiftId;
    }
    return a.sourceKind === "historical_entry" && a.historicalEntryId === source.historicalEntryId;
  });
}

export function assertGrossMatchesMinutes(minutes: number, hourlyRateCents: number, grossCents: number): void {
  const expected = preliminaryGrossCentsForMinutes(minutes, hourlyRateCents);
  if (expected !== grossCents) {
    throw new Error(`WAGE_ALLOCATION_GROSS_MISMATCH:${expected}:${grossCents}`);
  }
}

export function sumAllocationGrossCents(
  allocations: Array<{ grossCents: number }>,
): number {
  return allocations.reduce((s, a) => s + a.grossCents, 0);
}

/** Returns true when a new allocation would exceed documented gross for a single source. */
export function allocationExceedsDocumentedGross(
  documentedGrossCents: number,
  alreadySettledGrossCents: number,
  newAllocationGrossCents: number,
): boolean {
  if (documentedGrossCents <= 0 || newAllocationGrossCents <= 0) return true;
  return alreadySettledGrossCents + newAllocationGrossCents > documentedGrossCents;
}

export function sourcesInPayPeriod(input: {
  periodStart: string;
  periodEnd: string;
  payPeriodId: number;
  shifts: PayableShiftSlice[];
  historicalEntries: StaffPayHistoricalEntryView[];
}): { shifts: PayableShiftSlice[]; historicalEntries: StaffPayHistoricalEntryView[] } {
  const shifts = input.shifts.filter(
    (s) =>
      s.payPeriodId === input.payPeriodId ||
      (s.localDateKey >= input.periodStart && s.localDateKey <= input.periodEnd),
  );
  const historicalEntries = input.historicalEntries.filter(
    (e) =>
      e.payPeriodId === input.payPeriodId ||
      (e.localDateKey >= input.periodStart && e.localDateKey <= input.periodEnd),
  );
  return { shifts, historicalEntries };
}

export function maskExternalReference(reference: string): string {
  const trimmed = reference.trim();
  if (trimmed.length <= 4) return "••••";
  return `••••${trimmed.slice(-4)}`;
}
