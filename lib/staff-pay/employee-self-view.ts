import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { sql } from "@payloadcms/db-postgres";
import { getConnectPostgresExecutor } from "@/lib/connect/db";
import type { StaffActor } from "@/lib/staff/types";
import { assertStaffCapability } from "@/lib/staff/permissions";
import { readShiftAuditEvents } from "@/lib/staff-time/audit";
import { minutesBetween } from "@/lib/staff-time/dates";
import { listStaffTimePayRequestsForStaff } from "@/lib/staff-time/pay-requests";
import { loadDocumentedOutsideClockEvents } from "@/lib/staff-pay/documented-outside-clock";
import {
  computeDocumentedGrossSubtotalCents,
  sumHistoricalEntryMinutes,
  sumHistoricalEntryPreliminaryGrossCents,
} from "@/lib/staff-pay/compute-documented-totals";
import { listStaffPayHistoricalEntriesForStaff } from "@/lib/staff-pay/historical-entries";
import { loadProvisionalHistoricalSummary } from "@/lib/staff-pay/provisional-historical";
import { TYLER_OCT_21_2026_RECONCILIATION } from "@/lib/staff-pay/tyler-payroll-reconciliation";
import { loadStaffWageSettlementSummary } from "@/lib/staff-pay/wage-payments/load-settlement";
import { STAFF_WAGE_SELF_VIEW_DISCLAIMER } from "@/lib/staff-pay/wage-payments/types";
import { preliminaryGrossCentsForMinutes } from "@/lib/staff-pay/money";
import type {
  PayPeriodListItem,
  PayPeriodShiftLine,
  PayPeriodWorkflowState,
} from "@/lib/staff-pay/types";
import type {
  StaffMyTimePayPageData,
  StaffMyTimePayPeriodView,
  StaffMyTimePayShiftView,
} from "@/lib/staff-pay/employee-view-types";

const CORRECTION_ACTIONS = new Set([
  "shift_start_corrected",
  "shift_end_corrected",
  "operator_historical_shift_created",
]);

const GROSS_BEFORE_TAX =
  "Gross earnings shown here are before taxes, deductions, and employer withholdings. This is not net pay.";

const PRELIMINARY_DISCLAIMER =
  "Preliminary straight-time totals from recorded shifts and effective hourly rates. Not legal payroll advice, tax withholding, or a payment authorization.";

const PAYMENT_RECORDED_LEGACY =
  "Scheduled payday is not proof of payment. Settled amounts below are external wage records only, not net pay.";

const COMBINED_DISCLAIMER =
  "Documented gross combines Time Clock shifts with Matt's owner-approved manual durations (Oct 15–20). Unpaid in KXD OS. Oct 21 payable time follows production clock only (see reconciliation note). Employee acknowledgment is optional.";

function parseWorkflowState(value: string): PayPeriodWorkflowState {
  if (value === "reviewed" || value === "payable") return value;
  return "recorded";
}

type PeriodRow = {
  id: number;
  period_start: string;
  period_end: string;
  payday: string;
  period_kind: string;
  label: string;
};

type ShiftRow = {
  id: number;
  staff_user_id: number;
  status: string;
  started_at: string;
  ended_at: string | null;
  local_date_key: string;
  pay_period_id: number | null;
  audit_events: unknown;
};

async function resolveHourlyRateCents(
  db: NonNullable<ReturnType<typeof getConnectPostgresExecutor>>,
  staffUserId: number,
  localDateKey: string,
): Promise<number> {
  const result = await db.execute(
    sql`
      SELECT rate_cents FROM staff_hourly_rates
      WHERE staff_user_id = ${staffUserId}
        AND effective_from <= ${localDateKey}::date
        AND (effective_to IS NULL OR effective_to >= ${localDateKey}::date)
      ORDER BY effective_from DESC
      LIMIT 1
    `,
  );
  const row = (result as { rows?: { rate_cents: string | number }[] }).rows?.[0];
  return row ? Number(row.rate_cents) : 0;
}

function shiftInPayPeriodScope(
  shift: ShiftRow,
  payPeriodId: number,
  periodStart: string,
  periodEnd: string,
): boolean {
  const localDateKey = String(shift.local_date_key);
  return (
    Number(shift.pay_period_id) === payPeriodId ||
    (localDateKey >= periodStart && localDateKey <= periodEnd)
  );
}

function buildShiftLine(
  shift: ShiftRow,
  hourlyRateCents: number,
): PayPeriodShiftLine {
  const status = String(shift.status);
  const startedAt = String(shift.started_at);
  const endedAt = shift.ended_at ? String(shift.ended_at) : null;
  const localDateKey = String(shift.local_date_key);
  const audit = readShiftAuditEvents({ auditEvents: shift.audit_events });
  const hasCorrectionAudit = audit.some((e) => CORRECTION_ACTIONS.has(e.action));
  let minutes = 0;
  if (status === "completed" && endedAt) {
    minutes = minutesBetween(new Date(startedAt), new Date(endedAt));
  }
  return {
    shiftId: Number(shift.id),
    localDateKey,
    startedAt,
    endedAt,
    status,
    minutes,
    hourlyRateCents,
    preliminaryGrossCents: preliminaryGrossCentsForMinutes(minutes, hourlyRateCents),
    hasCorrectionAudit,
    payPeriodId: shift.pay_period_id != null ? Number(shift.pay_period_id) : null,
  };
}

export async function loadStaffMyTimePayPage(actor: StaffActor): Promise<StaffMyTimePayPageData> {
  assertStaffCapability(actor, "staff.time.read.self");
  const staffUserId = actor.userId;

  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) {
    throw new Error("STAFF_MY_TIME_PAY_REQUIRES_POSTGRES");
  }

  const employmentResult = await db.execute(
    sql`
      SELECT employment_start FROM staff_employment_profiles
      WHERE staff_user_id = ${staffUserId} LIMIT 1
    `,
  );
  const employmentStart = (
    employmentResult as { rows?: { employment_start: string }[] }
  ).rows?.[0]?.employment_start
    ? String((employmentResult as { rows?: { employment_start: string }[] }).rows![0].employment_start).slice(
        0,
        10,
      )
    : null;

  const periodsResult = await db.execute(
    sql`
      SELECT id, period_start, period_end, payday, period_kind, label
      FROM staff_pay_periods
      ORDER BY period_start ASC
    `,
  );
  const periodRows = (periodsResult as { rows?: PeriodRow[] }).rows ?? [];

  const reviewsResult = await db.execute(
    sql`SELECT pay_period_id, workflow_state FROM staff_pay_period_reviews`,
  );
  const reviewMap = new Map<number, PayPeriodWorkflowState>();
  for (const row of (reviewsResult as { rows?: { pay_period_id: number; workflow_state: string }[] })
    .rows ?? []) {
    reviewMap.set(Number(row.pay_period_id), parseWorkflowState(String(row.workflow_state)));
  }

  const shiftsResult = await db.execute(
    sql`
      SELECT id, staff_user_id, status, started_at, ended_at, local_date_key, pay_period_id, audit_events
      FROM staff_time_shifts
      WHERE staff_user_id = ${staffUserId}
        AND status <> 'voided'
      ORDER BY started_at ASC
    `,
  );
  const allShifts = (shiftsResult as { rows?: ShiftRow[] }).rows ?? [];

  const myRequests = await listStaffTimePayRequestsForStaff(staffUserId);
  const ackShiftIds = new Set(
    myRequests
      .filter(
        (r) =>
          r.requestKind === "shift_acknowledgment" &&
          r.shiftId != null &&
          (r.status === "submitted" || r.status === "under_review" || r.status === "resolved"),
      )
      .map((r) => r.shiftId as number),
  );
  const openDisputeByShift = new Map<number, number>();
  for (const r of myRequests) {
    if (r.requestKind === "correction_dispute" && r.shiftId != null && r.status === "submitted") {
      openDisputeByShift.set(r.shiftId, r.id);
    }
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const periods: StaffMyTimePayPeriodView[] = [];

  for (const periodRow of periodRows) {
    const payPeriodId = Number(periodRow.id);
    const periodStart = String(periodRow.period_start).slice(0, 10);
    const periodEnd = String(periodRow.period_end).slice(0, 10);
    const memberShifts = allShifts.filter(
      (s) =>
        Number(s.staff_user_id) === staffUserId &&
        shiftInPayPeriodScope(s, payPeriodId, periodStart, periodEnd),
    );

    const lines: StaffMyTimePayShiftView[] = [];
    for (const shift of memberShifts) {
      const localDateKey = String(shift.local_date_key);
      const hourlyRateCents = await resolveHourlyRateCents(db, staffUserId, localDateKey);
      const base = buildShiftLine(shift, hourlyRateCents);
      lines.push({
        ...base,
        employeeAcknowledged: ackShiftIds.has(base.shiftId),
        openDisputeRequestId: openDisputeByShift.get(base.shiftId) ?? null,
      });
    }

    const dailyMap = new Map<string, StaffMyTimePayShiftView[]>();
    for (const line of lines) {
      const bucket = dailyMap.get(line.localDateKey) ?? [];
      bucket.push(line);
      dailyMap.set(line.localDateKey, bucket);
    }

    const daily = [...dailyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([localDateKey, shifts]) => ({
        localDateKey,
        minutes: shifts.reduce((s, l) => s + l.minutes, 0),
        preliminaryGrossCents: shifts.reduce((s, l) => s + l.preliminaryGrossCents, 0),
        shifts,
      }));

    const verifiedTotalMinutes = lines.reduce((s, l) => s + l.minutes, 0);
    const verifiedPreliminaryGrossCents = lines.reduce((s, l) => s + l.preliminaryGrossCents, 0);
    const periodOpen = periodEnd >= todayKey;

    periods.push({
      period: {
        id: payPeriodId,
        label: String(periodRow.label),
        periodStart,
        periodEnd,
        payday: String(periodRow.payday).slice(0, 10),
        periodKind: String(periodRow.period_kind),
        workflowState: reviewMap.get(payPeriodId) ?? "recorded",
      },
      hourlyRateCents: lines[0]
        ? lines[0].hourlyRateCents
        : await resolveHourlyRateCents(db, staffUserId, periodStart),
      employmentStart,
      verifiedTotalMinutes,
      verifiedPreliminaryGrossCents,
      verifiedShiftCount: lines.filter((l) => l.minutes > 0).length,
      daily,
      reviewWorkflowState: reviewMap.get(payPeriodId) ?? "recorded",
      scheduledPayday: String(periodRow.payday).slice(0, 10),
      paymentStatusLabel: "Not recorded as paid in KXD OS",
      periodOpen,
      periodOpenNote: periodOpen
        ? "This pay period is still open. Totals may change if new shifts are recorded."
        : null,
    });
  }

  const verifiedPreliminaryGrossCents = periods.reduce(
    (s, p) => s + p.verifiedPreliminaryGrossCents,
    0,
  );
  const provisionalHistorical = loadProvisionalHistoricalSummary(staffUserId);
  const ownerApprovedHistoricalEntries = await listStaffPayHistoricalEntriesForStaff(staffUserId);
  const historicalGrossFromDb = sumHistoricalEntryPreliminaryGrossCents(
    ownerApprovedHistoricalEntries,
  );
  const historicalMinutesFromDb = sumHistoricalEntryMinutes(ownerApprovedHistoricalEntries);
  const ownerApprovedHistoricalGrossCents =
    ownerApprovedHistoricalEntries.length > 0
      ? historicalGrossFromDb
      : (provisionalHistorical?.ownerApprovedPreliminaryGrossCents ?? null);
  const ownerApprovedHistoricalMinutes =
    ownerApprovedHistoricalEntries.length > 0
      ? historicalMinutesFromDb
      : (provisionalHistorical?.ownerApprovedTotalMinutes ?? null);
  const pendingProposedHistoricalGrossCents =
    provisionalHistorical?.pendingProposedGrossCents ?? null;
  const documentedGrossSubtotalCents = computeDocumentedGrossSubtotalCents({
    verifiedPreliminaryGrossCents,
    historicalEntries: ownerApprovedHistoricalEntries,
  });

  const wageSettlementSummary = await loadStaffWageSettlementSummary(staffUserId);
  const paymentRecordedDisclaimer = wageSettlementSummary.ledgerReady
    ? `${PAYMENT_RECORDED_LEGACY} ${STAFF_WAGE_SELF_VIEW_DISCLAIMER}`
    : `${PAYMENT_RECORDED_LEGACY} Wage settlement ledger is not available in this environment yet.`;

  const defaultRate = await resolveHourlyRateCents(
    db,
    staffUserId,
    employmentStart ?? "2026-10-15",
  );

  return {
    viewer: { userId: staffUserId, displayName: actor.displayName },
    hourlyRateCents: defaultRate,
    grossBeforeTaxDisclaimer: GROSS_BEFORE_TAX,
    preliminaryDisclaimer: PRELIMINARY_DISCLAIMER,
    paymentRecordedDisclaimer,
    periods,
    provisionalHistorical,
    ownerApprovedHistoricalEntries,
    oct21Reconciliation: TYLER_OCT_21_2026_RECONCILIATION,
    summaryTotals: {
      verifiedPreliminaryGrossCents,
      ownerApprovedHistoricalGrossCents,
      ownerApprovedHistoricalMinutes,
      pendingProposedHistoricalGrossCents,
      documentedGrossSubtotalCents,
      settledGrossCents: wageSettlementSummary.ledgerReady
        ? wageSettlementSummary.settledGrossCents
        : null,
      outstandingGrossCents: wageSettlementSummary.ledgerReady
        ? wageSettlementSummary.outstandingGrossCents
        : null,
      wageLedgerReady: wageSettlementSummary.ledgerReady,
      provisionalHistoricalGrossCents: ownerApprovedHistoricalGrossCents,
      combinedIllustrativeGrossCents: documentedGrossSubtotalCents,
      combinedIllustrativeDisclaimer: COMBINED_DISCLAIMER,
    },
    wageSettlement: wageSettlementSummary.ledgerReady
      ? {
          documentedGrossCents: wageSettlementSummary.documentedGrossCents,
          settledGrossCents: wageSettlementSummary.settledGrossCents,
          outstandingGrossCents: wageSettlementSummary.outstandingGrossCents,
          maskedPaymentReferences: wageSettlementSummary.maskedReferences,
        }
      : null,
    myRequests,
    documentedOutsideClockEvents: loadDocumentedOutsideClockEvents(),
  };
}
