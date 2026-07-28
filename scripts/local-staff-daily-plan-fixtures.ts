/**
 * LOCAL ONLY — labeled fixtures for kxd_staff_migrate daily plan testing.
 * Does not touch Neon/production.
 *
 * Usage:
 *   DATABASE_URI=postgres://kxd@127.0.0.1:5432/kxd_staff_migrate \
 *   DATABASE_URL=postgres://kxd@127.0.0.1:5432/kxd_staff_migrate \
 *   npx tsx scripts/local-staff-daily-plan-fixtures.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";

function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function main() {
  const payload = await getPayload({ config });
  const users = await payload.find({
    collection: "users",
    where: { staffRole: { equals: "operations_coordinator" } },
    limit: 5,
    depth: 0,
    overrideAccess: true,
  });
  const heather = users.docs[0];
  if (!heather) {
    throw new Error("No operations_coordinator user in local DB — create one first.");
  }
  const staffUserId = Number(heather.id);
  const today = todayKey();

  const overdue = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "work" as any,
    data: {
      title: "[LOCAL FIXTURE] Overdue client intake note",
      summary: "Local test overdue item for daily plan Start Here ranking.",
      assignedTo: staffUserId,
      priority: "normal",
      status: "planned",
      category: "onboarding",
      source: "manual",
      sourceId: `local-fixture-overdue-${today}`,
      dueDate: "2026-07-01",
      plannedForDate: today,
      estimatedEffort: 0.5,
      tags: [{ tag: "local-fixture" }],
      createdBy: "local-fixture",
    },
    depth: 0,
    overrideAccess: true,
  });

  const waiting = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "work" as any,
    data: {
      title: "[LOCAL FIXTURE] Draft awaiting Matt",
      summary: "Local test item already in review — must appear under Awaiting Approval.",
      assignedTo: staffUserId,
      priority: "normal",
      status: "review",
      category: "communication",
      source: "manual",
      sourceId: `local-fixture-review-${today}`,
      dueDate: today,
      tags: [{ tag: "local-fixture" }, { tag: "requires-approval" }],
      createdBy: "local-fixture",
    },
    depth: 0,
    overrideAccess: true,
  });

  const responsibility = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "staff-responsibilities" as any,
    data: {
      title: "[LOCAL FIXTURE] Check Website Review Inbox",
      purpose: "Local recurring responsibility for materialization tests.",
      expectedOutcome: "Inbox triaged; sensitive outcomes prepared for Matt.",
      estimatedMinutes: 20,
      owner: staffUserId,
      cadence: "weekdays",
      requiresApproval: false,
      active: true,
      libraryKey: "website-review-inbox",
      scope: "internal",
    },
    depth: 0,
    overrideAccess: true,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        staffUserId,
        overdueWorkId: overdue.id,
        waitingWorkId: waiting.id,
        responsibilityId: responsibility.id,
        note: "Labeled local fixtures only — not production.",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
