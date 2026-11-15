/**
 * Read-only audit: Harlow junior creator + linked staff user, hourly rate, employment profile.
 *   npx tsx --env-file=.env.local --import ./scripts/shims/register-server-only.mjs scripts/audit-harlow-staff-experience.ts
 */
import { getPayload } from "payload";
import config from "../payload.config.ts";
import { sql } from "@payloadcms/db-postgres";
import { getConnectPostgresExecutor } from "../lib/connect/db.ts";
import {
  HARLOW_DISPLAY_NAME,
  HARLOW_PROPOSED_HOURLY_RATE_CENTS,
} from "../lib/staff/harlow-staff-constants.ts";
import { auditHarlowStaffRecords } from "../lib/staff/harlow-staff-provision.ts";

const payload = await getPayload({ config });
const audit = await auditHarlowStaffRecords(payload);

console.log("\nHarlow staff experience audit\n");
console.log("Junior creator records:", audit.juniors.length);
for (const row of audit.juniors) {
  console.log(
    `  id=${row.id} email=${row.email} rateCents=${row.hourlyRateCents} linkedStaffUserId=${row.linkedStaffUserId ?? "—"}`,
  );
}
console.log("Staff user records:", audit.staffUsers.length);
for (const row of audit.staffUsers) {
  console.log(`  id=${row.id} email=${row.email} staffRole=${row.staffRole ?? "—"}`);
}

const db = getConnectPostgresExecutor(payload);
if (db && audit.staffUsers[0]) {
  const staffUserId = audit.staffUsers[0].id;
  const rates = await db.execute(sql`
    SELECT rate_cents, effective_from::text AS effective_from
    FROM staff_hourly_rates WHERE staff_user_id = ${staffUserId} ORDER BY effective_from
  `);
  const profiles = await db.execute(sql`
    SELECT employment_start::text FROM staff_employment_profiles WHERE staff_user_id = ${staffUserId}
  `);
  console.log("\nHourly rates:", (rates as { rows?: unknown[] }).rows ?? []);
  console.log("Employment profiles:", (profiles as { rows?: unknown[] }).rows ?? []);
}

console.log(
  `\nProposed hourly rate (owner confirmation pending): $${(HARLOW_PROPOSED_HOURLY_RATE_CENTS / 100).toFixed(2)}/hr`,
);
console.log(`Expected display name: "${HARLOW_DISPLAY_NAME}"`);
console.log("\nAudit complete (read-only).\n");