/**
 * Static verification for Junior Creator Assigned Tasks.
 * Run: npx tsx scripts/verify-junior-assigned-tasks.ts
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function check(label: string, pass: boolean, detail?: string) {
  console.log(pass ? `  ✔ ${label}` : `  ✘ ${label}${detail ? ` — ${detail}` : ""}`);
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
}

function main() {
  console.log("\nJunior Creator Assigned Tasks — static verification\n");

  const files = [
    "payload/collections/JuniorCreatorTasks.ts",
    "migrations/20260803_junior_creator_assigned_tasks.ts",
    "lib/junior-creators/tasks.ts",
    "lib/junior-creators/tasks-labels.ts",
    "lib/junior-creators/tasks-schema.ts",
    "components/junior-creators/JuniorAssignedTasks.tsx",
    "components/admin/AdminJuniorAssignedTasks.tsx",
    "app/api/junior-creators/tasks/route.ts",
    "app/api/admin/junior-creator-tasks/route.ts",
    "scripts/seed-harlow-junior-assigned-tasks.ts",
  ];
  for (const f of files) {
    check(`${f} exists`, existsSync(path.join(root, f)));
  }

  check(
    "old future-dated migration file removed",
    !existsSync(
      path.join(root, "migrations/20260817_junior_creator_assigned_tasks.ts"),
    ),
  );

  const collection = read("payload/collections/JuniorCreatorTasks.ts");
  const dashboard = read("components/junior-creators/JuniorDashboard.tsx");
  const page = read("app/(junior-creators)/junior-creators/(app)/page.tsx");
  const juniorApi = read("app/api/junior-creators/tasks/route.ts");
  const tasksLib = read("lib/junior-creators/tasks.ts");
  const schemaGuard = read("lib/junior-creators/tasks-schema.ts");
  const seed = read("scripts/seed-harlow-junior-assigned-tasks.ts");
  const payloadConfig = read("payload.config.ts");
  const migrations = read("migrations/index.ts");
  const academy = read("components/junior-creators/JuniorAcademyMissions.tsx");

  check(
    "collection registered in payload.config",
    payloadConfig.includes("JuniorCreatorTasks"),
  );
  check(
    "migration registered as 20260803",
    migrations.includes("20260803_junior_creator_assigned_tasks") &&
      !migrations.includes("20260817_junior_creator_assigned_tasks"),
  );
  check(
    "Assigned Tasks separate from Academy on dashboard",
    dashboard.includes("JuniorAssignedTasks") &&
      dashboard.includes("JuniorAcademyMissions") &&
      dashboard.indexOf("JuniorAssignedTasks") <
        dashboard.indexOf("JuniorAcademyMissions"),
  );
  check(
    "dashboard page loads tasks for session junior only",
    page.includes("listTasksForJunior") &&
      page.includes("session.juniorCreatorUserId"),
  );
  check(
    "junior API requires session",
    juniorApi.includes("getJuniorCreatorSession") &&
      juniorApi.includes("Unauthorized"),
  );
  check(
    "junior status allowlist enforced",
    tasksLib.includes("JUNIOR_ALLOWED_STATUS_UPDATES") &&
      tasksLib.includes("JUNIOR_TASK_FORBIDDEN"),
  );
  check(
    "ownership check before junior update",
    tasksLib.includes("juniorCreatorUserId !== juniorCreatorUserId") ||
      tasksLib.includes("mapped.juniorCreatorUserId !== juniorCreatorUserId"),
  );
  check(
    "pre-migration schema guard present",
    schemaGuard.includes("isJuniorTasksSchemaUnavailableError") &&
      tasksLib.includes("withJuniorTasksSchemaRead") &&
      juniorApi.includes("isJuniorTasksSchemaUnavailableError"),
  );
  check(
    "seed requires explicit --id or --email",
    seed.includes("--id=<junior-creator-users id>") &&
      seed.includes("Display-name-only resolution is disabled") &&
      seed.includes('displayName is not exactly'),
  );
  check(
    "seed refuses non-exact Harlow displayName",
    seed.includes('HARLOW_DISPLAY_NAME = "Harlow"') &&
      seed.includes("user.displayName.trim() !== HARLOW_DISPLAY_NAME"),
  );
  check(
    "five seed keys present",
    seed.includes("harlow-assigned-2026-08-dashboard-practice") &&
      seed.includes("harlow-assigned-2026-08-otp-image-inventory") &&
      seed.includes("harlow-assigned-2026-08-otp-rename-map") &&
      seed.includes("harlow-assigned-2026-08-otp-workspace-audit") &&
      seed.includes("harlow-assigned-2026-08-end-of-shift-summary"),
  );
  check(
    "Academy missions file unchanged in role (still training)",
    academy.includes("mission") || academy.includes("Mission"),
  );
  check(
    "collection states include required statuses",
    collection.includes("ready_for_review") &&
      collection.includes("in_progress") &&
      collection.includes("blocked"),
  );
  check(
    "no Stripe/billing exposure in junior task UI",
    !read("components/junior-creators/JuniorAssignedTasks.tsx").includes(
      "Stripe",
    ) &&
      !read("components/junior-creators/JuniorAssignedTasks.tsx").includes(
        "password",
      ),
  );
  check(
    "no local QA password in intended sources",
    !seed.includes("LocalJuniorQa") &&
      !tasksLib.includes("LocalJuniorQa") &&
      !schemaGuard.includes("LocalJuniorQa"),
  );

  console.log("\nJunior Assigned Tasks static verification passed.\n");
}

main();
