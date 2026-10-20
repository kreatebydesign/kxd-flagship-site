/**
 * End-to-end Staff Time QA against the isolated preview-kxd-os database.
 * Exercises the same service layer as Preview UI/API routes (no SSO bypass).
 *
 *   DATABASE_URI=...preview-kxd-os... npx tsx scripts/verify-preview-staff-time-qa.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { getPayload } from "payload";
import config from "../payload.config.ts";
import { actorHasStaffCapability } from "../lib/staff/permissions.ts";
import { staffActorFromUser } from "../lib/staff/actor.ts";
import {
  endStaffShift,
  findActiveStaffShift,
  listStaffShiftHistory,
  loadStaffTimeOversightActiveShifts,
  startStaffShift,
} from "../lib/staff-time/shifts.ts";
import { parseStaffWorkIntent } from "../lib/staff-time/intent.ts";
import { loadStaffTimeClockPage } from "../lib/staff-time/load.ts";
import {
  assertPreviewKxdOsDatabaseReadOnly,
  PREVIEW_QA_EMAIL_DOMAIN,
} from "./lib/preview-kxd-os-db.ts";

const BDS_EMAIL = `preview-qa-bds@${PREVIEW_QA_EMAIL_DOMAIN}`;
const OPERATOR_EMAIL = `preview-qa-operator@${PREVIEW_QA_EMAIL_DOMAIN}`;
const OTHER_BDS_EMAIL = `preview-qa-bds-other@${PREVIEW_QA_EMAIL_DOMAIN}`;

async function loadActorByEmail(
  payload: Awaited<ReturnType<typeof getPayload>>,
  email: string,
) {
  const found = await payload.find({
    collection: "users",
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const doc = found.docs[0];
  assert.ok(doc, `Missing preview QA user ${email}. Run seed-preview-staff-time-qa.ts first.`);
  const actor = staffActorFromUser(doc);
  assert.ok(actor);
  return { doc, actor };
}

async function main(): Promise<void> {
  assertPreviewKxdOsDatabaseReadOnly();
  const payload = await getPayload({ config });

  const { actor: bds, doc: bdsDoc } = await loadActorByEmail(payload, BDS_EMAIL);
  const { actor: operator } = await loadActorByEmail(payload, OPERATOR_EMAIL);

  assert.ok(actorHasStaffCapability(bds, "staff.time.clock"));
  assert.ok(!actorHasStaffCapability(bds, "admin.time.oversight.read"));
  assert.ok(actorHasStaffCapability(operator, "admin.time.oversight.read"));

  const workTimezone = "America/Los_Angeles";

  assert.throws(
    () => parseStaffWorkIntent({}),
    /WORK_INTENT/,
    "BDS cannot start without work intent",
  );

  const started = await startStaffShift({
    actor: bds,
    user: bdsDoc,
    workTimezone,
    workIntent: {
      category: "internal_operations",
      workId: null,
      clientId: null,
      note: "Preview QA",
    },
    idempotencyKey: `qa-start-${Date.now()}`,
  });
  assert.equal(started.status, "active");

  const afterRefresh = await loadStaffTimeClockPage(bds);
  assert.ok(afterRefresh.activeShift, "Active shift persists after reload");
  assert.equal(afterRefresh.activeShift?.id, started.id);

  await assert.rejects(
    () =>
      startStaffShift({
        actor: bds,
        user: bdsDoc,
        workTimezone,
        workIntent: {
          category: "internal_operations",
          workId: null,
          clientId: null,
          note: null,
        },
        idempotencyKey: `qa-dup-${Date.now()}`,
      }),
    /ACTIVE_SHIFT_EXISTS/,
    "Duplicate active shift blocked",
  );

  const oversightWhileActive = await loadStaffTimeOversightActiveShifts();
  assert.ok(
    oversightWhileActive.some((row) => row.staffUserId === bds.userId),
    "Operator oversight lists active QA BDS shift",
  );

  const ended = await endStaffShift({
    actor: bds,
    idempotencyKey: `qa-end-${Date.now()}`,
  });
  assert.equal(ended.status, "completed");

  const history = await listStaffShiftHistory(bds.userId, 10);
  assert.ok(history.some((h) => h.id === ended.id), "Completed shift in history");

  const activeAfterEnd = await findActiveStaffShift(bds.userId);
  assert.equal(activeAfterEnd, null);

  const { actor: otherActor } = await loadActorByEmail(payload, OTHER_BDS_EMAIL);
  assert.ok(otherActor);
  const otherHistory = await listStaffShiftHistory(otherActor.userId, 20);
  assert.ok(
    !otherHistory.some((h) => h.id === ended.id),
    "Other BDS cannot see peer shift history via self scope",
  );

  assert.ok(
    !actorHasStaffCapability(bds, "admin.time.oversight.read"),
    "BDS lacks operator oversight capability",
  );

  const tyler = await payload.find({
    collection: "users",
    where: { email: { equals: "tyler@kreatebydesign.com" } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (tyler.docs[0]) {
    const tylerShifts = await payload.find({
      collection: "staff-time-shifts",
      where: { staffUser: { equals: tyler.docs[0].id } },
      limit: 20,
      depth: 0,
      overrideAccess: true,
    });
    const october2026Imported = tylerShifts.docs.some((s) => {
      const startedAt = String((s as { startedAt?: string }).startedAt ?? "");
      return startedAt.startsWith("2026-10");
    });
    assert.equal(
      october2026Imported,
      false,
      "Tyler October 2026 hours must not be imported on preview",
    );
  }

  const credPath = process.env.KXD_PREVIEW_QA_CREDENTIALS_PATH?.trim();
  if (credPath && fs.existsSync(credPath)) {
    // eslint-disable-next-line no-console
    console.log(`[KXD] QA credentials on disk for manual SSO UI login: ${credPath}`);
  }

  console.log("verify-preview-staff-time-qa: OK");
  await payload.destroy?.();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
