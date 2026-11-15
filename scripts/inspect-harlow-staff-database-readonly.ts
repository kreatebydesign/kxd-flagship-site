/**
 * READ-ONLY Harlow identity audit — reports environment + record ids (no credentials).
 */
import { getPayload } from "payload";
import config from "../payload.config.ts";
import { canUseConnectPostgres } from "../lib/connect/db.ts";
import { auditHarlowStaffRecords } from "../lib/staff/harlow-staff-provision.ts";
import { HARLOW_DOUGLAS_COUNTY_PLANNING_HOURLY_RATE_CENTS } from "../lib/staff/harlow-staff-constants.ts";

function maskDatabaseTarget(): string {
  const raw = process.env.DATABASE_URI?.trim() || "";
  if (!raw) return "none (SQLite fallback likely)";
  try {
    const url = new URL(raw.replace(/^postgres:/, "postgresql:"));
    const host = url.hostname || "(unknown host)";
    const db = url.pathname?.replace(/^\//, "") || "(unknown db)";
    return `postgres host=${host} database=${db}`;
  } catch {
    return "postgres (uri present, could not parse host)";
  }
}

const payload = await getPayload({ config });
const postgres = canUseConnectPostgres(payload);
const audit = await auditHarlowStaffRecords(payload);

console.log("\n=== Harlow staff database audit (READ-ONLY) ===\n");
console.log("Environment:", maskDatabaseTarget());
console.log("Postgres executor:", postgres ? "yes" : "no");
console.log("Planning hourly baseline (not activated):", HARLOW_DOUGLAS_COUNTY_PLANNING_HOURLY_RATE_CENTS, "cents");

console.log("\nJunior creator records:", audit.juniors.length);
for (const j of audit.juniors) {
  console.log(
    JSON.stringify({
      id: j.id,
      email: j.email,
      displayName: j.displayName,
      juniorHourlyRateCents: j.hourlyRateCents,
      linkedStaffUserId: j.linkedStaffUserId,
    }),
  );
}

console.log("\nStaff user records:", audit.staffUsers.length);
for (const u of audit.staffUsers) {
  console.log(
    JSON.stringify({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      staffRole: u.staffRole,
    }),
  );
}

if (audit.juniors.length === 0) {
  console.log("\nNote: No Harlow junior creator on this database. Use the environment where Harlow exists.");
}
if (audit.staffUsers.length === 0) {
  console.log("Note: No linked users record yet. Do not create duplicates; link after owner approval.");
}

console.log("\nJunior assigned tasks remain on /junior-creators until Work Engine items are assigned to the linked staff user.");
console.log("Audit complete. No mutations performed.\n");