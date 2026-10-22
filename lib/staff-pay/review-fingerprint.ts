import { createHash } from "node:crypto";

export type FingerprintShiftSlice = {
  id: number;
  staffUserId: number;
  status: string;
  startedAt: string;
  endedAt: string | null;
  localDateKey: string;
  payPeriodId: number | null;
  auditEventCount: number;
  correctionActionCount: number;
};

export type FingerprintRateSlice = {
  staffUserId: number;
  rateCents: number;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export function computePayPeriodDataFingerprint(input: {
  payPeriodId: number;
  shifts: FingerprintShiftSlice[];
  rates: FingerprintRateSlice[];
}): string {
  const canonical = JSON.stringify({
    payPeriodId: input.payPeriodId,
    shifts: [...input.shifts]
      .sort((a, b) => a.id - b.id)
      .map((s) => ({
        id: s.id,
        staffUserId: s.staffUserId,
        status: s.status,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        localDateKey: s.localDateKey,
        payPeriodId: s.payPeriodId,
        auditEventCount: s.auditEventCount,
        correctionActionCount: s.correctionActionCount,
      })),
    rates: [...input.rates]
      .sort((a, b) => a.staffUserId - b.staffUserId || a.effectiveFrom.localeCompare(b.effectiveFrom))
      .map((r) => ({
        staffUserId: r.staffUserId,
        rateCents: r.rateCents,
        effectiveFrom: r.effectiveFrom,
        effectiveTo: r.effectiveTo,
      })),
  });
  return createHash("sha256").update(canonical).digest("hex");
}
