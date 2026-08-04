/**
 * Phase 6 Batch C5 — Structured local dogfood operating period (service layer).
 *
 * Exercises multi-session messaging, polling paths, authorization stress,
 * operator activation/rollback, and stability loops against local fixtures.
 *
 * Prerequisites:
 *   npm run migrate:local
 *   CONNECT_LOCAL_FIXTURE_PASSWORD='…' npm run bootstrap:connect-local-fixtures
 *   Local env allowlists + KXD_CONNECT_ENABLED=1
 *
 *   npm run dogfood:connect-local
 *
 * Does NOT authorize production. Fail-closed on non-local DB.
 */

import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { evaluateConnectAccess } from "../lib/connect/access";
import {
  buildConnectLocalActivationFromEnv,
  createDisabledConnectLocalActivationState,
  isConnectLocalActivationEnabled,
  readConnectLocalActivationState,
  writeConnectLocalActivationState,
} from "../lib/connect/activation";
import {
  assertConnectLocalFixtureTarget,
  formatConnectLocalDbTarget,
  resolveConnectLocalDbTarget,
} from "../lib/connect/local-fixture-guard";
import { CONNECT_LOCAL_FIXTURE_STAFF } from "../lib/connect/local-fixture-staff";

type ScenarioResult = {
  id: string;
  pass: boolean;
  detail?: string;
  ms?: number;
};

const results: ScenarioResult[] = [];
const pollLatenciesMs: number[] = [];

function record(id: string, pass: boolean, detail?: string, ms?: number) {
  results.push({ id, pass, detail, ms });
  const timing = typeof ms === "number" ? ` (${ms.toFixed(1)}ms)` : "";
  console.log(
    pass
      ? `  ✔ ${id}${timing}${detail ? ` — ${detail}` : ""}`
      : `  ✘ ${id}${timing}${detail ? ` — ${detail}` : ""}`,
  );
  assert.ok(pass, detail ? `${id}: ${detail}` : id);
}

function ensureDogfoodEnv() {
  process.env.KXD_CONNECT_KILL_SWITCH = undefined;
  process.env.KXD_CONNECT_ENABLED = process.env.KXD_CONNECT_ENABLED || "1";
  process.env.KXD_CONNECT_ORG_ALLOWLIST =
    process.env.KXD_CONNECT_ORG_ALLOWLIST || "kxd";
  process.env.KXD_CONNECT_STAFF_DOGFOOD_EMAILS =
    process.env.KXD_CONNECT_STAFF_DOGFOOD_EMAILS ||
    CONNECT_LOCAL_FIXTURE_STAFF.map((s) => s.email).join(",");
}

async function main() {
  console.log("\nPhase 6 Batch C5 — Structured local dogfood operating period\n");

  const target = resolveConnectLocalDbTarget();
  assertConnectLocalFixtureTarget(target);
  record("local-db-target", target.isLocal, formatConnectLocalDbTarget(target));

  ensureDogfoodEnv();

  // ── Operator activation layers ─────────────────────────────────────────────
  const before = readConnectLocalActivationState();
  if (!before.enabled) {
    writeConnectLocalActivationState(
      buildConnectLocalActivationFromEnv(process.env, {
        enabled: true,
        note: "c5-dogfood-operating-period",
      }),
    );
  }
  record(
    "operator-enable",
    isConnectLocalActivationEnabled() === true,
    `updatedAt=${readConnectLocalActivationState().updatedAt}`,
  );

  const { getPayload } = await import("payload");
  const { default: config } = await import("../payload.config");
  const { resolveConnectStaffSession } = await import(
    "../lib/connect/messaging/session"
  );
  const {
    createDirectConversationForSession,
    createGroupConversationForSession,
    listConversationsForSession,
    listMessagesForSession,
    sendMessageForSession,
    getUnreadForSession,
    markReadForSession,
  } = await import("../lib/connect/messaging/service");

  const payload = await getPayload({ config });

  async function sessionFor(email: string) {
    const users = await payload.find({
      collection: "users",
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    record(`fixture-user:${email}`, users.docs.length === 1);
    const userId = Number(users.docs[0].id);
    const resolved = await resolveConnectStaffSession({
      staffUserId: userId,
      staffEmail: email,
      organizationKey: "kxd",
      // Live activation path — do not inject edition bypass for C5 realism.
      editionFeatureActive: false,
      env: process.env,
    });
    record(
      `session-resolve:${email}`,
      resolved.ok === true,
      resolved.ok ? undefined : resolved.reason,
    );
    if (!resolved.ok) {
      throw new Error(`session failed for ${email}: ${resolved.reason}`);
    }
    return resolved.session;
  }

  const sessionA = await sessionFor("connect-a@kxd.local");
  const sessionB = await sessionFor("connect-b@kxd.local");
  const sessionC = await sessionFor("connect-c@kxd.local");

  // ── Direct + multi conversation ────────────────────────────────────────────
  const dAB = await createDirectConversationForSession({
    session: sessionA,
    otherMembershipId: sessionB.membership.id,
  });
  record("direct-create-A-B", dAB.ok === true);
  if (!dAB.ok) throw new Error(dAB.message);

  const dAC = await createDirectConversationForSession({
    session: sessionA,
    otherMembershipId: sessionC.membership.id,
  });
  record("direct-create-A-C", dAC.ok === true);
  if (!dAC.ok) throw new Error(dAC.message);

  const listA = await listConversationsForSession({ session: sessionA });
  record(
    "multiple-active-conversations",
    listA.ok === true &&
      listA.ok &&
      listA.conversations.filter((c) =>
        [dAB.conversation.publicId, dAC.conversation.publicId].includes(
          c.publicId,
        ),
      ).length === 2,
  );

  // ── Rapid exchange + ordering ─────────────────────────────────────────────
  for (let i = 0; i < 12; i++) {
    const fromA = i % 2 === 0;
    const body = `c5-rapid-${i}-${Date.now()}`;
    const sent = await sendMessageForSession({
      session: fromA ? sessionA : sessionB,
      conversationPublicId: dAB.conversation.publicId,
      body,
    });
    record(`rapid-send-${i}`, sent.ok === true);
    if (!sent.ok) throw new Error(sent.message);
  }

  const history = await listMessagesForSession({
    session: sessionB,
    conversationPublicId: dAB.conversation.publicId,
    direction: "before",
    limit: 20,
  });
  record(
    "history-load",
    history.ok === true && history.ok && history.messages.length >= 12,
  );
  if (history.ok) {
    const ids = history.messages.map((m) => m.publicId);
    record(
      "no-duplicate-message-ids",
      new Set(ids).size === ids.length,
      `count=${ids.length}`,
    );
    const times = history.messages.map((m) => new Date(m.createdAt).getTime());
    let ordered = true;
    for (let i = 1; i < times.length; i++) {
      if (times[i] < times[i - 1]) ordered = false;
    }
    record("message-ordering-non-decreasing", ordered);
  }

  // ── Unread / mark-read ─────────────────────────────────────────────────────
  const unreadB = await getUnreadForSession({
    session: sessionB,
    conversationPublicId: dAB.conversation.publicId,
  });
  record(
    "unread-after-rapid",
    unreadB.ok === true && unreadB.ok && unreadB.unread.unreadCount >= 1,
    unreadB.ok ? `count=${unreadB.unread.unreadCount}` : unreadB.message,
  );

  if (history.ok && history.messages.length) {
    const newest = history.messages[history.messages.length - 1];
    const mark1 = await markReadForSession({
      session: sessionB,
      conversationPublicId: dAB.conversation.publicId,
      targetMessagePublicId: newest.publicId,
    });
    record("mark-read", mark1.ok === true);
    const mark2 = await markReadForSession({
      session: sessionB,
      conversationPublicId: dAB.conversation.publicId,
      targetMessagePublicId: newest.publicId,
    });
    record(
      "mark-read-idempotent-no-rewrite",
      mark2.ok === true && mark2.ok && mark2.changed === false,
    );
    const unreadAfter = await getUnreadForSession({
      session: sessionB,
      conversationPublicId: dAB.conversation.publicId,
    });
    record(
      "unread-cleared-after-mark-read",
      unreadAfter.ok === true &&
        unreadAfter.ok &&
        unreadAfter.unread.unreadCount === 0,
    );
  }

  // ── Pagination ─────────────────────────────────────────────────────────────
  const page1 = await listMessagesForSession({
    session: sessionA,
    conversationPublicId: dAB.conversation.publicId,
    direction: "before",
    limit: 5,
  });
  record(
    "pagination-page-1",
    page1.ok === true && page1.ok && page1.messages.length > 0,
  );
  if (page1.ok && page1.prevCursor) {
    const page2 = await listMessagesForSession({
      session: sessionA,
      conversationPublicId: dAB.conversation.publicId,
      cursor: page1.prevCursor,
      direction: "before",
      limit: 5,
    });
    record("pagination-older-page", page2.ok === true);
    if (page2.ok) {
      const set = new Set([
        ...page1.messages.map((m) => m.publicId),
        ...page2.messages.map((m) => m.publicId),
      ]);
      record(
        "pagination-no-cross-page-duplicates",
        set.size === page1.messages.length + page2.messages.length,
      );
    }
  }

  // ── Polling simulation (direction=after) ───────────────────────────────────
  const cursor = page1.ok ? page1.nextCursor : null;
  for (let i = 0; i < 8; i++) {
    const t0 = performance.now();
    const poll = await listMessagesForSession({
      session: sessionB,
      conversationPublicId: dAB.conversation.publicId,
      cursor,
      direction: "after",
      limit: 40,
    });
    const ms = performance.now() - t0;
    pollLatenciesMs.push(ms);
    record(
      `idle-poll-${i}`,
      poll.ok === true,
      `messages=${poll.ok ? poll.messages.length : "err"}`,
      ms,
    );
  }

  const injected = await sendMessageForSession({
    session: sessionA,
    conversationPublicId: dAB.conversation.publicId,
    body: `c5-poll-inject-${Date.now()}`,
  });
  record("poll-inject-send", injected.ok === true);
  if (!injected.ok) throw new Error(injected.message);

  const tNew = performance.now();
  const afterNew = await listMessagesForSession({
    session: sessionB,
    conversationPublicId: dAB.conversation.publicId,
    cursor,
    direction: "after",
    limit: 40,
  });
  const afterMs = performance.now() - tNew;
  pollLatenciesMs.push(afterMs);
  record(
    "poll-after-new-message",
    afterNew.ok === true &&
      afterNew.ok &&
      afterNew.messages.some((m) => m.publicId === injected.message.publicId),
    undefined,
    afterMs,
  );

  const tSim = performance.now();
  const [p1, p2] = await Promise.all([
    listMessagesForSession({
      session: sessionA,
      conversationPublicId: dAB.conversation.publicId,
      cursor: null,
      direction: "before",
      limit: 10,
    }),
    listMessagesForSession({
      session: sessionA,
      conversationPublicId: dAC.conversation.publicId,
      cursor: null,
      direction: "before",
      limit: 10,
    }),
  ]);
  record(
    "simultaneous-conversation-reads",
    p1.ok === true && p2.ok === true,
    undefined,
    performance.now() - tSim,
  );

  // ── Long conversation stability ────────────────────────────────────────────
  for (let i = 0; i < 40; i++) {
    const sent = await sendMessageForSession({
      session: i % 2 === 0 ? sessionA : sessionC,
      conversationPublicId: dAC.conversation.publicId,
      body: `c5-long-${i}-${"x".repeat(20)}`,
    });
    if (!sent.ok) {
      record("long-conversation-send", false, sent.message);
      throw new Error(sent.message);
    }
  }
  const longPage = await listMessagesForSession({
    session: sessionC,
    conversationPublicId: dAC.conversation.publicId,
    direction: "before",
    limit: 50,
  });
  record(
    "long-conversation-history",
    longPage.ok === true &&
      longPage.ok &&
      longPage.messages.length >= 40 &&
      longPage.messages.length <= 50,
    longPage.ok ? `returned=${longPage.messages.length}` : undefined,
  );
  if (longPage.ok) {
    const ids = longPage.messages.map((m) => m.publicId);
    record("long-conversation-no-dupes", new Set(ids).size === ids.length);
  }

  // ── Group ──────────────────────────────────────────────────────────────────
  const group = await createGroupConversationForSession({
    session: sessionA,
    title: `C5 Dogfood Group ${Date.now()}`,
    memberMembershipIds: [sessionB.membership.id, sessionC.membership.id],
  });
  record("group-create", group.ok === true);
  if (group.ok) {
    const g1 = await sendMessageForSession({
      session: sessionB,
      conversationPublicId: group.conversation.publicId,
      body: "group from B",
    });
    const g2 = await sendMessageForSession({
      session: sessionC,
      conversationPublicId: group.conversation.publicId,
      body: "group from C",
    });
    record("group-multi-member-send", g1.ok === true && g2.ok === true);

    const groupDocs = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-conversations" as any,
      where: { publicId: { equals: group.conversation.publicId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (groupDocs.docs.length) {
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "connect-conversations" as any,
        id: Number(groupDocs.docs[0].id),
        data: { status: "archived" },
        overrideAccess: true,
      });
      const blocked = await sendMessageForSession({
        session: sessionA,
        conversationPublicId: group.conversation.publicId,
        body: "archived should fail",
      });
      record("archived-send-denied", blocked.ok === false);

      const archivedRead = await listMessagesForSession({
        session: sessionA,
        conversationPublicId: group.conversation.publicId,
        direction: "before",
        limit: 10,
      });
      record("archived-history-readable", archivedRead.ok === true);
    }
  }

  // ── Session switching (re-resolve) ─────────────────────────────────────────
  const switchA = await resolveConnectStaffSession({
    staffUserId: sessionA.staffUserId,
    staffEmail: sessionA.staffEmail,
    organizationKey: "kxd",
    editionFeatureActive: false,
    env: process.env,
  });
  const switchB = await resolveConnectStaffSession({
    staffUserId: sessionB.staffUserId,
    staffEmail: sessionB.staffEmail,
    organizationKey: "kxd",
    editionFeatureActive: false,
    env: process.env,
  });
  record(
    "session-switching-re-resolve",
    switchA.ok === true &&
      switchB.ok === true &&
      switchA.ok &&
      switchB.ok &&
      switchA.session.staffUserId !== switchB.session.staffUserId,
  );

  // ── Authorization stress ───────────────────────────────────────────────────
  const portal = evaluateConnectAccess({
    subjectKind: "portal-user",
    staffEmail: null,
    organization: { key: "kxd", status: "active" },
    membership: { status: "active", role: "organization-member" },
    editionFeatureActive: false,
    env: process.env,
  });
  record(
    "auth-portal-denied",
    !portal.allowed && portal.reason === "portal_identity_not_supported_in_c0",
  );

  const inactiveOrg = evaluateConnectAccess({
    subjectKind: "staff-user",
    staffEmail: "connect-a@kxd.local",
    organization: { key: "kxd", status: "inactive" },
    membership: { status: "active", role: "organization-member" },
    editionFeatureActive: false,
    env: process.env,
  });
  record(
    "auth-inactive-org-denied",
    !inactiveOrg.allowed && inactiveOrg.reason === "org_inactive",
  );

  const inactiveMem = evaluateConnectAccess({
    subjectKind: "staff-user",
    staffEmail: "connect-a@kxd.local",
    organization: { key: "kxd", status: "active" },
    membership: { status: "disabled", role: "organization-member" },
    editionFeatureActive: false,
    env: process.env,
  });
  record(
    "auth-inactive-membership-denied",
    !inactiveMem.allowed && inactiveMem.reason === "membership_disabled",
  );

  // Allowlist removal (activation file rewrite — immediate)
  const prior = readConnectLocalActivationState();
  writeConnectLocalActivationState({
    ...prior,
    enabled: true,
    staffEmails: ["connect-b@kxd.local", "connect-c@kxd.local"],
    organizationKeys: prior.organizationKeys.length
      ? prior.organizationKeys
      : ["kxd"],
  });
  const revokedA = await resolveConnectStaffSession({
    staffUserId: sessionA.staffUserId,
    staffEmail: sessionA.staffEmail,
    organizationKey: "kxd",
    editionFeatureActive: false,
    env: process.env,
  });
  record(
    "auth-allowlist-removal-immediate",
    revokedA.ok === false,
    revokedA.ok ? "still allowed" : revokedA.reason,
  );

  // Restore allowlist
  writeConnectLocalActivationState({
    ...prior,
    enabled: true,
    staffEmails: CONNECT_LOCAL_FIXTURE_STAFF.map((s) => s.email),
    organizationKeys: ["kxd"],
  });
  const restoredA = await resolveConnectStaffSession({
    staffUserId: sessionA.staffUserId,
    staffEmail: sessionA.staffEmail,
    organizationKey: "kxd",
    editionFeatureActive: false,
    env: process.env,
  });
  record("auth-allowlist-restore", restoredA.ok === true);

  // Feature disabled
  const disabledEnv = { ...process.env };
  delete disabledEnv.KXD_CONNECT_ENABLED;
  const featureOff = await resolveConnectStaffSession({
    staffUserId: sessionA.staffUserId,
    staffEmail: sessionA.staffEmail,
    organizationKey: "kxd",
    editionFeatureActive: false,
    env: disabledEnv,
  });
  record("auth-feature-disabled", featureOff.ok === false);

  // Activation disabled (rollback)
  writeConnectLocalActivationState(
    createDisabledConnectLocalActivationState({
      staffEmails: CONNECT_LOCAL_FIXTURE_STAFF.map((s) => s.email),
      organizationKeys: ["kxd"],
      note: "c5-rollback-proof",
    }),
  );
  const afterDisable = await resolveConnectStaffSession({
    staffUserId: sessionA.staffUserId,
    staffEmail: sessionA.staffEmail,
    organizationKey: "kxd",
    editionFeatureActive: false,
    env: process.env,
  });
  record(
    "rollback-activation-disable-immediate",
    afterDisable.ok === false,
    afterDisable.ok ? "still allowed" : afterDisable.reason,
  );

  // Re-enable then leave disabled as clean end state
  writeConnectLocalActivationState(
    buildConnectLocalActivationFromEnv(process.env, {
      enabled: true,
      note: "c5-reenable-after-rollback-proof",
    }),
  );
  const reenabled = await resolveConnectStaffSession({
    staffUserId: sessionA.staffUserId,
    staffEmail: sessionA.staffEmail,
    organizationKey: "kxd",
    editionFeatureActive: false,
    env: process.env,
  });
  record("operator-reenable-after-rollback", reenabled.ok === true);

  writeConnectLocalActivationState(
    createDisabledConnectLocalActivationState({
      staffEmails: CONNECT_LOCAL_FIXTURE_STAFF.map((s) => s.email),
      organizationKeys: ["kxd"],
      note: "c5-end-state-disabled",
    }),
  );
  record("end-state-activation-disabled", isConnectLocalActivationEnabled() === false);

  const avg =
    pollLatenciesMs.reduce((a, b) => a + b, 0) / (pollLatenciesMs.length || 1);
  const max = Math.max(...pollLatenciesMs, 0);
  console.log("\n── Polling summary ──");
  console.log(`  samples: ${pollLatenciesMs.length}`);
  console.log(`  avg latency: ${avg.toFixed(1)}ms`);
  console.log(`  max latency: ${max.toFixed(1)}ms`);
  console.log(
    `  empty-poll samples: ${results.filter((r) => r.id.startsWith("idle-poll-") && r.pass).length}`,
  );

  console.log("\n── Scenario tally ──");
  console.log(
    `  passed: ${results.filter((r) => r.pass).length}/${results.length}`,
  );
  console.log("\nC5 dogfood operating period (service layer) completed.\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nC5 dogfood operating period FAILED\n");
    console.error(err);
    process.exit(1);
  });
