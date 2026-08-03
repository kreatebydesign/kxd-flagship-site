/**
 * Idempotent seed: Harlow's five initial Assigned Tasks.
 *
 * Usage (never against production until explicitly approved):
 *   npm run seed:harlow-junior-tasks -- --id=<juniorCreatorUserId>
 *   npm run seed:harlow-junior-tasks -- --email=<exact-login-email>
 *
 * Requires --id or --email. Refuses to seed unless displayName is exactly "Harlow".
 * Does not modify Sasha or any other junior. Safe to re-run (seedKey unique).
 */
import { getPayload } from "payload";
import config from "@payload-config";
import {
  createJuniorTask,
  findJuniorCreatorByEmail,
  findJuniorCreatorById,
  findTaskBySeedKey,
  type JuniorCreatorIdentity,
} from "../lib/junior-creators/tasks.ts";

const HARLOW_DISPLAY_NAME = "Harlow";

const SEED_TASKS = [
  {
    seedKey: "harlow-assigned-2026-08-dashboard-practice",
    title: "Junior Dashboard Practice",
    clientLabel: "Internal KXD",
    priority: "high" as const,
    estimatedMinutes: 15,
    instructions: [
      "Open this task.",
      "Change it to In Progress.",
      "Read the remaining assigned tasks.",
      'Add the note: "Dashboard reviewed and ready to work."',
      "Move it to Ready for Review.",
      "",
      "Purpose: Learn how the real Assigned Tasks workflow works.",
    ].join("\n"),
  },
  {
    seedKey: "harlow-assigned-2026-08-otp-image-inventory",
    title: "Inventory OTP Main Website Images",
    clientLabel: "On-Track Performance",
    priority: "high" as const,
    estimatedMinutes: 60,
    instructions: [
      "Open the shared Clients folder on the other Mac.",
      "Locate the OTP Main website project and its image assets.",
      "Review the images already placed in the website public folder.",
      "Create a written inventory grouping images by subject, such as Ligier, Hendrick Track Attack, engines, builds, go-karts, Thermal Club, shop, team, logos, and unknown.",
      "Identify unclear filenames, duplicates, weak-quality images, and anything you cannot identify.",
      "Do not rename, move, replace, or delete files inside the live project public folder.",
      "Add the location of the completed inventory in the completion notes.",
    ].join("\n"),
  },
  {
    seedKey: "harlow-assigned-2026-08-otp-rename-map",
    title: "Prepare OTP Image Rename Map",
    clientLabel: "On-Track Performance",
    priority: "high" as const,
    estimatedMinutes: 90,
    instructions: [
      "Using the completed image inventory, prepare a rename map containing:",
      "  current filename → proposed descriptive filename → image category → suggested website use",
      "Use lowercase descriptive filenames with hyphens.",
      "Do not apply the filename changes.",
      "Do not modify website code.",
      "Flag uncertain images for Matt to review.",
      "Add the rename-map location in the completion notes.",
    ].join("\n"),
  },
  {
    seedKey: "harlow-assigned-2026-08-otp-workspace-audit",
    title: "Begin Client Workspace Readiness Audit",
    clientLabel: "On-Track Performance",
    priority: "medium" as const,
    estimatedMinutes: 60,
    instructions: [
      "Review the existing On-Track Performance client folder and the information currently available.",
      "Prepare a checklist showing what is present and what is missing:",
      "  logo, contacts, website links, social links, brand colors, fonts, business description, photos, videos, documents, project notes, analytics links, Search Console, Google Business Profile, and other relevant resources.",
      "Do not enter passwords or expose private credentials.",
      "Do not change integrations.",
      "Mark missing or uncertain information clearly.",
      "Add the checklist location in the completion notes.",
    ].join("\n"),
  },
  {
    seedKey: "harlow-assigned-2026-08-end-of-shift-summary",
    title: "End-of-Shift Summary",
    clientLabel: "Internal KXD",
    priority: "high" as const,
    estimatedMinutes: 15,
    instructions: [
      "Summarize what was completed.",
      "List anything unfinished.",
      "List questions or files needing Matt’s review.",
      "Confirm that no live website files were renamed, moved, or deleted.",
      "Move the task to Ready for Review before stopping the work timer.",
    ].join("\n"),
  },
];

function parseArgs(argv: string[]): { id?: number; email?: string } {
  let id: number | undefined;
  let email: string | undefined;
  for (const arg of argv) {
    if (arg.startsWith("--id=")) {
      id = Number(arg.slice("--id=".length));
    } else if (arg.startsWith("--email=")) {
      email = arg.slice("--email=".length).trim();
    }
  }
  return { id, email };
}

function assertLooksLikeHarlow(user: JuniorCreatorIdentity): void {
  if (user.displayName.trim() !== HARLOW_DISPLAY_NAME) {
    throw new Error(
      `Resolved junior id=${user.id} displayName="${user.displayName}" — refusing to seed because displayName is not exactly "${HARLOW_DISPLAY_NAME}".`,
    );
  }
}

async function resolveHarlow(): Promise<JuniorCreatorIdentity> {
  const { id, email } = parseArgs(process.argv.slice(2));

  if (id === undefined && !email) {
    throw new Error(
      [
        "Production-safe seed requires an explicit identity flag:",
        "  --id=<junior-creator-users id>",
        "  --email=<exact login email>",
        "Display-name-only resolution is disabled to prevent accidental seeding.",
      ].join("\n"),
    );
  }

  if (id !== undefined) {
    if (!Number.isFinite(id) || id <= 0) {
      throw new Error(`Invalid --id=${String(id)}`);
    }
    const byId = await findJuniorCreatorById(id);
    if (!byId) {
      throw new Error(`No junior-creator-users record with id=${id}.`);
    }
    assertLooksLikeHarlow(byId);
    return byId;
  }

  const byEmail = await findJuniorCreatorByEmail(email!);
  if (!byEmail) {
    throw new Error(`No junior-creator-users record with email="${email}".`);
  }
  assertLooksLikeHarlow(byEmail);
  return byEmail;
}

async function main() {
  // Warm Payload once so collection registration is loaded.
  await getPayload({ config });

  const harlow = await resolveHarlow();

  console.log(
    `Resolved Harlow → id=${harlow.id} displayName="${harlow.displayName}" email=${harlow.email}`,
  );

  let created = 0;
  let skipped = 0;

  for (const seed of SEED_TASKS) {
    const existing = await findTaskBySeedKey(seed.seedKey);
    if (existing) {
      if (existing.juniorCreatorUserId !== harlow.id) {
        console.error(
          `Seed key ${seed.seedKey} exists but is assigned to junior id ${existing.juniorCreatorUserId}, not Harlow (${harlow.id}). Aborting.`,
        );
        process.exit(1);
      }
      console.log(`  skip (exists): ${seed.title}`);
      skipped += 1;
      continue;
    }

    await createJuniorTask({
      title: seed.title,
      instructions: seed.instructions,
      clientLabel: seed.clientLabel,
      juniorCreatorUserId: harlow.id,
      priority: seed.priority,
      estimatedMinutes: seed.estimatedMinutes,
      seedKey: seed.seedKey,
      status: "assigned",
    });
    console.log(`  created: ${seed.title}`);
    created += 1;
  }

  console.log(`\nDone. created=${created} skipped=${skipped}`);
  console.log("Sasha and other juniors were not modified.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
