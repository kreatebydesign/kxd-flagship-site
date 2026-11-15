import "server-only";

import { sql } from "@payloadcms/db-postgres";
import { getPayload } from "payload";
import config from "@payload-config";
import type { StaffActor } from "@/lib/staff/types";
import { assertStaffCapability, isFounderOrAdmin } from "@/lib/staff/permissions";
import { getConnectPostgresExecutor } from "@/lib/connect/db";
import {
  appendStaffEmploymentComplianceAudit,
  readStaffEmploymentComplianceAudit,
} from "./compliance-audit";
import { staffEmploymentComplianceTableReady } from "./compliance-table-ready";
import type {
  StaffEmploymentComplianceRecord,
  StaffPaidShiftSelfStatus,
  UpsertStaffEmploymentComplianceInput,
} from "./compliance-types";
import { evaluatePaidShiftAllowed } from "./compliance-gate";

export { evaluatePaidShiftAllowed } from "./compliance-gate";

function mapComplianceRow(row: Record<string, unknown>): StaffEmploymentComplianceRecord {
  const categories = row.approved_work_categories;
  return {
    id: Number(row.id),
    staffUserId: Number(row.staff_user_id),
    employmentAuthorizationStatus: String(
      row.employment_authorization_status,
    ) as StaffEmploymentComplianceRecord["employmentAuthorizationStatus"],
    oregonPermitConfirmed: Boolean(row.oregon_permit_confirmed),
    permitEffectiveDate: row.permit_effective_date
      ? String(row.permit_effective_date).slice(0, 10)
      : null,
    permitExpirationDate: row.permit_expiration_date
      ? String(row.permit_expiration_date).slice(0, 10)
      : null,
    approvedWorkCategories: Array.isArray(categories)
      ? categories.map((c) => String(c))
      : [],
    schoolDayMaxMinutes:
      row.school_day_max_minutes != null ? Number(row.school_day_max_minutes) : null,
    nonSchoolDayMaxMinutes:
      row.non_school_day_max_minutes != null ? Number(row.non_school_day_max_minutes) : null,
    weeklyMaxMinutes: row.weekly_max_minutes != null ? Number(row.weekly_max_minutes) : null,
    schoolDayEarliestStartLocal: row.school_day_earliest_start_local
      ? String(row.school_day_earliest_start_local)
      : null,
    schoolDayLatestEndLocal: row.school_day_latest_end_local
      ? String(row.school_day_latest_end_local)
      : null,
    nonSchoolDayEarliestStartLocal: row.non_school_day_earliest_start_local
      ? String(row.non_school_day_earliest_start_local)
      : null,
    nonSchoolDayLatestEndLocal: row.non_school_day_latest_end_local
      ? String(row.non_school_day_latest_end_local)
      : null,
    schedulingRules:
      row.scheduling_rules && typeof row.scheduling_rules === "object"
        ? (row.scheduling_rules as Record<string, unknown>)
        : {},
    paidShiftActivation:
      String(row.paid_shift_activation) === "allowed" ? "allowed" : "blocked",
    payrollSetupConfirmed: Boolean(row.payroll_setup_confirmed),
    ownerHourlyRateConfirmed: Boolean(row.owner_hourly_rate_confirmed),
    ownerComplianceNote: row.owner_compliance_note ? String(row.owner_compliance_note) : null,
    auditEvents: readStaffEmploymentComplianceAudit(row.audit_events),
    lastUpdatedByUserId:
      row.last_updated_by_user_id != null ? Number(row.last_updated_by_user_id) : null,
    updatedAt: String(row.updated_at),
    createdAt: String(row.created_at),
  };
}

export async function loadStaffEmploymentCompliance(
  staffUserId: number,
): Promise<StaffEmploymentComplianceRecord | null> {
  if (!(await staffEmploymentComplianceTableReady())) return null;
  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) return null;

  const result = await db.execute(sql`
    SELECT * FROM staff_employment_compliance_records
    WHERE staff_user_id = ${staffUserId}
    LIMIT 1
  `);
  const row = (result as { rows?: Record<string, unknown>[] }).rows?.[0];
  return row ? mapComplianceRow(row) : null;
}

export async function assertStaffPaidShiftPermitted(actor: StaffActor): Promise<void> {
  if (actor.staffRole !== "junior_studio_teammate") return;
  const ready = await staffEmploymentComplianceTableReady();
  if (!ready) {
    throw new Error("PAID_SHIFT_COMPLIANCE_MIGRATION_REQUIRED");
  }
  const record = await loadStaffEmploymentCompliance(actor.userId);
  const decision = evaluatePaidShiftAllowed(actor, record);
  if (!decision.allowed) {
    throw new Error("PAID_SHIFT_BLOCKED");
  }
}

export async function loadStaffPaidShiftSelfStatus(
  actor: StaffActor,
): Promise<StaffPaidShiftSelfStatus> {
  const ready = await staffEmploymentComplianceTableReady();
  if (actor.staffRole !== "junior_studio_teammate") {
    return {
      paidShiftsAllowed: true,
      statusLabel: "Standard staff timekeeping",
      complianceMigrationReady: ready,
    };
  }
  const record = ready ? await loadStaffEmploymentCompliance(actor.userId) : null;
  const decision = evaluatePaidShiftAllowed(actor, record);
  return {
    paidShiftsAllowed: decision.allowed,
    statusLabel: decision.allowed
      ? "Paid shifts are enabled for your account."
      : "Paid shift clock-in is not enabled yet. Ask the owner to complete employment setup.",
    complianceMigrationReady: ready,
  };
}

export async function upsertStaffEmploymentCompliance(
  operator: StaffActor,
  input: UpsertStaffEmploymentComplianceInput,
): Promise<StaffEmploymentComplianceRecord> {
  if (!isFounderOrAdmin(operator)) {
    throw new Error("COMPLIANCE_OWNER_ONLY");
  }
  assertStaffCapability(operator, "admin.payroll.review");

  if (!(await staffEmploymentComplianceTableReady())) {
    throw new Error("COMPLIANCE_MIGRATION_REQUIRED");
  }

  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) throw new Error("COMPLIANCE_REQUIRES_POSTGRES");

  const existing = await loadStaffEmploymentCompliance(input.staffUserId);
  const at = new Date().toISOString();
  const audit = appendStaffEmploymentComplianceAudit(existing?.auditEvents ?? [], {
    at,
    actorUserId: operator.userId,
    action: existing ? "compliance_updated" : "compliance_created",
    note: input.ownerComplianceNote?.trim().slice(0, 500) ?? null,
    detail: {
      employmentAuthorizationStatus: input.employmentAuthorizationStatus,
      paidShiftActivation: input.paidShiftActivation,
      payrollSetupConfirmed: input.payrollSetupConfirmed,
      ownerHourlyRateConfirmed: input.ownerHourlyRateConfirmed,
    },
  });

  const categoriesJson = JSON.stringify(input.approvedWorkCategories ?? []);
  const rulesJson = JSON.stringify(input.schedulingRules ?? {});

  if (existing) {
    await db.execute(sql`
      UPDATE staff_employment_compliance_records SET
        employment_authorization_status = ${input.employmentAuthorizationStatus},
        oregon_permit_confirmed = ${input.oregonPermitConfirmed},
        permit_effective_date = ${input.permitEffectiveDate ?? null},
        permit_expiration_date = ${input.permitExpirationDate ?? null},
        approved_work_categories = ${categoriesJson}::jsonb,
        school_day_max_minutes = ${input.schoolDayMaxMinutes ?? null},
        non_school_day_max_minutes = ${input.nonSchoolDayMaxMinutes ?? null},
        weekly_max_minutes = ${input.weeklyMaxMinutes ?? null},
        school_day_earliest_start_local = ${input.schoolDayEarliestStartLocal ?? null},
        school_day_latest_end_local = ${input.schoolDayLatestEndLocal ?? null},
        non_school_day_earliest_start_local = ${input.nonSchoolDayEarliestStartLocal ?? null},
        non_school_day_latest_end_local = ${input.nonSchoolDayLatestEndLocal ?? null},
        scheduling_rules = ${rulesJson}::jsonb,
        paid_shift_activation = ${input.paidShiftActivation},
        payroll_setup_confirmed = ${input.payrollSetupConfirmed},
        owner_hourly_rate_confirmed = ${input.ownerHourlyRateConfirmed},
        owner_compliance_note = ${input.ownerComplianceNote?.trim().slice(0, 2000) ?? null},
        audit_events = ${JSON.stringify(audit)}::jsonb,
        last_updated_by_user_id = ${operator.userId},
        updated_at = ${at}::timestamptz
      WHERE staff_user_id = ${input.staffUserId}
    `);
  } else {
    await db.execute(sql`
      INSERT INTO staff_employment_compliance_records (
        staff_user_id, employment_authorization_status, oregon_permit_confirmed,
        permit_effective_date, permit_expiration_date, approved_work_categories,
        school_day_max_minutes, non_school_day_max_minutes, weekly_max_minutes,
        school_day_earliest_start_local, school_day_latest_end_local,
        non_school_day_earliest_start_local, non_school_day_latest_end_local,
        scheduling_rules, paid_shift_activation, payroll_setup_confirmed,
        owner_hourly_rate_confirmed, owner_compliance_note, audit_events,
        last_updated_by_user_id, created_at, updated_at
      ) VALUES (
        ${input.staffUserId},
        ${input.employmentAuthorizationStatus},
        ${input.oregonPermitConfirmed},
        ${input.permitEffectiveDate ?? null},
        ${input.permitExpirationDate ?? null},
        ${categoriesJson}::jsonb,
        ${input.schoolDayMaxMinutes ?? null},
        ${input.nonSchoolDayMaxMinutes ?? null},
        ${input.weeklyMaxMinutes ?? null},
        ${input.schoolDayEarliestStartLocal ?? null},
        ${input.schoolDayLatestEndLocal ?? null},
        ${input.nonSchoolDayEarliestStartLocal ?? null},
        ${input.nonSchoolDayLatestEndLocal ?? null},
        ${rulesJson}::jsonb,
        ${input.paidShiftActivation},
        ${input.payrollSetupConfirmed},
        ${input.ownerHourlyRateConfirmed},
        ${input.ownerComplianceNote?.trim().slice(0, 2000) ?? null},
        ${JSON.stringify(audit)}::jsonb,
        ${operator.userId},
        ${at}::timestamptz,
        ${at}::timestamptz
      )
    `);
  }

  const saved = await loadStaffEmploymentCompliance(input.staffUserId);
  if (!saved) throw new Error("COMPLIANCE_SAVE_FAILED");
  return saved;
}