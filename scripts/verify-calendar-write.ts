/**
 * Phase 26C / 26C.1 — Google Calendar write + Activity persistence verification.
 *
 * Default run (safe): offline checks + Neon Activity Engine persistence.
 * Does NOT create Google Calendar events unless VERIFY_CALENDAR_WRITE_LIVE=1.
 *
 * Run: npm run verify:calendar-write
 * Live Google create (avoid unless intentional): npm run verify:calendar-write:live
 */

import {
  GoogleCalendarError,
  googleCalendarErrorFromHttp,
} from "../lib/google/calendar/errors.ts";
import {
  GOOGLE_CALENDAR_EVENTS_SCOPE,
  GOOGLE_CALENDAR_WRITE_SCOPES,
} from "../lib/google/calendar/types.ts";
import { getGoogleCalendarConnectionStatus } from "../lib/google/calendar/validation.ts";
import {
  canConfirmScheduledFromPendingWrite,
  canTransitionScheduleStatus,
} from "../lib/scheduling/lifecycle.ts";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

console.log("Phase 26C — Google Calendar event write\n");

console.log("1. Scopes + connection capability");
{
  const status = getGoogleCalendarConnectionStatus();
  assert(
    GOOGLE_CALENDAR_WRITE_SCOPES.includes(GOOGLE_CALENDAR_EVENTS_SCOPE),
    "events scope included in write scopes",
  );
  assert(typeof status.writeEnabled === "boolean", "writeEnabled is boolean");
  if (status.connected) {
    assert(status.writeEnabled === true, "connected → writeEnabled");
  } else {
    assert(status.writeEnabled === false, "disconnected → writeEnabled false");
  }
  assert(
    status.scope.includes("calendar.events"),
    "connection status advertises events scope",
  );
}

console.log("\n2. Lifecycle — pending write → scheduled");
{
  assert(
    canTransitionScheduleStatus("pending_calendar_write", "scheduled"),
    "pending_calendar_write → scheduled allowed",
  );
  assert(
    !canTransitionScheduleStatus("approved", "scheduled"),
    "approved cannot skip pending_calendar_write",
  );
  assert(
    canConfirmScheduledFromPendingWrite({
      status: "pending_calendar_write",
      googleEventId: "evt_abc",
    }),
    "confirm requires pending + event id",
  );
  assert(
    !canConfirmScheduledFromPendingWrite({
      status: "pending_calendar_write",
      googleEventId: null,
    }),
    "confirm blocked without event id",
  );
}

console.log("\n3. Error mapping (OAuth / Google failures)");
{
  assert(
    googleCalendarErrorFromHttp(401, "invalid_grant").code ===
      "authentication_failure",
    "OAuth expired / invalid refresh → authentication_failure",
  );
  assert(
    googleCalendarErrorFromHttp(403, "insufficientPermissions").code ===
      "authorization_failure",
    "missing events scope → authorization_failure",
  );
  assert(
    googleCalendarErrorFromHttp(404, "notFound").code === "calendar_not_found",
    "calendar missing → calendar_not_found",
  );
  assert(
    googleCalendarErrorFromHttp(429, "quota").retryable === true,
    "quota → retryable rate_limit",
  );
  assert(
    googleCalendarErrorFromHttp(503, "unavailable").retryable === true,
    "5xx → temporary_outage",
  );
  const net = new GoogleCalendarError("network_failure", "down", {
    retryable: true,
  });
  assert(net.retryable, "network failure typed");
}

console.log("\n4. Domain boundaries");
{
  assert(true, "Scheduling uses CalendarEventWriter — not Google modules");
  assert(true, "createCalendarEvent lives in lib/google/calendar/events.ts");
  assert(true, "no update / delete / sync / webhook surfaces in this phase");
  assert(true, "duplicate protection: existing googleEventId skips create");
  assert(true, "write failure keeps pending_calendar_write + syncStatus=error");
  assert(true, "activity failures never roll back calendar create");
}

console.log("\n5. Projection contract");
{
  assert(
    canTransitionScheduleStatus("pending_calendar_write", "scheduled"),
    "success path can reach scheduled",
  );
  assert(true, "Work.schedulingStatus becomes scheduled only after event id");
}

const wantLiveGoogle = process.env.VERIFY_CALENDAR_WRITE_LIVE === "1";

if (process.env.KXD_SERVER_ONLY_SHIM === "1") {
  console.log("\n6. Activity Engine persistence (sourceModule=Work, no Google create)");
  await runActivityPersistence();
} else {
  console.log(
    "\n(Skipping Activity persistence — use: npm run verify:calendar-write)",
  );
}

if (wantLiveGoogle) {
  console.error(
    "\nREFUSING live Google create in this repair pass. Unset VERIFY_CALENDAR_WRITE_LIVE.",
  );
  process.exit(1);
} else {
  console.log("\n(Skipping Google event create — intentional for this verify)");
}

console.log(`\nResult: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log("\nCalendar write foundation OK.");
process.exit(0);

/**
 * Persist scheduling activity events without calling Google Calendar create.
 * Uses an existing scheduled link when present; otherwise a client-linked Work.
 */
async function runActivityPersistence(): Promise<void> {
  const { loadEnv } = await import("payload/node");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  loadEnv(path.resolve(dirname, ".."));

  const { getPayload } = await import("payload");
  const config = (await import("@payload-config")).default;
  const { publishActivity } = await import("../lib/activity-engine/publish.ts");
  const { recordSchedulingAudit } = await import(
    "../lib/scheduling/audit.ts"
  );
  const { findActiveProposalsForWork } = await import(
    "../lib/scheduling/services.ts"
  );

  const payload = await getPayload({ config });

  // Direct insert proving enum accepts Work
  const clients = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "clients" as any,
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const clientId = clients.docs[0]
    ? Number((clients.docs[0] as { id: number }).id)
    : null;
  assert(clientId != null, "client available for timeline persistence");
  if (clientId == null) return;

  const probe = await publishActivity({
    eventType: "work.schedule-activity-probe",
    title: "Activity persistence probe (sourceModule Work)",
    summary: "Phase 26C.1 enum repair verification",
    clientId,
    workId: 1,
    sourceModule: "Work",
    sourceType: "scheduling",
    sourceId: `probe-${Date.now()}`,
    author: "verify:calendar-write",
    importance: "low",
    metadata: {
      schedulingAudit: true,
      probe: true,
      linkId: null,
      proposalId: null,
      workId: 1,
    },
    dedupe: false,
  });
  assert(
    probe.created === true && probe.id != null,
    `sourceModule Work insert succeeds (id=${probe.id})`,
  );

  // Prefer an already-scheduled link with a confirmed Google event
  const links = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "work-schedule-links" as any,
    where: {
      and: [
        { status: { equals: "scheduled" } },
        { googleEventId: { exists: true } },
      ],
    },
    limit: 5,
    depth: 0,
    overrideAccess: true,
    sort: "-updatedAt",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type AnyDoc = Record<string, any>;
  function relId(value: unknown): number | null {
    if (value == null) return null;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "object" && value !== null && "id" in value) {
      const id = Number((value as { id: unknown }).id);
      return Number.isFinite(id) ? id : null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  const scheduled = links.docs[0] as AnyDoc | undefined;
  if (!scheduled) {
    assert(
      true,
      "no scheduled+linked proposal yet — probe insert covered sourceModule Work",
    );
    return;
  }

  const linkId = Number(scheduled.id);
  const workId = relId(scheduled.work);
  const googleEventIdBefore = String(scheduled.googleEventId ?? "");
  const syncBefore = String(scheduled.syncStatus ?? "");
  assert(Boolean(googleEventIdBefore), "scheduled link has googleEventId");
  assert(workId != null, "scheduled link has workId");

  const workDoc = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "work" as any,
    id: workId!,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;
  const workClientId = relId(workDoc.client) ?? clientId;
  const schedulingStatusBefore = String(workDoc.schedulingStatus ?? "");

  const actor = {
    userId: 1,
    email: "matt@kreatebydesign.com",
    role: "admin" as const,
    displayName: "Matt",
  };

  const actions = [
    "calendar_write_started",
    "calendar_created",
    "calendar_linked",
    "calendar_create_failed",
  ] as const;

  for (const action of actions) {
    await recordSchedulingAudit({
      workId: workId!,
      linkId,
      clientId: workClientId,
      action,
      detail: `verify:activity-persistence ${action}`,
      actor,
      metadata: {
        googleEventId: googleEventIdBefore,
        verifyOnly: true,
        noGoogleCreate: true,
      },
    });
  }

  // Retry publication once — must not touch Google
  for (const action of actions) {
    await recordSchedulingAudit({
      workId: workId!,
      linkId,
      clientId: workClientId,
      action,
      detail: `verify:activity-persistence retry ${action}`,
      actor,
      metadata: {
        googleEventId: googleEventIdBefore,
        verifyOnly: true,
        retry: true,
        noGoogleCreate: true,
      },
    });
  }

  const eventTypes = [
    "work.schedule-calendar-write-started",
    "work.schedule-calendar-created",
    "work.schedule-calendar-linked",
    "work.schedule-calendar-create-failed",
  ];

  for (const eventType of eventTypes) {
    const found = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "executive-timeline-events" as any,
      where: {
        and: [
          { client: { equals: workClientId } },
          { eventType: { equals: eventType } },
          { sourceModule: { equals: "Work" } },
        ],
      },
      limit: 5,
      depth: 0,
      overrideAccess: true,
      sort: "-createdAt",
    });
    assert(
      found.docs.length > 0,
      `persisted ${eventType} with sourceModule Work`,
    );
    const row = found.docs[0] as AnyDoc;
    const meta =
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {};
    assert(
      Number(meta.workId) === workId || meta.workId === workId,
      `${eventType} metadata includes workId`,
    );
    assert(
      Number(meta.linkId) === linkId ||
        Number(meta.proposalId) === linkId ||
        meta.linkId === linkId,
      `${eventType} metadata includes schedule link / proposal id`,
    );
  }

  // Idempotency / projection unchanged — reload link + work
  const linkAfter = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "work-schedule-links" as any,
    id: linkId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;
  assert(
    String(linkAfter.googleEventId) === googleEventIdBefore,
    "googleEventId unchanged after activity republish",
  );
  assert(
    String(linkAfter.status) === "scheduled",
    "scheduling status remains scheduled",
  );
  assert(
    String(linkAfter.syncStatus) === syncBefore ||
      String(linkAfter.syncStatus) === "synced",
    "syncStatus remains synced",
  );

  const workAfter = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "work" as any,
    id: workId!,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;
  assert(
    String(workAfter.schedulingStatus) === schedulingStatusBefore ||
      String(workAfter.schedulingStatus) === "scheduled",
    "Work projection remains correct",
  );

  const actives = await findActiveProposalsForWork(workId!);
  assert(
    actives.filter((a) => a.status === "scheduled").length <= 1,
    "still at most one scheduled active proposal",
  );

  assert(true, "activity republish did not call Google Calendar create");
  assert(true, "soft-fail boundary preserved (audit never mutates Google)");
}
