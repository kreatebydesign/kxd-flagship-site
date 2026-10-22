import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { sql } from "@payloadcms/db-postgres";
import { getConnectPostgresExecutor } from "@/lib/connect/db";
import type { StaffActor } from "@/lib/staff/types";
import { assertStaffCapability } from "@/lib/staff/permissions";
import { staffActorFromUser } from "@/lib/staff/actor";
import { ensureStaffPayrollFoundation } from "./bootstrap";
import { preliminaryGrossCentsForMinutes } from "./money";
import type {
  PayPeriodEmployeeSummary,
  PayPeriodListItem,
  PayPeriodReviewAuditEvent,
  PayPeriodReviewPayload,
  PayPeriodShiftLine,
  PayPeriodWorkflowState,
} from "./types";
import { readShiftAuditEvents } from "@/lib/staff-time/audit";
import { minutesBetween } from "@/lib/staff-time/dates";
import {
  allocateShiftMinutesByWorkweek,
  dateKeysBetween,
  evaluateWorkweekOvertimeWarnings,
  workweekStartsTouchingPeriod,
} from "./workweek";
import {
  computePayPeriodDataFingerprint,
  type FingerprintRateSlice,
  type FingerprintShiftSlice,
} from "./review-fingerprint";
import { hasBlockingPayPeriodExceptions } from "./exceptions";

const PRELIMINARY_DISCLAIMER =
  "Preliminary straight-time totals from recorded shifts and effective hourly rates. Not legal payroll advice, tax withholding, or a payment authorization. Overtime and jurisdiction rules may require separate calculation.";

const MISSING_DAY_DISCLAIMER =
  "Days listed as missing recorded time are review prompts only — they do not assert that the employee worked or did not work on those dates.";

const CORRECTION_ACTIONS = new Set([
  "shift_start_corrected",
  "shift_end_corrected",
  "operator_historical_shift_created",
]);

type PeriodRow = {
  id: number;
  period_start: string;
  period_end: string;
  payday: string;
  period_kind: string;
  label: string;
};

type ReviewRow = {
  workflow_state: string;
  reviewed_at: string | null;
  reviewed_by_user_id: number | null;
  review_note: string | null;
  audit_events: unknown;
  data_fingerprint: string | null;
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
  updated_at?: string;
};

function parseWorkflowState(value: string): PayPeriodWorkflowState {
  if (value === "reviewed" || value === "payable") return value;
  return "recorded";
}

function readReviewAuditEvents(raw: unknown): PayPeriodReviewAuditEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const entry = row as Record<string, unknown>;
      return {
        id: String(entry.id ?? ""),
        at: String(entry.at ?? ""),
        actorUserId: Number(entry.actorUserId ?? 0),
        action: String(entry.action ?? ""),
        note: entry.note ? String(entry.note) : null,
        detail:
          entry.detail && typeof entry.detail === "object"
            ? (entry.detail as Record<string, unknown>)
            : null,
      };
    })
    .filter((e) => e.id && e.at && e.action);
}

function appendReviewAudit(
  existing: PayPeriodReviewAuditEvent[],
  entry: Omit<PayPeriodReviewAuditEvent, "id"> & { id?: string },
): PayPeriodReviewAuditEvent[] {
  const id = entry.id ?? `pay-review-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return [
    ...existing,
    {
      id,
      at: entry.at,
      actorUserId: entry.actorUserId,
      action: entry.action,
      note: entry.note ?? null,
      detail: entry.detail ?? null,
    },
  ];
}

function maxDateKey(a: string, b: string): string {
  return a >= b ? a : b;
}

function uniqueShifts(rows: ShiftRow[]): ShiftRow[] {
  const map = new Map<number, ShiftRow>();
  for (const row of rows) {
    map.set(Number(row.id), row);
  }
  return [...map.values()];
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

export function assertFounderMayReviewPayroll(actor: StaffActor): void {
  assertStaffCapability(actor, "admin.payroll.review");
}

export async function listStaffPayPeriods(
  actor: StaffActor,
): Promise<PayPeriodListItem[]> {
  assertFounderMayReviewPayroll(actor);
  const payload = await getPayload({ config });
  await ensureStaffPayrollFoundation(payload);
  const db = getConnectPostgresExecutor(payload);
  if (!db) return [];

  const periods = await db.execute(
    sql`
      SELECT id, period_start, period_end, payday, period_kind, label
      FROM staff_pay_periods
      ORDER BY period_start ASC
    `,
  );
  const periodRows = (periods as { rows?: PeriodRow[] }).rows ?? [];

  const reviews = await db.execute(
    sql`
      SELECT pay_period_id, workflow_state
      FROM staff_pay_period_reviews
    `,
  );
  const reviewMap = new Map<number, PayPeriodWorkflowState>();
  for (const row of (reviews as { rows?: { pay_period_id: number; workflow_state: string }[] }).rows ?? []) {
    reviewMap.set(Number(row.pay_period_id), parseWorkflowState(String(row.workflow_state)));
  }

  return periodRows.map((row) => ({
    id: Number(row.id),
    label: String(row.label),
    periodStart: String(row.period_start).slice(0, 10),
    periodEnd: String(row.period_end).slice(0, 10),
    payday: String(row.payday).slice(0, 10),
    periodKind: String(row.period_kind),
    workflowState: reviewMap.get(Number(row.id)) ?? "recorded",
  }));
}

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

async function ensureReviewRow(
  db: NonNullable<ReturnType<typeof getConnectPostgresExecutor>>,
  payPeriodId: number,
): Promise<ReviewRow> {
  await db.execute(
    sql`
      INSERT INTO staff_pay_period_reviews (pay_period_id, workflow_state)
      VALUES (${payPeriodId}, 'recorded')
      ON CONFLICT (pay_period_id) DO NOTHING
    `,
  );
  const result = await db.execute(
    sql`
      SELECT workflow_state, reviewed_at, reviewed_by_user_id, review_note, audit_events, data_fingerprint
      FROM staff_pay_period_reviews
      WHERE pay_period_id = ${payPeriodId}
      LIMIT 1
    `,
  );
  const row = (result as { rows?: ReviewRow[] }).rows?.[0];
  if (!row) {
    throw new Error("PAY_PERIOD_REVIEW_NOT_FOUND");
  }
  return row;
}

async function supersedeStaleReviewIfNeeded(
  db: NonNullable<ReturnType<typeof getConnectPostgresExecutor>>,
  payPeriodId: number,
  reviewRow: ReviewRow,
  currentFingerprint: string,
): Promise<ReviewRow> {
  const state = parseWorkflowState(String(reviewRow.workflow_state));
  if (state === "recorded") {
    return reviewRow;
  }
  const stored = reviewRow.data_fingerprint ? String(reviewRow.data_fingerprint) : null;
  if (stored && stored === currentFingerprint) {
    return reviewRow;
  }

  const at = new Date().toISOString();
  const audit = appendReviewAudit(readReviewAuditEvents(reviewRow.audit_events), {
    at,
    actorUserId: 0,
    action: "pay_period_review_superseded",
    note: "Ledger or rate data changed since last acknowledgment.",
    detail: {
      previousState: state,
      previousFingerprint: stored,
      currentFingerprint,
      reason:
        "Shift correction, new shift, rate change, or pay-period reassignment invalidated prior review.",
    },
  });

  await db.execute(
    sql`
      UPDATE staff_pay_period_reviews
      SET workflow_state = 'recorded',
          data_fingerprint = NULL,
          audit_events = ${JSON.stringify(audit)}::jsonb,
          updated_at = now()
      WHERE pay_period_id = ${payPeriodId}
    `,
  );

  return {
    ...reviewRow,
    workflow_state: "recorded",
    data_fingerprint: null,
    audit_events: audit,
  };
}

async function loadFingerprintRates(
  db: NonNullable<ReturnType<typeof getConnectPostgresExecutor>>,
  staffUserIds: number[],
): Promise<FingerprintRateSlice[]> {
  if (staffUserIds.length === 0) return [];
  const result = await db.execute(
    sql`
      SELECT staff_user_id, rate_cents, effective_from, effective_to
      FROM staff_hourly_rates
      WHERE staff_user_id = ANY(${staffUserIds}::int[])
      ORDER BY staff_user_id ASC, effective_from ASC
    `,
  );
  return (
    (result as { rows?: { staff_user_id: number; rate_cents: string | number; effective_from: string; effective_to: string | null }[] }).rows ?? []
  ).map((row) => ({
    staffUserId: Number(row.staff_user_id),
    rateCents: Number(row.rate_cents),
    effectiveFrom: String(row.effective_from).slice(0, 10),
    effectiveTo: row.effective_to ? String(row.effective_to).slice(0, 10) : null,
  }));
}

function buildFingerprintShifts(shifts: ShiftRow[]): FingerprintShiftSlice[] {
  return shifts.map((shift) => {
    const audit = readShiftAuditEvents({ auditEvents: shift.audit_events });
    return {
      id: Number(shift.id),
      staffUserId: Number(shift.staff_user_id),
      status: String(shift.status),
      startedAt: String(shift.started_at),
      endedAt: shift.ended_at ? String(shift.ended_at) : null,
      localDateKey: String(shift.local_date_key),
      payPeriodId: shift.pay_period_id != null ? Number(shift.pay_period_id) : null,
      auditEventCount: audit.length,
      correctionActionCount: audit.filter((e) => CORRECTION_ACTIONS.has(e.action)).length,
    };
  });
}

export async function loadStaffPayPeriodReview(
  actor: StaffActor,
  payPeriodId: number,
): Promise<PayPeriodReviewPayload> {
  assertFounderMayReviewPayroll(actor);
  const payload = await getPayload({ config });
  await ensureStaffPayrollFoundation(payload);
  const db = getConnectPostgresExecutor(payload);
  if (!db) {
    throw new Error("PAY_PERIOD_REVIEW_REQUIRES_POSTGRES");
  }

  const periodResult = await db.execute(
    sql`
      SELECT id, period_start, period_end, payday, period_kind, label
      FROM staff_pay_periods
      WHERE id = ${payPeriodId}
      LIMIT 1
    `,
  );
  const periodRow = (periodResult as { rows?: PeriodRow[] }).rows?.[0];
  if (!periodRow) {
    throw new Error("PAY_PERIOD_NOT_FOUND");
  }

  const periodStart = String(periodRow.period_start).slice(0, 10);
  const periodEnd = String(periodRow.period_end).slice(0, 10);

  const configResult = await db.execute(
    sql`SELECT weekly_hours_limit FROM staff_payroll_config WHERE id = 1 LIMIT 1`,
  );
  const weeklyHoursLimit = Number(
    (configResult as { rows?: { weekly_hours_limit?: number }[] }).rows?.[0]
      ?.weekly_hours_limit ?? 40,
  );

  const staffUsers = await payload.find({
    collection: "users",
    where: { staffRole: { not_equals: "none" } },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });

  const staffUserIds = staffUsers.docs
    .map((doc) => staffActorFromUser(doc)?.userId)
    .filter((id): id is number => typeof id === "number");

  const shiftsResult = await db.execute(
    sql`
      SELECT id, staff_user_id, status, started_at, ended_at, local_date_key, pay_period_id, audit_events, updated_at
      FROM staff_time_shifts
      WHERE status <> 'voided'
        AND (
          pay_period_id = ${payPeriodId}
          OR (local_date_key >= ${periodStart} AND local_date_key <= ${periodEnd})
        )
      ORDER BY staff_user_id ASC, started_at ASC
    `,
  );
  const periodShiftRows = uniqueShifts((shiftsResult as { rows?: ShiftRow[] }).rows ?? []);

  const workweekStarts = workweekStartsTouchingPeriod(periodStart, periodEnd);
  const otWindowStart = workweekStarts[0] ?? periodStart;
  const otWindowEnd = periodEnd;

  const otShiftsResult = await db.execute(
    sql`
      SELECT id, staff_user_id, status, started_at, ended_at, local_date_key, pay_period_id, audit_events
      FROM staff_time_shifts
      WHERE status = 'completed'
        AND ended_at IS NOT NULL
        AND staff_user_id = ANY(${staffUserIds}::int[])
        AND started_at < (${otWindowEnd}::date + interval '8 days')
        AND ended_at > (${otWindowStart}::date - interval '1 day')
      ORDER BY staff_user_id ASC, started_at ASC
    `,
  );
  const otShiftRows = uniqueShifts((otShiftsResult as { rows?: ShiftRow[] }).rows ?? []);

  const fingerprint = computePayPeriodDataFingerprint({
    payPeriodId,
    shifts: buildFingerprintShifts(periodShiftRows),
    rates: await loadFingerprintRates(db, staffUserIds),
  });

  let reviewRow = await ensureReviewRow(db, payPeriodId);
  reviewRow = await supersedeStaleReviewIfNeeded(db, payPeriodId, reviewRow, fingerprint);
  const auditEvents = readReviewAuditEvents(reviewRow.audit_events);
  const storedFingerprint = reviewRow.data_fingerprint
    ? String(reviewRow.data_fingerprint)
    : null;
  const reviewMatchesCurrentData =
    storedFingerprint != null && storedFingerprint === fingerprint;

  let reviewedByLabel: string | null = null;
  if (reviewRow.reviewed_by_user_id) {
    const user = await payload.findByID({
      collection: "users",
      id: Number(reviewRow.reviewed_by_user_id),
      depth: 0,
      overrideAccess: true,
    });
    const reviewer = user ? staffActorFromUser(user) : null;
    reviewedByLabel = reviewer?.displayName ?? null;
  }

  const employmentResult = await db.execute(
    sql`
      SELECT staff_user_id, employment_start
      FROM staff_employment_profiles
    `,
  );
  const employmentStartByUser = new Map<number, string>();
  for (const row of (employmentResult as { rows?: { staff_user_id: number; employment_start: string }[] }).rows ?? []) {
    employmentStartByUser.set(
      Number(row.staff_user_id),
      String(row.employment_start).slice(0, 10),
    );
  }

  const employees: PayPeriodEmployeeSummary[] = [];

  for (const doc of staffUsers.docs) {
    const member = staffActorFromUser(doc);
    if (!member || member.staffRole === "none") continue;
    if (member.role === "admin") continue;

    const staffUserId = member.userId;
    const memberShifts = periodShiftRows.filter(
      (s) =>
        Number(s.staff_user_id) === staffUserId &&
        shiftInPayPeriodScope(s, payPeriodId, periodStart, periodEnd),
    );
    const lines: PayPeriodShiftLine[] = [];
    const exceptions: PayPeriodEmployeeSummary["exceptions"] = [];
    const datesWithMinutes = new Set<string>();

    for (const shift of memberShifts) {
      const status = String(shift.status);
      const startedAt = String(shift.started_at);
      const endedAt = shift.ended_at ? String(shift.ended_at) : null;
      const localDateKey = String(shift.local_date_key);
      const audit = readShiftAuditEvents({ auditEvents: shift.audit_events });
      const hasCorrectionAudit = audit.some((e) => CORRECTION_ACTIONS.has(e.action));

      if (status === "active") {
        exceptions.push({
          kind: "active_shift_in_period",
          message: `Shift #${shift.id} is still active.`,
        });
      }

      if (status === "completed" && !endedAt) {
        exceptions.push({
          kind: "missing_shift_boundaries",
          message: `Shift #${shift.id} is completed without an end time.`,
        });
      }

      if (
        shift.pay_period_id != null &&
        Number(shift.pay_period_id) !== payPeriodId &&
        localDateKey >= periodStart &&
        localDateKey <= periodEnd
      ) {
        exceptions.push({
          kind: "pay_period_mismatch",
          message: `Shift #${shift.id} is stored on pay period ${shift.pay_period_id} but falls in this period by date.`,
        });
      }

      if (hasCorrectionAudit) {
        exceptions.push({
          kind: "shift_corrected",
          message: `Shift #${shift.id} has operator correction history — verify boundaries.`,
        });
      }

      let minutes = 0;
      if (status === "completed" && endedAt) {
        minutes = minutesBetween(new Date(startedAt), new Date(endedAt));
        if (minutes > 0) {
          datesWithMinutes.add(localDateKey);
        }
      }

      const hourlyRateCents = await resolveHourlyRateCents(db, staffUserId, localDateKey);
      if (minutes > 0 && hourlyRateCents <= 0) {
        exceptions.push({
          kind: "missing_or_unverified_time",
          message: `No hourly rate for ${localDateKey} on shift #${shift.id}.`,
        });
      }

      lines.push({
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
      });
    }

    const employmentStart = employmentStartByUser.get(staffUserId) ?? null;
    const coverageStart = employmentStart
      ? maxDateKey(employmentStart, periodStart)
      : periodStart;
    const todayKey = new Date().toISOString().slice(0, 10);
    const missingOrUnverifiedDateKeys: string[] = [];
    for (const key of dateKeysBetween(coverageStart, periodEnd)) {
      if (key > todayKey) continue;
      if (!datesWithMinutes.has(key)) {
        missingOrUnverifiedDateKeys.push(key);
      }
    }
    if (missingOrUnverifiedDateKeys.length > 0) {
      exceptions.push({
        kind: "missing_or_unverified_time",
        message: `Missing or unverified recorded time on ${missingOrUnverifiedDateKeys.length} day(s) in this period (review prompt only).`,
      });
    }

    const totalMinutes = lines.reduce((sum, line) => sum + line.minutes, 0);
    const preliminaryStraightTimeGrossCents = lines.reduce(
      (sum, line) => sum + line.preliminaryGrossCents,
      0,
    );

    const minutesByWorkweek = new Map<string, number>();
    for (const shift of otShiftRows.filter((s) => Number(s.staff_user_id) === staffUserId)) {
      if (!shift.ended_at) continue;
      const allocations = allocateShiftMinutesByWorkweek(
        String(shift.started_at),
        String(shift.ended_at),
      );
      for (const [weekStart, minutes] of allocations) {
        minutesByWorkweek.set(weekStart, (minutesByWorkweek.get(weekStart) ?? 0) + minutes);
      }
    }

    const workweekOvertimeWarnings = evaluateWorkweekOvertimeWarnings({
      weeklyHoursLimit,
      workweekStarts,
      minutesByWorkweek,
    }).filter((w) => w.exceedsLimit);

    if (workweekOvertimeWarnings.length > 0) {
      exceptions.push({
        kind: "overtime_review_required",
        message:
          "One or more Monday–Sunday workweeks exceed the configured weekly straight-time limit — overtime may apply (not included in preliminary gross).",
      });
    }

    const dailyMap = new Map<string, PayPeriodShiftLine[]>();
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

    employees.push({
      staffUserId,
      displayName: member.displayName,
      email: member.email,
      employmentStart,
      totalMinutes,
      preliminaryStraightTimeGrossCents,
      preliminaryGrossCents: preliminaryStraightTimeGrossCents,
      shiftCount: lines.filter((l) => l.minutes > 0).length,
      workweekOvertimeWarnings,
      daily,
      exceptions,
      missingOrUnverifiedDateKeys,
    });
  }

  const periodExceptions: PayPeriodReviewPayload["periodExceptions"] = [];
  const anyMissing = employees.some((e) => e.missingOrUnverifiedDateKeys.length > 0);
  if (anyMissing) {
    periodExceptions.push({
      kind: "missing_or_unverified_time",
      message:
        "At least one employee has calendar days with no recorded shift time (review prompts — not proof of work).",
    });
  }

  const workflowState = parseWorkflowState(String(reviewRow.workflow_state));

  return {
    period: {
      id: Number(periodRow.id),
      label: String(periodRow.label),
      periodStart,
      periodEnd,
      payday: String(periodRow.payday).slice(0, 10),
      periodKind: String(periodRow.period_kind),
      workflowState,
    },
    weeklyHoursLimit,
    preliminaryDisclaimer: PRELIMINARY_DISCLAIMER,
    missingDayDisclaimer: MISSING_DAY_DISCLAIMER,
    employees,
    periodExceptions,
    review: {
      workflowState,
      reviewedAt: reviewRow.reviewed_at ? String(reviewRow.reviewed_at) : null,
      reviewedByUserId: reviewRow.reviewed_by_user_id
        ? Number(reviewRow.reviewed_by_user_id)
        : null,
      reviewedByLabel,
      auditEvents,
      dataFingerprint: storedFingerprint,
      currentDataFingerprint: fingerprint,
      reviewMatchesCurrentData,
    },
  };
}

export async function acknowledgeStaffPayPeriodReview(input: {
  actor: StaffActor;
  payPeriodId: number;
  targetState: "reviewed" | "payable";
  note?: string | null;
}): Promise<PayPeriodReviewPayload> {
  assertFounderMayReviewPayroll(input.actor);

  const currentReview = await loadStaffPayPeriodReview(input.actor, input.payPeriodId);

  if (input.targetState === "payable") {
    const allExceptions = [
      ...currentReview.periodExceptions,
      ...currentReview.employees.flatMap((e) => e.exceptions),
    ];
    if (hasBlockingPayPeriodExceptions(allExceptions)) {
      throw new Error("PAY_PERIOD_UNRESOLVED_EXCEPTIONS");
    }
    if (currentReview.review.workflowState !== "reviewed") {
      throw new Error("PAY_PERIOD_REVIEW_REQUIRED_FIRST");
    }
    if (!currentReview.review.reviewMatchesCurrentData) {
      throw new Error("PAY_PERIOD_REVIEW_STALE");
    }
  }

  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) {
    throw new Error("PAY_PERIOD_REVIEW_REQUIRES_POSTGRES");
  }

  const reviewRow = await ensureReviewRow(db, input.payPeriodId);
  const current = parseWorkflowState(String(reviewRow.workflow_state));
  const note = input.note?.trim() ? input.note.trim().slice(0, 500) : null;

  if (input.targetState === "reviewed") {
    if (current === "payable") {
      throw new Error("PAY_PERIOD_ALREADY_PAYABLE");
    }
  }

  const fingerprint = currentReview.review.currentDataFingerprint;

  const at = new Date().toISOString();
  const audit = appendReviewAudit(readReviewAuditEvents(reviewRow.audit_events), {
    at,
    actorUserId: input.actor.userId,
    action:
      input.targetState === "reviewed"
        ? "pay_period_review_acknowledged"
        : "pay_period_marked_payable",
    note,
    detail: {
      previousState: current,
      nextState: input.targetState,
      dataFingerprint: fingerprint,
      disclaimer:
        input.targetState === "payable"
          ? "Payable means ready for external payroll processing — wages have not been paid."
          : "Acknowledgment is not a payroll payment.",
    },
  });

  const dataFingerprint =
    input.targetState === "reviewed" || input.targetState === "payable"
      ? fingerprint
      : null;

  await db.execute(
    sql`
      UPDATE staff_pay_period_reviews
      SET workflow_state = ${input.targetState},
          reviewed_at = ${at}::timestamptz,
          reviewed_by_user_id = ${input.actor.userId},
          review_note = ${note},
          audit_events = ${JSON.stringify(audit)}::jsonb,
          data_fingerprint = ${dataFingerprint},
          updated_at = now()
      WHERE pay_period_id = ${input.payPeriodId}
    `,
  );

  return loadStaffPayPeriodReview(input.actor, input.payPeriodId);
}

export function buildPayPeriodReviewCsv(review: PayPeriodReviewPayload): string {
  const header = [
    "row_type",
    "employee_name",
    "employee_email",
    "period_label",
    "period_start",
    "period_end",
    "payday",
    "review_status",
    "shift_date",
    "shift_id",
    "shift_status",
    "minutes",
    "hourly_rate_cents",
    "preliminary_gross_cents",
    "has_correction_audit",
  ];

  const rows: string[][] = [header];
  for (const employee of review.employees) {
    for (const day of employee.daily) {
      for (const shift of day.shifts) {
        rows.push([
          "shift",
          employee.displayName,
          employee.email,
          review.period.label,
          review.period.periodStart,
          review.period.periodEnd,
          review.period.payday,
          review.review.workflowState,
          shift.localDateKey,
          String(shift.shiftId),
          shift.status,
          String(shift.minutes),
          String(shift.hourlyRateCents),
          String(shift.preliminaryGrossCents),
          shift.hasCorrectionAudit ? "yes" : "no",
        ]);
      }
    }
    rows.push([
      "employee_subtotal",
      employee.displayName,
      employee.email,
      review.period.label,
      review.period.periodStart,
      review.period.periodEnd,
      review.period.payday,
      review.review.workflowState,
      "",
      "",
      employee.daily.length === 0 ? "no_shifts" : "subtotal",
      String(employee.totalMinutes),
      "",
      String(employee.preliminaryStraightTimeGrossCents),
      "",
    ]);
  }

  const periodMinutes = review.employees.reduce((s, e) => s + e.totalMinutes, 0);
  const periodGross = review.employees.reduce(
    (s, e) => s + e.preliminaryStraightTimeGrossCents,
    0,
  );
  rows.push([
    "period_total",
    "",
    "",
    review.period.label,
    review.period.periodStart,
    review.period.periodEnd,
    review.period.payday,
    review.review.workflowState,
    "",
    "",
    "period_total",
    String(periodMinutes),
    "",
    String(periodGross),
    "",
  ]);

  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell ?? "";
          if (value.includes(",") || value.includes('"') || value.includes("\n")) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(","),
    )
    .join("\n");
}
