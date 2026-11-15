/**
 * Provision Harlow's KXD OS staff shell (link existing accounts, proposed $8/hr).
 * Dry-run by default. Pass --apply to write.
 *
 *   npx tsx --env-file=.env.local --import ./scripts/shims/register-server-only.mjs scripts/provision-harlow-staff-experience.ts
 *   npx tsx ... scripts/provision-harlow-staff-experience.ts --apply
 */
import { getPayload } from "payload";
import config from "../payload.config.ts";
import { provisionHarlowStaffExperience } from "../lib/staff/harlow-staff-provision.ts";

const apply = process.argv.includes("--apply");

const payload = await getPayload({ config });
const result = await provisionHarlowStaffExperience(payload, { dryRun: !apply });

console.log("\nHarlow staff provision", apply ? "(APPLIED)" : "(dry-run)");
console.log(JSON.stringify(result, null, 2));
console.log(
  apply
    ? "\nDone. Tyler payroll data was not modified by this script."
    : "\nRe-run with --apply after owner confirms employment/payroll compliance.",
);