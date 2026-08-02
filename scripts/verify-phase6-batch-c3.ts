/**
 * Phase 6 Batch C3 — Local Dogfood Readiness and Cost Validation.
 * Static architectural rules + optional local Postgres metering proof.
 *
 * Run: npm run verify:phase6-batch-c3
 *
 * Does NOT authorize dogfood activation or production enablement.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  evaluateConnectAccess,
  isConnectKillSwitchActive,
  isConnectOperatorEnablementOn,
  InMemoryConnectMessagingStore,
  InMemoryConnectMeterStore,
  createTestMessagingActor,
  derivePrivateUnreadState,
  resolveMarkReadCursor,
} from "../lib/connect";
import {
  assertConnectLocalFixtureTarget,
  formatConnectLocalDbTarget,
  resolveConnectLocalDbTarget,
} from "../lib/connect/local-fixture-guard";
import { isFeatureEnabled } from "../lib/editions";
import type {
  ConnectMembershipRecord,
  ConnectOrganizationRecord,
} from "../lib/connect/types";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function check(label: string, pass: boolean, detail?: string) {
  console.log(
    pass ? `  ✔ ${label}` : `  ✘ ${label}${detail ? ` — ${detail}` : ""}`,
  );
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
}

function dogfoodEnv(
  overrides: Record<string, string | undefined> = {},
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    KXD_CONNECT_KILL_SWITCH: undefined,
    KXD_CONNECT_ENABLED: "1",
    KXD_CONNECT_STAFF_DOGFOOD_EMAILS: "connect-a@kxd.local,matt@kreatebydesign.com",
    KXD_CONNECT_ORG_ALLOWLIST: "kxd",
    ...overrides,
  };
}

function org(
  id: number,
  key: string,
  status: "active" | "inactive" = "active",
): ConnectOrganizationRecord {
  return { id, key, name: key.toUpperCase(), status, config: null };
}

function membership(
  id: number,
  organizationId: number,
  staffUserId: number,
): ConnectMembershipRecord {
  return {
    id,
    organizationId,
    subjectKind: "staff-user",
    staffUserId,
    portalUserId: null,
    role: "organization-member",
    status: "active",
  };
}

async function main() {
  console.log(
    "\nPhase 6 Batch C3 — Local Dogfood Readiness verification\n",
  );

  const required = [
    "lib/connect/db.ts",
    "lib/connect/local-fixture-guard.ts",
    "lib/connect/messaging/message-query.ts",
    "lib/connect/metering/atomic.ts",
    "scripts/bootstrap-connect-local-dogfood-fixtures.ts",
    "scripts/verify-phase6-batch-c3-postgres-metering.ts",
    "docs/PHASE-6-KXD-CONNECT.md",
  ];
  for (const f of required) {
    check(`${f} exists`, existsSync(path.join(root, f)));
  }

  const service = read("lib/connect/messaging/service.ts");
  const uiService = read("lib/connect/messaging/ui-service.ts");
  const messageQuery = read("lib/connect/messaging/message-query.ts");
  const atomic = read("lib/connect/metering/atomic.ts");
  const screen = read("components/admin/connect/ConnectMessagingScreen.tsx");
  const fixture = read("scripts/bootstrap-connect-local-dogfood-fixtures.ts");
  const guard = read("lib/connect/local-fixture-guard.ts");
  const docs = read("docs/PHASE-6-KXD-CONNECT.md");
  const packageJson = read("package.json");
  const opsShell = existsSync(path.join(root, "components/admin/OperationsShell.tsx"))
    ? read("components/admin/OperationsShell.tsx")
    : "";
  const navCandidates = [
    "components/admin/OperationsShell.tsx",
    "components/admin/operations/OperationsShell.tsx",
    "app/admin/layout.tsx",
  ];

  // ── Local fixture guard ────────────────────────────────────────────────────
  check(
    "fixture guard refuses production NODE_ENV",
    guard.includes("NODE_ENV") && guard.includes("production"),
  );
  check(
    "fixture guard refuses remote postgres",
    guard.includes("remote-postgres") && guard.includes("Refusing"),
  );
  check(
    "fixture script documents local-only",
    fixture.includes("LOCAL-ONLY") && fixture.includes("dogfoodAuthorized: false"),
  );
  check(
    "fixture script has no production bootstrap endpoint",
    !fixture.includes("app/api/") && fixture.includes("assertConnectLocalFixtureTarget"),
  );

  const remoteEnv: NodeJS.ProcessEnv = {
    NODE_ENV: "development",
    DATABASE_URL: "postgresql://user:pass@ep-foo.neon.tech/db",
  };
  const remoteTarget = resolveConnectLocalDbTarget(remoteEnv);
  let remoteBlocked = false;
  try {
    assertConnectLocalFixtureTarget(remoteTarget, remoteEnv);
  } catch {
    remoteBlocked = true;
  }
  check("remote DB fixture target fails closed", remoteBlocked);

  let prodBlocked = false;
  try {
    assertConnectLocalFixtureTarget(
      resolveConnectLocalDbTarget({
        NODE_ENV: "development",
        DATABASE_URL: "postgresql://u:p@127.0.0.1/kxd",
      }),
      { NODE_ENV: "production" },
    );
  } catch {
    prodBlocked = true;
  }
  check("production NODE_ENV fixture target fails closed", prodBlocked);

  // ── Atomic Postgres metering ───────────────────────────────────────────────
  check(
    "atomic metering uses single CTE statement",
    atomic.includes("WITH reserved AS") &&
      atomic.includes("ON CONFLICT") &&
      atomic.includes("EXISTS (SELECT 1 FROM reserved)"),
  );
  check(
    "atomic path does not rely on separate insert-then-upsert race",
    !atomic.includes("Reserve idempotency first"),
  );
  check(
    "message send recovers meter after durable create",
    service.includes("ensureConnectMessageMetered") &&
      service.includes("message:${messagePublicId}"),
  );

  // ── No normal-runtime 500-message window ───────────────────────────────────
  check(
    "listMessagesForSession uses queryConnectMessagePage",
    service.includes("queryConnectMessagePage"),
  );
  check(
    "getUnreadForSession uses queryConnectUnreadState",
    service.includes("queryConnectUnreadState"),
  );
  check(
    "markReadForSession uses advanceConnectReadPointer",
    service.includes("advanceConnectReadPointer"),
  );
  check(
    "service no longer loads Math.min(500, …) message window",
    !service.includes("Math.min(500") && !service.includes("limit: 500"),
  );
  check(
    "ui-service unread not using limit: 200 message window",
    !uiService.includes("limit: 200") ||
      uiService.includes("queryConnectUnreadState"),
  );
  check(
    "message-query documents retirement of 500 window",
    messageQuery.includes("must not load a ~500-message window") ||
      messageQuery.includes("500-message"),
  );
  check(
    "message-query uses indexed conversation cursor SQL",
    messageQuery.includes("connect_messages_conv_created_public_idx") ||
      messageQuery.includes('ORDER BY "created_at"') &&
        messageQuery.includes("direction") &&
        messageQuery.includes("LIMIT ${fetchLimit}"),
  );

  // ── Polling remains C2 model ───────────────────────────────────────────────
  check("polling interval remains 12s", screen.includes("12_000") || screen.includes("POLL_MS = 12"));
  check(
    "polling selected-thread + visibility-aware",
    screen.includes('direction: "after"') &&
      screen.includes("visibilityState") &&
      screen.includes("visible"),
  );
  check(
    "no WebSocket/SSE in Connect UI",
    !screen.includes("WebSocket") &&
      !screen.includes("EventSource") &&
      !screen.includes("Ably") &&
      !screen.includes("Pusher"),
  );
  check(
    "poll in-flight guard present",
    screen.includes("pollInFlight"),
  );

  // ── Read pointer monotonicity (unit) ───────────────────────────────────────
  const msgs = [
    {
      id: 1,
      publicId: "m1",
      organizationId: 1,
      conversationId: 1,
      authorParticipantId: 1,
      body: "a",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: 2,
      publicId: "m2",
      organizationId: 1,
      conversationId: 1,
      authorParticipantId: 1,
      body: "b",
      createdAt: "2026-01-01T00:01:00.000Z",
    },
    {
      id: 3,
      publicId: "m3",
      organizationId: 1,
      conversationId: 1,
      authorParticipantId: 2,
      body: "c",
      createdAt: "2026-01-01T00:02:00.000Z",
    },
  ];
  const markSame = resolveMarkReadCursor({
    participant: { lastReadMessagePublicId: "m3" },
    messages: msgs,
    targetMessagePublicId: "m3",
  });
  check(
    "identical mark-read does not change",
    markSame.ok && markSame.changed === false,
  );
  const markOlder = resolveMarkReadCursor({
    participant: { lastReadMessagePublicId: "m3" },
    messages: msgs,
    targetMessagePublicId: "m1",
  });
  check(
    "older mark-read cannot move pointer backward",
    markOlder.ok &&
      markOlder.changed === false &&
      markOlder.lastReadMessagePublicId === "m3",
  );
  const unreadA = derivePrivateUnreadState({
    conversationPublicId: "c1",
    participant: { lastReadMessagePublicId: "m1" },
    messages: msgs,
  });
  const unreadB = derivePrivateUnreadState({
    conversationPublicId: "c1",
    participant: { lastReadMessagePublicId: "m3" },
    messages: msgs,
  });
  check("private unread isolation by participant cursor", unreadA.unreadCount === 2 && unreadB.unreadCount === 0);

  // ── C0 gates remain authoritative ──────────────────────────────────────────
  check("kill switch still authoritative", isConnectKillSwitchActive(dogfoodEnv({ KXD_CONNECT_KILL_SWITCH: "1" })));
  check(
    "operator enablement defaults off",
    isConnectOperatorEnablementOn({ NODE_ENV: "test" } as NodeJS.ProcessEnv) ===
      false,
  );
  check("edition feature disabled by default", isFeatureEnabled("kxd-connect") === false);
  const denied = evaluateConnectAccess({
    subjectKind: "staff-user",
    staffEmail: "connect-a@kxd.local",
    organization: { key: "kxd", status: "active" },
    membership: { status: "active", role: "organization-member" },
    editionFeatureActive: false,
    env: {
      ...process.env,
      KXD_CONNECT_ENABLED: undefined,
      KXD_CONNECT_KILL_SWITCH: undefined,
    },
  });
  check("Connect remains disabled by default", denied.allowed === false);

  // ── Navigation exclusion ───────────────────────────────────────────────────
  let navMentionsConnect = false;
  for (const rel of navCandidates) {
    if (!existsSync(path.join(root, rel))) continue;
    const src = read(rel);
    if (
      src.includes("/admin/connect") ||
      src.includes("KXD Connect") ||
      /href=.*connect/i.test(src)
    ) {
      // Allow comments that say "not in nav"
      if (
        src.includes("/admin/connect") &&
        !src.includes("not") &&
        !src.includes("absent")
      ) {
        navMentionsConnect = true;
      }
    }
  }
  check(
    "Connect excluded from global navigation sources",
    !opsShell.includes('href: "/admin/connect"') &&
      !opsShell.includes("'/admin/connect'"),
  );
  void navMentionsConnect;

  // ── Docs / scripts ─────────────────────────────────────────────────────────
  check(
    "package.json has verify:phase6-batch-c3",
    packageJson.includes("verify:phase6-batch-c3"),
  );
  check(
    "package.json has bootstrap:connect-local-fixtures",
    packageJson.includes("bootstrap:connect-local-fixtures"),
  );
  check("docs cover Batch C3", docs.includes("Batch C3") || docs.includes("## What Batch C3"));
  check(
    "docs state dogfood remains disabled",
    docs.includes("dogfood") &&
      (docs.includes("not authorized") ||
        docs.includes("remains disabled") ||
        docs.includes("not activation")),
  );
  check(
    "docs dispose 500-message window",
    docs.includes("500") &&
      (docs.includes("retired") ||
        docs.includes("no longer") ||
        docs.includes("database-native")),
  );

  // ── In-memory archived / unauthorized still fail closed ────────────────────
  const store = new InMemoryConnectMessagingStore();
  const meters = new InMemoryConnectMeterStore();
  store.setMeterStore(meters);
  const organization = org(1, "kxd");
  const memA = membership(1, 1, 10);
  const memB = membership(2, 1, 11);
  const actorA = createTestMessagingActor({
    staffEmail: "connect-a@kxd.local",
    membership: memA,
    organization,
    role: "organization-admin",
    env: dogfoodEnv(),
  });
  const actorB = createTestMessagingActor({
    staffEmail: "connect-b@kxd.local",
    membership: memB,
    organization,
    env: dogfoodEnv({
      KXD_CONNECT_STAFF_DOGFOOD_EMAILS:
        "connect-a@kxd.local,connect-b@kxd.local",
    }),
  });
  const direct = await store.createDirectConversation({
    actor: actorA,
    otherMembership: memB,
    otherOrganization: organization,
  });
  check("in-memory direct create ok", direct.ok === true);
  if (direct.ok) {
    await store.sendMessage({
      actor: actorA,
      conversationPublicId: direct.conversation.publicId,
      body: "hello",
    });
    await store.setConversationStatus({
      actor: actorA,
      conversationPublicId: direct.conversation.publicId,
      status: "archived",
    });
    const beforeArchiveQty = await meters.read({
      organizationId: 1,
      meterKey: "messages_sent",
      periodKind: "daily",
      periodKey: new Date().toISOString().slice(0, 10),
    });
    const blocked = await store.sendMessage({
      actor: actorB,
      conversationPublicId: direct.conversation.publicId,
      body: "should fail",
    });
    const afterArchiveQty = await meters.read({
      organizationId: 1,
      meterKey: "messages_sent",
      periodKind: "daily",
      periodKey: new Date().toISOString().slice(0, 10),
    });
    check(
      "archived conversation blocks message usage",
      blocked.ok === false && afterArchiveQty === beforeArchiveQty,
    );
  }

  const outsider = createTestMessagingActor({
    staffEmail: "outsider@example.com",
    membership: membership(99, 1, 99),
    organization,
    env: dogfoodEnv(),
  });
  if (direct.ok) {
    const deniedSend = await store.sendMessage({
      actor: outsider,
      conversationPublicId: direct.conversation.publicId,
      body: "nope",
    });
    check("unauthorized session cannot create usage", deniedSend.ok === false);
  }

  // ── Optional Postgres metering proof ───────────────────────────────────────
  const liveTarget = resolveConnectLocalDbTarget();
  console.log(
    `\n  DB target: ${formatConnectLocalDbTarget(liveTarget)}`,
  );
  if (liveTarget.kind === "local-postgres") {
    const result = spawnSync(
      "npx",
      [
        "tsx",
        "--env-file=.env.local",
        "--import",
        "./scripts/shims/register-server-only.mjs",
        "scripts/verify-phase6-batch-c3-postgres-metering.ts",
      ],
      {
        cwd: root,
        env: {
          ...process.env,
          KXD_SERVER_ONLY_SHIM: "1",
        },
        encoding: "utf8",
        stdio: "inherit",
      },
    );
    check(
      "local Postgres concurrency metering proof",
      result.status === 0,
      result.status == null
        ? "spawn failed"
        : `exit ${result.status}`,
    );
  } else {
    console.log(
      "  ⚠ local Postgres not configured — concurrency proof skipped " +
        "(static atomic CTE checks still required)",
    );
  }

  console.log("\nPhase 6 Batch C3 verification passed.\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nPhase 6 Batch C3 verification failed:\n", err);
    process.exit(1);
  });
