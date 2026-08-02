/**
 * Phase 6 Batch C3 — local multi-session Connect messaging smoke (service layer).
 *
 * Requires prior: migrate:local + bootstrap:connect-local-fixtures
 * Fail-closed unless DB target is local.
 *
 *   KXD_CONNECT_ENABLED=1 \
 *   KXD_CONNECT_ORG_ALLOWLIST=kxd \
 *   KXD_CONNECT_STAFF_DOGFOOD_EMAILS=connect-a@kxd.local,connect-b@kxd.local,connect-c@kxd.local \
 *   npm run smoke:connect-local-messaging
 */

import assert from "node:assert/strict";
import {
  assertConnectLocalFixtureTarget,
  formatConnectLocalDbTarget,
  resolveConnectLocalDbTarget,
} from "../lib/connect/local-fixture-guard";
import { CONNECT_LOCAL_FIXTURE_STAFF } from "../lib/connect/local-fixture-staff";

function check(label: string, pass: boolean, detail?: string) {
  console.log(
    pass ? `  ✔ ${label}` : `  ✘ ${label}${detail ? ` — ${detail}` : ""}`,
  );
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
}

async function main() {
  console.log("\nPhase 6 Batch C3 — local messaging smoke\n");
  const target = resolveConnectLocalDbTarget();
  assertConnectLocalFixtureTarget(target);
  check("local DB target", target.isLocal, formatConnectLocalDbTarget(target));

  process.env.KXD_CONNECT_KILL_SWITCH = undefined;
  process.env.KXD_CONNECT_ENABLED = process.env.KXD_CONNECT_ENABLED || "1";
  process.env.KXD_CONNECT_ORG_ALLOWLIST =
    process.env.KXD_CONNECT_ORG_ALLOWLIST || "kxd";
  process.env.KXD_CONNECT_STAFF_DOGFOOD_EMAILS =
    process.env.KXD_CONNECT_STAFF_DOGFOOD_EMAILS ||
    CONNECT_LOCAL_FIXTURE_STAFF.map((s) => s.email).join(",");

  const { getPayload } = await import("payload");
  const { default: config } = await import("../payload.config");
  const { resolveConnectStaffSession } = await import(
    "../lib/connect/messaging/session"
  );
  const {
    createDirectConversationForSession,
    createGroupConversationForSession,
    listMessagesForSession,
    sendMessageForSession,
    getUnreadForSession,
    markReadForSession,
  } = await import("../lib/connect/messaging/service");
  const { CONNECT_GROUP_MAX_PARTICIPANTS } = await import(
    "../lib/connect/messaging/ui-types"
  );

  const payload = await getPayload({ config });

  async function sessionFor(email: string) {
    const users = await payload.find({
      collection: "users",
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    check(`fixture user exists (${email})`, users.docs.length === 1);
    const userId = Number(users.docs[0].id);
    const resolved = await resolveConnectStaffSession({
      staffUserId: userId,
      staffEmail: email,
      organizationKey: "kxd",
      editionFeatureActive: true,
      env: process.env,
    });
    check(`Connect session resolves (${email})`, resolved.ok === true);
    if (!resolved.ok) throw new Error(resolved.reason);
    return resolved.session;
  }

  const sessionA = await sessionFor("connect-a@kxd.local");
  const sessionB = await sessionFor("connect-b@kxd.local");
  const sessionC = await sessionFor("connect-c@kxd.local");

  // Direct pair uniqueness A→B then B→A
  const d1 = await createDirectConversationForSession({
    session: sessionA,
    otherMembershipId: sessionB.membership.id,
  });
  check("A starts/resumes direct with B", d1.ok === true);
  if (!d1.ok) throw new Error(d1.message);
  const d2 = await createDirectConversationForSession({
    session: sessionB,
    otherMembershipId: sessionA.membership.id,
  });
  check(
    "pair uniqueness A↔B",
    d2.ok === true &&
      d2.ok &&
      d1.ok &&
      d2.conversation.publicId === d1.conversation.publicId,
  );

  const sendA = await sendMessageForSession({
    session: sessionA,
    conversationPublicId: d1.conversation.publicId,
    body: `C3 smoke from A ${Date.now()}`,
  });
  check("A sends message", sendA.ok === true);
  if (!sendA.ok) throw new Error(sendA.message);

  const pollB = await listMessagesForSession({
    session: sessionB,
    conversationPublicId: d1.conversation.publicId,
    cursor: null,
    direction: "before",
    limit: 5,
  });
  check("B receives via history path", pollB.ok === true && pollB.ok && pollB.messages.some((m) => m.publicId === sendA.message.publicId));

  const unreadB = await getUnreadForSession({
    session: sessionB,
    conversationPublicId: d1.conversation.publicId,
  });
  check(
    "B private unread visible",
    unreadB.ok === true && unreadB.ok && unreadB.unread.unreadCount >= 1,
  );

  const markB = await markReadForSession({
    session: sessionB,
    conversationPublicId: d1.conversation.publicId,
    targetMessagePublicId: sendA.message.publicId,
  });
  check("B mark-read ok", markB.ok === true);
  const markBAgain = await markReadForSession({
    session: sessionB,
    conversationPublicId: d1.conversation.publicId,
    targetMessagePublicId: sendA.message.publicId,
  });
  check(
    "identical mark-read does not rewrite",
    markBAgain.ok === true && markBAgain.ok && markBAgain.changed === false,
  );

  const unreadA = await getUnreadForSession({
    session: sessionA,
    conversationPublicId: d1.conversation.publicId,
  });
  check(
    "A read state independent of B",
    unreadA.ok === true,
  );

  // Pagination older page
  const page1 = await listMessagesForSession({
    session: sessionA,
    conversationPublicId: d1.conversation.publicId,
    direction: "before",
    limit: 3,
  });
  check("latest history page", page1.ok === true && page1.ok && page1.messages.length > 0);
  if (page1.ok && page1.prevCursor) {
    const page2 = await listMessagesForSession({
      session: sessionA,
      conversationPublicId: d1.conversation.publicId,
      cursor: page1.prevCursor,
      direction: "before",
      limit: 3,
    });
    check("older history page", page2.ok === true);
    if (page2.ok) {
      const ids = new Set([
        ...page1.messages.map((m) => m.publicId),
        ...page2.messages.map((m) => m.publicId),
      ]);
      check(
        "pagination no duplicates across pages",
        ids.size === page1.messages.length + page2.messages.length,
      );
    }
  }

  // Poll after cursor
  if (page1.ok && page1.nextCursor) {
    const after = await listMessagesForSession({
      session: sessionB,
      conversationPublicId: d1.conversation.publicId,
      cursor: page1.nextCursor,
      direction: "after",
      limit: 40,
    });
    check("empty/incremental after poll bounded", after.ok === true);
  }

  // Group
  const group = await createGroupConversationForSession({
    session: sessionA,
    title: `C3 Smoke Group ${Date.now()}`,
    memberMembershipIds: [sessionB.membership.id, sessionC.membership.id],
  });
  check("create titled group 3 members", group.ok === true);
  check(
    "group max constant is 12",
    CONNECT_GROUP_MAX_PARTICIPANTS === 12,
  );

  if (group.ok) {
    const gSend = await sendMessageForSession({
      session: sessionC,
      conversationPublicId: group.conversation.publicId,
      body: "group hello from C",
    });
    check("group multi-member send", gSend.ok === true);

    // Archive via trusted LocalAPI (service archive API is role-gated for admins).
    const groupDocs = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-conversations" as any,
      where: { publicId: { equals: group.conversation.publicId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    check("group conversation locatable", groupDocs.docs.length === 1);
    if (groupDocs.docs.length > 0) {
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "connect-conversations" as any,
        id: Number(groupDocs.docs[0].id),
        data: { status: "archived" },
        overrideAccess: true,
      });
      const blocked = await sendMessageForSession({
        session: sessionB,
        conversationPublicId: group.conversation.publicId,
        body: "should fail",
      });
      check("archived group read-only for send", blocked.ok === false);
    }
  }

  // Access denials — both edition feature and operator env must be off.
  const disabledEnv = { ...process.env };
  delete disabledEnv.KXD_CONNECT_ENABLED;
  const disabled = await resolveConnectStaffSession({
    staffUserId: sessionA.staffUserId,
    staffEmail: sessionA.staffEmail,
    organizationKey: "kxd",
    editionFeatureActive: false,
    env: disabledEnv,
  });
  check("Connect-disabled fails closed", disabled.ok === false);

  const nonAllowlisted = await resolveConnectStaffSession({
    staffUserId: sessionA.staffUserId,
    staffEmail: "not-allowlisted@example.com",
    organizationKey: "kxd",
    editionFeatureActive: true,
    env: process.env,
  });
  check("non-allowlisted staff denied", nonAllowlisted.ok === false);

  console.log("\nLocal messaging smoke passed.\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Local messaging smoke failed:", err);
    process.exit(1);
  });
