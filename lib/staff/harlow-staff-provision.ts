/**
 * Idempotent Harlow staff experience provisioning — links existing junior creator
 * to a single KXD OS staff user (no duplicate accounts), sets proposed $8/hr rate,
 * and junior_studio_teammate role. Does not alter Tyler or other staff payroll history.
 */

import { sql } from "@payloadcms/db-postgres";
import type { Payload } from "payload";
import { getConnectPostgresExecutor } from "@/lib/connect/db";
import {
  HARLOW_DEFAULT_EMPLOYMENT_START,
  HARLOW_DISPLAY_NAME,
  HARLOW_PROPOSED_HOURLY_RATE_CENTS,
} from "./harlow-staff-constants";

export {
  HARLOW_DEFAULT_EMPLOYMENT_START,
  HARLOW_DISPLAY_NAME,
  HARLOW_PROPOSED_HOURLY_RATE_CENTS,
} from "./harlow-staff-constants";

export type HarlowStaffProvisionResult = {
  juniorCreatorUserId: number;
  staffUserId: number;
  email: string;
  displayName: string;
  staffRole: string;
  hourlyRateCents: number;
  employmentStart: string;
  createdStaffUser: boolean;
  updatedStaffUser: boolean;
  linkedJunior: boolean;
  hourlyRateInserted: boolean;
  employmentProfileInserted: boolean;
  dryRun: boolean;
};

export type HarlowStaffAuditRow = {
  kind: "junior" | "staff_user";
  id: number;
  email: string;
  displayName: string;
  staffRole?: string;
  hourlyRateCents?: number;
  linkedStaffUserId?: number | null;
};

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const n = Number((value as { id: unknown }).id);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function auditHarlowStaffRecords(
  payload: Payload,
): Promise<{ juniors: HarlowStaffAuditRow[]; staffUsers: HarlowStaffAuditRow[] }> {
  const juniors = await payload.find({
    collection: "junior-creator-users",
    where: { displayName: { equals: HARLOW_DISPLAY_NAME } },
    limit: 5,
    overrideAccess: true,
  });

  const juniorRows: HarlowStaffAuditRow[] = juniors.docs.map((doc) => ({
    kind: "junior",
    id: Number(doc.id),
    email: String((doc as { email?: string }).email ?? ""),
    displayName: String((doc as { displayName?: string }).displayName ?? ""),
    hourlyRateCents: Number((doc as { hourlyRateCents?: number }).hourlyRateCents ?? 0),
    linkedStaffUserId: relId((doc as { linkedStaffUser?: unknown }).linkedStaffUser),
  }));

  const emails = juniorRows.map((j) => j.email).filter(Boolean);
  const staffUsers = await payload.find({
    collection: "users",
    where: {
      or: [
        { displayName: { equals: HARLOW_DISPLAY_NAME } },
        ...(emails.length
          ? [{ email: { in: emails } }]
          : [{ email: { contains: "harlow" } }]),
      ],
    },
    limit: 10,
    overrideAccess: true,
  });

  const staffRows: HarlowStaffAuditRow[] = staffUsers.docs.map((doc) => ({
    kind: "staff_user",
    id: Number(doc.id),
    email: String((doc as { email?: string }).email ?? ""),
    displayName: String((doc as { displayName?: string }).displayName ?? ""),
    staffRole: String((doc as { staffRole?: string }).staffRole ?? "none"),
  }));

  return { juniors: juniorRows, staffUsers: staffRows };
}

export async function provisionHarlowStaffExperience(
  payload: Payload,
  options: {
    dryRun: boolean;
    employmentStart?: string;
    hourlyRateCents?: number;
    forceStaffUserId?: number;
  },
): Promise<HarlowStaffProvisionResult> {
  const employmentStart = (options.employmentStart ?? HARLOW_DEFAULT_EMPLOYMENT_START).slice(0, 10);
  const hourlyRateCents = options.hourlyRateCents ?? HARLOW_PROPOSED_HOURLY_RATE_CENTS;

  const juniors = await payload.find({
    collection: "junior-creator-users",
    where: { displayName: { equals: HARLOW_DISPLAY_NAME } },
    limit: 2,
    overrideAccess: true,
  });

  if (juniors.docs.length === 0) {
    throw new Error(
      `No junior creator with displayName "${HARLOW_DISPLAY_NAME}". Refusing to invent a duplicate account.`,
    );
  }
  if (juniors.docs.length > 1) {
    throw new Error(`Multiple junior creators named "${HARLOW_DISPLAY_NAME}". Resolve manually first.`);
  }

  const junior = juniors.docs[0] as {
    id: number;
    email: string;
    displayName: string;
    linkedStaffUser?: unknown;
  };

  if (junior.displayName.trim() !== HARLOW_DISPLAY_NAME) {
    throw new Error("Harlow display name guard failed.");
  }

  let staffUserId =
    options.forceStaffUserId ?? relId(junior.linkedStaffUser) ?? null;
  let createdStaffUser = false;
  let updatedStaffUser = false;

  if (staffUserId) {
    const linked = await payload.findByID({
      collection: "users",
      id: staffUserId,
      depth: 0,
      overrideAccess: true,
    });
    if (!linked) {
      throw new Error(`Linked staff user id=${staffUserId} is missing.`);
    }
  } else {
    const byEmail = await payload.find({
      collection: "users",
      where: { email: { equals: junior.email.trim().toLowerCase() } },
      limit: 2,
      overrideAccess: true,
    });
    if (byEmail.docs.length > 1) {
      throw new Error(`Multiple users records for Harlow email ${junior.email}.`);
    }
    if (byEmail.docs[0]) {
      staffUserId = Number(byEmail.docs[0].id);
    }
  }

  if (!staffUserId) {
    const allowCreate =
      process.env.CONFIRM_HARLOW_STAFF_PROVISION?.trim() === "create-staff-user";
    if (options.dryRun) {
      staffUserId = 0;
    } else if (!allowCreate) {
      throw new Error(
        `No linked users record for Harlow (${junior.email}). ` +
          "Create or link the existing KXD staff user in Payload first, or set " +
          "CONFIRM_HARLOW_STAFF_PROVISION=create-staff-user for a one-time provision.",
      );
    } else {
      const created = await payload.create({
        collection: "users",
        data: {
          email: junior.email.trim(),
          displayName: HARLOW_DISPLAY_NAME,
          role: "editor",
          staffRole: "junior_studio_teammate",
          staffOnboardingCompletedAt: new Date().toISOString(),
          password: process.env.HARLOW_INITIAL_STAFF_PASSWORD?.trim() || undefined,
        },
        overrideAccess: true,
      });
      staffUserId = Number(created.id);
      createdStaffUser = true;
      updatedStaffUser = true;
    }
  } else if (!options.dryRun) {
    const existing = await payload.findByID({
      collection: "users",
      id: staffUserId,
      depth: 0,
      overrideAccess: true,
    });
    const currentRole = String((existing as { staffRole?: string }).staffRole ?? "none");
    const patch: Record<string, unknown> = {};
    if (currentRole === "none") {
      patch.staffRole = "junior_studio_teammate";
    } else if (currentRole !== "junior_studio_teammate") {
      throw new Error(
        `Staff user id=${staffUserId} already has staffRole=${currentRole}. Refusing to override.`,
      );
    }
    if (!(existing as { staffOnboardingCompletedAt?: string | null }).staffOnboardingCompletedAt) {
      patch.staffOnboardingCompletedAt = new Date().toISOString();
    }
    if (Object.keys(patch).length) {
      await payload.update({
        collection: "users",
        id: staffUserId,
        data: patch,
        overrideAccess: true,
      });
      updatedStaffUser = true;
    }
  }

  let linkedJunior = false;
  if (!options.dryRun && staffUserId > 0) {
    const currentLink = relId(junior.linkedStaffUser);
    if (currentLink !== staffUserId) {
      await payload.update({
        collection: "junior-creator-users",
        id: junior.id,
        data: { linkedStaffUser: staffUserId },
        overrideAccess: true,
      });
      linkedJunior = true;
    }
  }

  let hourlyRateInserted = false;
  let employmentProfileInserted = false;

  const rateConfirmEnv = process.env.CONFIRM_HARLOW_LEGAL_HOURLY_RATE?.trim();
  const rateActivationAllowed =
    rateConfirmEnv === String(hourlyRateCents) ||
    rateConfirmEnv === (hourlyRateCents / 100).toFixed(2);

  const db = getConnectPostgresExecutor(payload);
  if (db && staffUserId > 0 && !options.dryRun) {
    if (!rateActivationAllowed) {
      // eslint-disable-next-line no-console
      console.warn(
        `Skipping staff_hourly_rates insert: set CONFIRM_HARLOW_LEGAL_HOURLY_RATE=${hourlyRateCents} ` +
          `or ${(hourlyRateCents / 100).toFixed(2)} after owner confirms the legally applicable rate.`,
      );
    }
    const rateCheck = await db.execute(sql`
      SELECT id FROM staff_hourly_rates
      WHERE staff_user_id = ${staffUserId}
        AND rate_cents = ${hourlyRateCents}
        AND effective_from = ${employmentStart}::date
      LIMIT 1
    `);
    const hasRate = Boolean((rateCheck as { rows?: unknown[] }).rows?.length);
    if (!hasRate && rateActivationAllowed) {
      await db.execute(sql`
        INSERT INTO staff_hourly_rates (staff_user_id, rate_cents, effective_from, created_at, updated_at)
        VALUES (${staffUserId}, ${hourlyRateCents}, ${employmentStart}::date, NOW(), NOW())
      `);
      hourlyRateInserted = true;
    }

    const profileCheck = await db.execute(sql`
      SELECT id FROM staff_employment_profiles WHERE staff_user_id = ${staffUserId} LIMIT 1
    `);
    const hasProfile = Boolean((profileCheck as { rows?: unknown[] }).rows?.length);
    if (!hasProfile) {
      await db.execute(sql`
        INSERT INTO staff_employment_profiles (
          staff_user_id, employment_start, work_jurisdiction, created_at, updated_at
        ) VALUES (${staffUserId}, ${employmentStart}::date, 'oregon', NOW(), NOW())
      `);
      employmentProfileInserted = true;
    }
  } else if (options.dryRun) {
    hourlyRateInserted = true;
    employmentProfileInserted = true;
    linkedJunior = relId(junior.linkedStaffUser) !== staffUserId;
  }

  return {
    juniorCreatorUserId: Number(junior.id),
    staffUserId: staffUserId > 0 ? staffUserId : 0,
    email: junior.email,
    displayName: HARLOW_DISPLAY_NAME,
    staffRole: "junior_studio_teammate",
    hourlyRateCents,
    employmentStart,
    createdStaffUser,
    updatedStaffUser,
    linkedJunior,
    hourlyRateInserted,
    employmentProfileInserted,
    dryRun: options.dryRun,
  };
}