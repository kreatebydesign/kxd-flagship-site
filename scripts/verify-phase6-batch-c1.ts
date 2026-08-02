/**
 * Phase 6 Batch C1 — KXD Connect secure conversation and messaging core.
 * Static + in-memory verification. No database. No Stripe. No UI.
 *
 * Run: npm run verify:phase6-batch-c1
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  authorizeConnectMessaging,
  buildDirectConversationPairKey,
  clampConnectMessagePageSize,
  CONNECT_MESSAGE_MAX_LENGTH,
  CONNECT_MESSAGE_PAGE_SIZE_MAX,
  createTestMessagingActor,
  decodeConnectMessageCursor,
  encodeConnectMessageCursor,
  evaluateConnectAccess,
  InMemoryConnectMessagingStore,
  InMemoryConnectMeterStore,
  isClientSuppliedPairKeyAllowed,
  isConnectKillSwitchActive,
  isConnectOperatorEnablementOn,
  paginateConnectMessages,
  validateConnectMessageContent,
  assertPrivateUnreadIsolation,
  derivePrivateUnreadState,
} from "../lib/connect";
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
    KXD_CONNECT_STAFF_DOGFOOD_EMAILS: "matt@kreatebydesign.com,alex@kreatebydesign.com",
    KXD_CONNECT_ORG_ALLOWLIST: "kxd,acme",
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
  role: ConnectMembershipRecord["role"] = "organization-member",
  status: ConnectMembershipRecord["status"] = "active",
): ConnectMembershipRecord {
  return {
    id,
    organizationId,
    subjectKind: "staff-user",
    staffUserId,
    portalUserId: null,
    role,
    status,
  };
}

async function main() {
  console.log("\nPhase 6 Batch C1 — Connect messaging core verification\n");

  // ── File presence ──────────────────────────────────────────────────────────
  const required = [
    "lib/connect/messaging/content.ts",
    "lib/connect/messaging/pair-key.ts",
    "lib/connect/messaging/pagination.ts",
    "lib/connect/messaging/authorization.ts",
    "lib/connect/messaging/read-state.ts",
    "lib/connect/messaging/store.ts",
    "lib/connect/messaging/service.ts",
    "lib/connect/messaging/session.ts",
    "lib/connect/messaging/http.ts",
    "lib/connect/metering/atomic.ts",
    "lib/connect/ids.ts",
    "payload/collections/ConnectConversations.ts",
    "payload/collections/ConnectConversationParticipants.ts",
    "payload/collections/ConnectMessages.ts",
    "migrations/20260816_phase6_connect_c1_messaging.ts",
    "app/api/admin/connect/conversations/route.ts",
    "app/api/admin/connect/conversations/[publicId]/route.ts",
    "app/api/admin/connect/conversations/[publicId]/messages/route.ts",
    "app/api/admin/connect/conversations/[publicId]/read/route.ts",
    "app/api/admin/connect/conversations/[publicId]/participants/route.ts",
    "docs/PHASE-6-KXD-CONNECT.md",
  ];
  for (const f of required) {
    check(`${f} exists`, existsSync(path.join(root, f)));
  }

  const env = dogfoodEnv();
  const kxd = org(1, "kxd");
  const acme = org(2, "acme");
  const mattMem = membership(10, 1, 100, "organization-admin");
  const alexMem = membership(11, 1, 101, "organization-member");
  const chrisMem = membership(12, 1, 102, "organization-member");
  const acmeMem = membership(20, 2, 100, "organization-admin"); // same staff, other org

  const meters = new InMemoryConnectMeterStore();
  const store = new InMemoryConnectMessagingStore();
  store.setMeterStore(meters);

  const matt = createTestMessagingActor({
    organization: kxd,
    membership: mattMem,
    staffEmail: "matt@kreatebydesign.com",
    env,
  });
  const alex = createTestMessagingActor({
    organization: kxd,
    membership: alexMem,
    staffEmail: "alex@kreatebydesign.com",
    env,
  });
  const chris = createTestMessagingActor({
    organization: kxd,
    membership: chrisMem,
    staffEmail: "alex@kreatebydesign.com",
    env,
  });
  const acmeMatt = createTestMessagingActor({
    organization: acme,
    membership: acmeMem,
    staffEmail: "matt@kreatebydesign.com",
    env,
  });

  // ── 1–2 Organization-owned conversations / messages ────────────────────────
  const direct = await store.createDirectConversation({
    actor: matt,
    otherMembership: alexMem,
    otherOrganization: kxd,
  });
  check("organization-owned conversations", direct.ok === true && direct.ok && direct.conversation.organizationId === 1);
  assert.ok(direct.ok);
  const sent = await store.sendMessage({
    actor: matt,
    conversationPublicId: direct.conversation.publicId,
    body: "Hello from C1",
  });
  check("organization-owned messages", sent.ok === true && sent.ok && sent.message.organizationId === 1);

  // ── 3–4 Cross-organization isolation ───────────────────────────────────────
  const acmeDirect = await store.createDirectConversation({
    actor: acmeMatt,
    otherMembership: membership(21, 2, 201),
    otherOrganization: acme,
  });
  assert.ok(acmeDirect.ok);
  await store.sendMessage({
    actor: acmeMatt,
    conversationPublicId: acmeDirect.conversation.publicId,
    body: "Acme only",
  });
  const kxdList = store.listConversations(matt);
  assert.ok(kxdList.ok);
  check(
    "cross-organization conversation isolation",
    kxdList.conversations.every((c) => c.organizationId === 1) &&
      !kxdList.conversations.some(
        (c) => c.publicId === acmeDirect.conversation.publicId,
      ),
  );
  check(
    "cross-organization message isolation",
    store.messagesForOrg(1).every((m) => m.organizationId === 1) &&
      store.messagesForOrg(2).every((m) => m.organizationId === 2),
  );

  // ── 5–6 Unauthorized discovery ─────────────────────────────────────────────
  const sneak = store.getConversation(alex, acmeDirect.conversation.publicId);
  check("unauthorized conversation discovery denied", sneak.ok === false);
  const sneakMsg = store.listMessages({
    actor: alex,
    conversationPublicId: acmeDirect.conversation.publicId,
  });
  check("unauthorized message discovery denied", sneakMsg.ok === false);

  // ── 7–8 Direct pair uniqueness + concurrency ───────────────────────────────
  const keyAB = buildDirectConversationPairKey({
    organizationId: 1,
    participantA: { membershipId: 10, staffUserId: 100 },
    participantB: { membershipId: 11, staffUserId: 101 },
  });
  const keyBA = buildDirectConversationPairKey({
    organizationId: 1,
    participantA: { membershipId: 11, staffUserId: 101 },
    participantB: { membershipId: 10, staffUserId: 100 },
  });
  check("direct A→B and B→A same pair key", keyAB != null && keyAB === keyBA);
  check("client-supplied pair keys rejected", isClientSuppliedPairKeyAllowed() === false);

  const reverse = await store.createDirectConversation({
    actor: alex,
    otherMembership: mattMem,
    otherOrganization: kxd,
  });
  check(
    "direct-conversation pair uniqueness",
    reverse.ok === true &&
      reverse.ok &&
      reverse.created === false &&
      reverse.conversation.publicId === direct.conversation.publicId,
  );

  const concurrentStore = new InMemoryConnectMessagingStore();
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      concurrentStore.createDirectConversation({
        actor: matt,
        otherMembership: alexMem,
        otherOrganization: kxd,
      }),
    ),
  );
  const createdCount = results.filter((r) => r.ok && r.created).length;
  const publicIds = new Set(
    results.filter((r) => r.ok).map((r) => (r as { conversation: { publicId: string } }).conversation.publicId),
  );
  check("concurrent direct-conversation creation", createdCount === 1 && publicIds.size === 1);

  const otherOrgPair = buildDirectConversationPairKey({
    organizationId: 2,
    participantA: { membershipId: 20, staffUserId: 100 },
    participantB: { membershipId: 21, staffUserId: 201 },
  });
  check(
    "same pair may differ across organizations",
    keyAB != null &&
      otherOrgPair != null &&
      keyAB !== otherOrgPair,
  );

  // ── 9–10 Group validation + duplicate participation ────────────────────────
  const group = await store.createGroupConversation({
    actor: matt,
    memberMemberships: [alexMem],
    title: "Ops",
  });
  check("group participant validation (≥2)", group.ok === true);
  const solo = await store.createGroupConversation({
    actor: matt,
    memberMemberships: [],
    title: "Solo",
  });
  check("group rejects single participant", solo.ok === false);

  assert.ok(group.ok);
  const dup = await store.addParticipant({
    actor: matt,
    conversationPublicId: group.conversation.publicId,
    membership: alexMem,
  });
  check("duplicate conversation participation rejected", dup.ok === false);

  const crossAdd = await store.addParticipant({
    actor: matt,
    conversationPublicId: group.conversation.publicId,
    membership: acmeMem,
  });
  check("cross-organization participant add rejected", crossAdd.ok === false);

  // ── 11 Portal identity denial ──────────────────────────────────────────────
  const portalAuth = authorizeConnectMessaging({
    subjectKind: "portal-user",
    staffEmail: "client@example.com",
    staffUserId: 1,
    organization: kxd,
    membership: {
      id: mattMem.id,
      organizationId: mattMem.organizationId,
      subjectKind: "portal-user",
      staffUserId: null,
      role: mattMem.role,
      status: mattMem.status,
    },
    operation: "list_conversations",
    editionFeatureActive: true,
    env,
  });
  check("portal identity denial", portalAuth.allowed === false);

  // ── 12 Author impersonation denial ─────────────────────────────────────────
  assert.ok(sent.ok);
  const impersonate = await store.sendMessage({
    actor: alex,
    conversationPublicId: direct.conversation.publicId,
    body: "Impersonation attempt",
    claimedAuthorParticipantId: 99999,
  });
  check("author impersonation denial", impersonate.ok === false);

  // ── 13–14 Inactive org / membership denial ─────────────────────────────────
  const inactiveOrgActor = createTestMessagingActor({
    organization: { ...kxd, status: "inactive" },
    membership: mattMem,
    staffEmail: "matt@kreatebydesign.com",
    env,
  });
  const inactiveOrg = store.listConversations(inactiveOrgActor);
  check("inactive organization denial", inactiveOrg.ok === false);

  const disabledMemActor = createTestMessagingActor({
    organization: kxd,
    membership: { ...mattMem, status: "disabled" },
    staffEmail: "matt@kreatebydesign.com",
    env,
  });
  const disabledMem = store.listConversations(disabledMemActor);
  check("inactive membership denial", disabledMem.ok === false);

  // ── 15–16 Kill switch + disabled-by-default ────────────────────────────────
  check("kill switch active when set", isConnectKillSwitchActive(dogfoodEnv({ KXD_CONNECT_KILL_SWITCH: "1" })) === true);
  const killed = createTestMessagingActor({
    organization: kxd,
    membership: mattMem,
    staffEmail: "matt@kreatebydesign.com",
    env: dogfoodEnv({ KXD_CONNECT_KILL_SWITCH: "1" }),
  });
  const killedList = store.listConversations(killed);
  const killedSend = await store.sendMessage({
    actor: killed,
    conversationPublicId: direct.conversation.publicId,
    body: "Should fail",
  });
  check("kill-switch denial (reads and writes)", killedList.ok === false && killedSend.ok === false);
  check(
    "operator enablement defaults off",
    isConnectOperatorEnablementOn({ NODE_ENV: "test" } as NodeJS.ProcessEnv) ===
      false,
  );
  check("edition feature kxd-connect disabled by default", isFeatureEnabled("kxd-connect") === false);
  const defaultDenied = evaluateConnectAccess({
    subjectKind: "staff-user",
    staffEmail: "matt@kreatebydesign.com",
    organization: kxd,
    membership: mattMem,
    editionFeatureActive: false,
    env: { ...process.env, KXD_CONNECT_ENABLED: undefined, KXD_CONNECT_KILL_SWITCH: undefined },
  });
  check("disabled-by-default behavior", defaultDenied.allowed === false);

  // ── 17–18 Message content validation ───────────────────────────────────────
  check("empty message rejected", validateConnectMessageContent("   ").ok === false);
  check(
    "maximum message length enforced",
    validateConnectMessageContent("x".repeat(CONNECT_MESSAGE_MAX_LENGTH + 1)).ok === false,
  );
  const validBody = validateConnectMessageContent("  hello  ");
  check(
    "valid message accepted",
    validBody.ok === true && validBody.ok && validBody.body === "hello",
  );
  const emptySend = await store.sendMessage({
    actor: matt,
    conversationPublicId: direct.conversation.publicId,
    body: "   ",
  });
  check("failed empty message not metered path", emptySend.ok === false);

  // ── 19–22 Pagination / polling / ordering / bounds ─────────────────────────
  const pageStore = new InMemoryConnectMessagingStore();
  const pageDirect = await pageStore.createDirectConversation({
    actor: matt,
    otherMembership: alexMem,
    otherOrganization: kxd,
  });
  assert.ok(pageDirect.ok);
  const createdMessages = [];
  const base = Date.parse("2026-08-01T12:00:00.000Z");
  for (let i = 0; i < 5; i++) {
    const msg = await pageStore.sendMessage({
      actor: i % 2 === 0 ? matt : alex,
      conversationPublicId: pageDirect.conversation.publicId,
      body: `msg-${i}`,
    });
    assert.ok(msg.ok);
    // Force near-equal timestamps for ordering stability.
    msg.message.createdAt = new Date(base + Math.floor(i / 2)).toISOString();
    createdMessages.push(msg.message);
  }
  // Re-sort store by rewriting createdAt already done on objects in map.
  const allPage = pageStore.listMessages({
    actor: matt,
    conversationPublicId: pageDirect.conversation.publicId,
    limit: 2,
    direction: "before",
  });
  assert.ok(allPage.ok);
  check("cursor pagination returns bounded page", allPage.page.messages.length === 2);
  check(
    "bounded page size clamp",
    clampConnectMessagePageSize(10_000) === CONNECT_MESSAGE_PAGE_SIZE_MAX,
  );

  const cursor = {
    createdAt: allPage.page.messages[allPage.page.messages.length - 1].createdAt,
    publicId: allPage.page.messages[allPage.page.messages.length - 1].publicId,
  };
  const newer = pageStore.listMessages({
    actor: matt,
    conversationPublicId: pageDirect.conversation.publicId,
    cursor,
    direction: "after",
    limit: 10,
  });
  assert.ok(newer.ok);
  check(
    "newer-than-cursor polling retrieval",
    newer.page.messages.every(
      (m) =>
        m.createdAt > cursor.createdAt ||
        (m.createdAt === cursor.createdAt && m.publicId > cursor.publicId),
    ),
  );

  const closeTs = paginateConnectMessages({
    messages: [
      {
        id: 1,
        publicId: "b",
        organizationId: 1,
        conversationId: 1,
        authorParticipantId: 1,
        body: "1",
        createdAt: "2026-08-01T12:00:00.000Z",
      },
      {
        id: 2,
        publicId: "a",
        organizationId: 1,
        conversationId: 1,
        authorParticipantId: 1,
        body: "2",
        createdAt: "2026-08-01T12:00:00.000Z",
      },
    ],
    limit: 10,
  });
  check(
    "stable ordering with close timestamps",
    closeTs.messages[0].publicId === "a" && closeTs.messages[1].publicId === "b",
  );
  const encoded = encodeConnectMessageCursor(cursor);
  check(
    "cursor encode/decode roundtrip",
    decodeConnectMessageCursor(encoded)?.publicId === cursor.publicId,
  );

  // ── 23–25 Private unread / mark-read / concurrency ─────────────────────────
  const unreadBefore = store.getUnreadState({
    actor: alex,
    conversationPublicId: direct.conversation.publicId,
  });
  assert.ok(unreadBefore.ok);
  check("private unread isolation primitive", unreadBefore.unread.unreadCount >= 1);
  check(
    "unread projection stays viewer-scoped",
    assertPrivateUnreadIsolation({
      viewerParticipantId: 1,
      projectedParticipantIds: [1],
    }) === true,
  );

  const mark1 = store.markRead({
    actor: alex,
    conversationPublicId: direct.conversation.publicId,
  });
  assert.ok(mark1.ok);
  const mark2 = store.markRead({
    actor: alex,
    conversationPublicId: direct.conversation.publicId,
  });
  assert.ok(mark2.ok);
  check("idempotent mark-read", mark1.changed === true && mark2.changed === false && mark2.unread.unreadCount === 0);

  await store.sendMessage({
    actor: matt,
    conversationPublicId: direct.conversation.publicId,
    body: "After read",
  });
  const unreadAfter = store.getUnreadState({
    actor: alex,
    conversationPublicId: direct.conversation.publicId,
  });
  assert.ok(unreadAfter.ok);
  check("new-message/unread concurrency behavior", unreadAfter.unread.unreadCount === 1);

  // Viewer B unread must not equal forcing A's cursor.
  const mattUnread = store.getUnreadState({
    actor: matt,
    conversationPublicId: direct.conversation.publicId,
  });
  assert.ok(mattUnread.ok);
  check(
    "private unread isolation across participants",
    mattUnread.unread.unreadCount !== unreadAfter.unread.unreadCount ||
      mattUnread.unread.lastReadMessagePublicId !==
        unreadAfter.unread.lastReadMessagePublicId,
  );

  // ── 26–29 Metering ─────────────────────────────────────────────────────────
  const meterBefore = await meters.read({
    organizationId: 1,
    meterKey: "messages_sent",
    periodKind: "daily",
    periodKey: new Date().toISOString().slice(0, 10),
  });
  const metered = await store.sendMessage({
    actor: matt,
    conversationPublicId: direct.conversation.publicId,
    body: "Meter me",
  });
  assert.ok(metered.ok);
  const meterAfter = await meters.read({
    organizationId: 1,
    meterKey: "messages_sent",
    periodKind: "daily",
    periodKey: new Date().toISOString().slice(0, 10),
  });
  check("successful-message metering", meterAfter === meterBefore + 1);

  const failedMeterBefore = meterAfter;
  await store.sendMessage({
    actor: matt,
    conversationPublicId: direct.conversation.publicId,
    body: "",
  });
  const failedMeterAfter = await meters.read({
    organizationId: 1,
    meterKey: "messages_sent",
    periodKind: "daily",
    periodKey: new Date().toISOString().slice(0, 10),
  });
  check("failed-message not metered", failedMeterAfter === failedMeterBefore);

  // Idempotency via stable message public id key in store path.
  const idem = await meters.increment({
    organizationId: 1,
    meterKey: "messages_sent",
    periodKind: "daily",
    periodKey: new Date().toISOString().slice(0, 10),
    delta: 1,
    idempotencyKey: `message:${metered.message.publicId}`,
  });
  check("message meter idempotency", idem.ok && idem.duplicate === true && idem.applied === false);

  const concurrentMeter = new InMemoryConnectMeterStore();
  await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      concurrentMeter.increment({
        organizationId: 1,
        meterKey: "messages_sent",
        periodKind: "daily",
        periodKey: "2026-08-01",
        delta: 1,
        idempotencyKey: `message:concurrent-${i}`,
      }),
    ),
  );
  const concurrentQty = await concurrentMeter.read({
    organizationId: 1,
    meterKey: "messages_sent",
    periodKind: "daily",
    periodKey: "2026-08-01",
  });
  check("concurrent meter behavior", concurrentQty === 10);

  const org2Qty = await meters.read({
    organizationId: 2,
    meterKey: "messages_sent",
    periodKind: "daily",
    periodKey: new Date().toISOString().slice(0, 10),
  });
  check("meter organization isolation", org2Qty >= 1 && org2Qty !== meterAfter);

  // ── 30–31 HTTP method / no-store ───────────────────────────────────────────
  const convRoute = read("app/api/admin/connect/conversations/route.ts");
  const msgRoute = read(
    "app/api/admin/connect/conversations/[publicId]/messages/route.ts",
  );
  check("conversations route rejects unsupported methods", convRoute.includes("connectMethodNotAllowed"));
  check("messages route no-store helper", msgRoute.includes("connectJson") || msgRoute.includes("no-store"));
  const httpHelper = read("lib/connect/messaging/http.ts");
  check("no-store header constant present", httpHelper.includes('Cache-Control": "no-store'));

  // ── 32 No sensitive content in meters/audit ────────────────────────────────
  const audit = store.getAuditLog();
  check(
    "no sensitive content in audit events",
    audit.every(
      (e) =>
        !JSON.stringify(e).includes("Hello from C1") &&
        !JSON.stringify(e).includes("Meter me") &&
        !/body|messageBody|content/i.test(JSON.stringify(e.metadata ?? {})),
    ),
  );
  const meterSrc = read("lib/connect/metering/service.ts");
  check(
    "meter service avoids message body fields",
    !meterSrc.includes("messageBody") && meterSrc.includes("atomic"),
  );
  const atomicSrc = read("lib/connect/metering/atomic.ts");
  check("atomic meter upsert path present", atomicSrc.includes("ON CONFLICT") && atomicSrc.includes("quantity"));

  // ── 33 C0 foundation regression ────────────────────────────────────────────
  check("C0 verifier script present", existsSync(path.join(root, "scripts/verify-phase6-batch-c0.ts")));
  check("C0 migration retained", existsSync(path.join(root, "migrations/20260815_phase6_connect_c0_foundation.ts")));
  check("C0 org collection retained", existsSync(path.join(root, "payload/collections/ConnectOrganizations.ts")));

  // ── 34 Edition / entitlement regression ────────────────────────────────────
  check("kxd-connect still disabled by default", isFeatureEnabled("kxd-connect") === false);
  const editions = read("lib/editions/features.ts");
  check("feature registry still includes kxd-connect", editions.includes('"kxd-connect"') || editions.includes("kxd-connect"));

  // ── 35 Portal membership / account-switcher regression ─────────────────────
  check(
    "portal membership collection preserved",
    existsSync(path.join(root, "payload/collections/PortalClientMemberships.ts")),
  );
  const portalMem = read("payload/collections/PortalClientMemberships.ts");
  check("portal membership slug unchanged", portalMem.includes('slug: "portal-client-memberships"'));
  check(
    "account switcher verifier preserved",
    existsSync(path.join(root, "scripts/verify-phase4-account-switcher.ts")),
  );

  // ── 36 Phase 5 billing visibility regression ───────────────────────────────
  check("phase5 batch 5c verifier present", existsSync(path.join(root, "scripts/verify-phase5-batch-5c.ts")));
  check("phase5 batch 5d verifier present", existsSync(path.join(root, "scripts/verify-phase5-batch-5d.ts")));

  // ── 37 Client Communications / portal feedback separation ──────────────────
  check(
    "client communications collection preserved",
    existsSync(path.join(root, "payload/collections/ClientCommunications.ts")),
  );
  check(
    "experience feedback verifier preserved",
    existsSync(path.join(root, "scripts/verify-experience-feedback.ts")),
  );
  const docs = read("docs/PHASE-6-KXD-CONNECT.md");
  check("docs distinguish Client Communications", docs.includes("Client Communications ≠ KXD Connect") || docs.includes("Client Communications"));

  // ── 38 message-kxd unchanged ───────────────────────────────────────────────
  check("docs keep message-kxd unchanged", docs.includes("message-kxd"));
  const statusRoute = read("app/api/admin/connect/status/route.ts");
  check("status route keeps messagingAvailable false (no UI)", statusRoute.includes("messagingAvailable: false"));

  // ── 39 No Connect UI / navigation exposure ─────────────────────────────────
  check("docs exclude Connect UI from C1", docs.includes("C1") && (docs.includes("No Connect UI") || docs.includes("does not create the visible Connect experience") || docs.includes("no shell")));
  // C1 excluded Connect UI; C2 may add /admin/connect staff messaging.
  // Dock / Buddy List / launcher remain excluded across batches.
  check(
    "no Connect dock/launcher/buddy-list components",
    !existsSync(path.join(root, "components/connect")) &&
      !existsSync(path.join(root, "components/admin/connect/ConnectDock.tsx")) &&
      !existsSync(path.join(root, "components/admin/connect/BuddyList.tsx")) &&
      !existsSync(path.join(root, "components/admin/connect/AppLauncher.tsx")),
  );
  const payloadConfig = read("payload.config.ts");
  check("payload registers ConnectConversations", payloadConfig.includes("ConnectConversations"));
  check("payload registers ConnectMessages", payloadConfig.includes("ConnectMessages"));
  const migrationIndex = read("migrations/index.ts");
  check(
    "C1 migration registered",
    migrationIndex.includes("20260816_phase6_connect_c1_messaging"),
  );
  check(
    "C0 migration date retained as sequential 20260815",
    migrationIndex.includes("20260815_phase6_connect_c0_foundation") &&
      read("migrations/20260816_phase6_connect_c1_messaging.ts").includes("sequential prefix"),
  );

  // Conversation create audit without message bodies
  check(
    "conversation creation audited",
    audit.some((e) => e.type === "conversation.created"),
  );

  // Message edit/delete deferred
  const messagesColl = read("payload/collections/ConnectMessages.ts");
  check(
    "message edit/delete deferred (documented)",
    messagesColl.includes("deferred") || docs.includes("deferred"),
  );

  // Auth order documented in code
  const authSrc = read("lib/connect/messaging/authorization.ts");
  check(
    "authorization order documented",
    authSrc.includes("1. Authenticated identity") &&
      authSrc.includes("6. Active conversation participation"),
  );

  // chris unused except ensuring group can add third
  const addChris = await store.addParticipant({
    actor: matt,
    conversationPublicId: group.conversation.publicId,
    membership: chrisMem,
  });
  check("eligible internal participant can be added", addChris.ok === true);
  void chris;

  // derivePrivateUnreadState basic
  const derived = derivePrivateUnreadState({
    conversationPublicId: "x",
    participant: { lastReadMessagePublicId: null },
    messages: [
      {
        id: 1,
        publicId: "m1",
        organizationId: 1,
        conversationId: 1,
        authorParticipantId: 1,
        body: "a",
        createdAt: "2026-08-01T00:00:00.000Z",
      },
    ],
  });
  check("unread derivation without last-read", derived.unreadCount === 1);

  console.log("\nPhase 6 Batch C1 verification passed.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
