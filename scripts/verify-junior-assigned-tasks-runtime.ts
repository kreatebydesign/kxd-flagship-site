/**
 * LOCAL runtime checks for Assigned Tasks isolation + seed idempotency.
 *
 *   npm run verify:junior-assigned-tasks-runtime
 */
import { getPayload } from "payload";
import config from "@payload-config";
import {
  findJuniorCreatorByDisplayName,
  findTaskBySeedKey,
  listTasksForJunior,
  updateTaskAsJunior,
} from "../lib/junior-creators/tasks.ts";

const HARLOW_SEED_KEYS = [
  "harlow-assigned-2026-08-dashboard-practice",
  "harlow-assigned-2026-08-otp-image-inventory",
  "harlow-assigned-2026-08-otp-rename-map",
  "harlow-assigned-2026-08-otp-workspace-audit",
  "harlow-assigned-2026-08-end-of-shift-summary",
] as const;

function assertLocalDb(): void {
  const uri =
    process.env.DATABASE_URI?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    "";
  const parsed = new URL(uri);
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new Error(`Refusing runtime verify on non-local host ${parsed.hostname}`);
  }
}

async function main() {
  assertLocalDb();
  await getPayload({ config });

  const harlow = await findJuniorCreatorByDisplayName("Harlow");
  const sasha = await findJuniorCreatorByDisplayName("Sasha");
  if (!harlow) throw new Error("Harlow record missing — run ensure:local-junior-qa-users + seed first.");
  if (!sasha) throw new Error("Sasha record missing — run ensure:local-junior-qa-users first.");

  for (const key of HARLOW_SEED_KEYS) {
    const task = await findTaskBySeedKey(key);
    if (!task) throw new Error(`Missing seed task ${key}`);
    if (task.juniorCreatorUserId !== harlow.id) {
      throw new Error(`Seed ${key} not assigned to Harlow`);
    }
  }

  const harlowTasks = await listTasksForJunior(harlow.id);
  if (harlowTasks.length < 5) {
    throw new Error(`Harlow should see >=5 tasks, got ${harlowTasks.length}`);
  }
  for (const t of harlowTasks) {
    if (t.juniorCreatorUserId !== harlow.id) {
      throw new Error(`Harlow list leaked task ${t.id}`);
    }
  }

  const sashaTasks = await listTasksForJunior(sasha.id);
  const leaked = sashaTasks.filter((t) => t.juniorCreatorUserId === harlow.id);
  if (leaked.length > 0) {
    throw new Error(`Sasha can see Harlow tasks: ${leaked.map((t) => t.id).join(",")}`);
  }
  for (const key of HARLOW_SEED_KEYS) {
    if (sashaTasks.some((t) => t.seedKey === key)) {
      throw new Error(`Sasha list includes Harlow seed ${key}`);
    }
  }

  const sample = harlowTasks[0];
  let denied = false;
  try {
    await updateTaskAsJunior({
      taskId: sample.id,
      juniorCreatorUserId: sasha.id,
      status: "in_progress",
    });
  } catch (err) {
    denied = err instanceof Error && err.message === "JUNIOR_TASK_FORBIDDEN";
  }
  if (!denied) {
    throw new Error("Sasha was able to update Harlow's task — server scoping failed");
  }

  // Allowed junior transition + notes persist
  const updated = await updateTaskAsJunior({
    taskId: sample.id,
    juniorCreatorUserId: harlow.id,
    status: "in_progress",
    completionNotes: "Runtime verify note",
  });
  if (updated.status !== "in_progress") {
    throw new Error("Status did not persist to in_progress");
  }
  if (updated.completionNotes !== "Runtime verify note") {
    throw new Error("Completion notes did not persist");
  }

  // Forbidden: junior cannot mark completed
  let statusDenied = false;
  try {
    await updateTaskAsJunior({
      taskId: sample.id,
      juniorCreatorUserId: harlow.id,
      status: "completed",
    });
  } catch (err) {
    statusDenied =
      err instanceof Error && err.message === "JUNIOR_TASK_STATUS_FORBIDDEN";
  }
  if (!statusDenied) {
    throw new Error("Junior was allowed to set completed — should be forbidden");
  }

  // Restore sample toward assigned workflow (ready_for_review is junior-allowed;
  // leave in_progress so Harlow can still practice in UI)
  console.log("OK — isolation, persistence, and junior status allowlist verified.");
  console.log(
    `Harlow id=${harlow.id} tasks=${harlowTasks.length}; Sasha id=${sasha.id} tasks=${sashaTasks.length}`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
