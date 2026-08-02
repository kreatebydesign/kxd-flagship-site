/**
 * Phase 6 Batch C3 — LOCAL-ONLY Connect dogfood fixture bootstrap.
 *
 * Deterministic, idempotent fixtures for later local dogfood authorization:
 *   - KXD Connect organization
 *   - 3 active staff users + Connect memberships
 *   - 1 direct conversation + sample messages
 *   - 1 small group conversation + sample messages
 *
 * This does NOT enable Connect for production or dogfood users.
 * This does NOT authorize dogfood activation.
 *
 * Usage (local only):
 *   CONNECT_LOCAL_FIXTURE_PASSWORD='...' npm run bootstrap:connect-local-fixtures
 *
 * Required env for later local UI dogfood (not set by this script):
 *   KXD_CONNECT_ENABLED=1
 *   KXD_CONNECT_ORG_ALLOWLIST=kxd
 *   KXD_CONNECT_STAFF_DOGFOOD_EMAILS=connect-a@kxd.local,connect-b@kxd.local,connect-c@kxd.local
 */

import {
  assertConnectLocalFixtureTarget,
  formatConnectLocalDbTarget,
  resolveConnectLocalDbTarget,
} from "../lib/connect/local-fixture-guard";
import { CONNECT_LOCAL_FIXTURE_STAFF } from "../lib/connect/local-fixture-staff";

export { CONNECT_LOCAL_FIXTURE_STAFF };

async function main() {
  const target = resolveConnectLocalDbTarget();
  assertConnectLocalFixtureTarget(target);
  console.log(`[connect-fixtures] target: ${formatConnectLocalDbTarget(target)}`);

  const password = process.env.CONNECT_LOCAL_FIXTURE_PASSWORD?.trim();
  if (!password || password.length < 10) {
    console.error(
      "[connect-fixtures] CONNECT_LOCAL_FIXTURE_PASSWORD required (min 10 chars). " +
        "Never commit the password.",
    );
    process.exit(1);
  }

  const { bootstrapKxdConnectOrganization } = await import(
    "../lib/connect/bootstrap"
  );
  const { getPayload } = await import("payload");
  const { default: config } = await import("../payload.config");
  const { createConnectPublicId } = await import("../lib/connect/ids");
  const { buildDirectConversationPairKey } = await import(
    "../lib/connect/messaging/pair-key"
  );

  const orgResult = await bootstrapKxdConnectOrganization();
  const organizationId = orgResult.organizationId;
  const payload = await getPayload({ config });

  type StaffRow = {
    email: string;
    displayName: string;
    key: string;
    userId: number;
    membershipId: number;
    createdUser: boolean;
    createdMembership: boolean;
  };

  const staff: StaffRow[] = [];

  for (const fixture of CONNECT_LOCAL_FIXTURE_STAFF) {
    const existingUsers = await payload.find({
      collection: "users",
      where: { email: { equals: fixture.email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    let userId: number;
    let createdUser = false;
    if (existingUsers.docs.length > 0) {
      userId = Number(existingUsers.docs[0].id);
      await payload.update({
        collection: "users",
        id: userId,
        data: {
          displayName: fixture.displayName,
          role: "admin",
          password,
        },
        overrideAccess: true,
      });
    } else {
      const created = await payload.create({
        collection: "users",
        data: {
          email: fixture.email,
          displayName: fixture.displayName,
          role: "admin",
          password,
        },
        overrideAccess: true,
      });
      userId = Number(created.id);
      createdUser = true;
    }

    const existingMemberships = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-organization-memberships" as any,
      where: {
        and: [
          { organization: { equals: organizationId } },
          { subjectKind: { equals: "staff-user" } },
          { staffUser: { equals: userId } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    let membershipId: number;
    let createdMembership = false;
    if (existingMemberships.docs.length > 0) {
      membershipId = Number(existingMemberships.docs[0].id);
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "connect-organization-memberships" as any,
        id: membershipId,
        data: { status: "active", role: "organization-member" },
        overrideAccess: true,
      });
    } else {
      const created = await payload.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "connect-organization-memberships" as any,
        data: {
          organization: organizationId,
          subjectKind: "staff-user",
          staffUser: userId,
          role: "organization-member",
          status: "active",
        },
        overrideAccess: true,
      });
      membershipId = Number(created.id);
      createdMembership = true;
    }

    staff.push({
      email: fixture.email,
      displayName: fixture.displayName,
      key: fixture.key,
      userId,
      membershipId,
      createdUser,
      createdMembership,
    });
  }

  const a = staff[0];
  const b = staff[1];
  const c = staff[2];
  const pairKey = buildDirectConversationPairKey({
    organizationId,
    participantA: {
      membershipId: a.membershipId,
      staffUserId: a.userId,
    },
    participantB: {
      membershipId: b.membershipId,
      staffUserId: b.userId,
    },
  });
  if (!pairKey) {
    throw new Error("Unable to build direct pair key for fixture staff A/B.");
  }

  // Direct conversation A↔B
  let directPublicId: string;
  let directConversationId: number;
  let directCreated = false;
  const existingDirect = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-conversations" as any,
    where: {
      and: [
        { organization: { equals: organizationId } },
        { type: { equals: "direct" } },
        { directPairKey: { equals: pairKey } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (existingDirect.docs.length > 0) {
    const doc = existingDirect.docs[0] as { id: number; publicId: string };
    directConversationId = Number(doc.id);
    directPublicId = String(doc.publicId);
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-conversations" as any,
      id: directConversationId,
      data: { status: "active" },
      overrideAccess: true,
    });
  } else {
    directPublicId = createConnectPublicId();
    const created = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-conversations" as any,
      data: {
        publicId: directPublicId,
        organization: organizationId,
        type: "direct",
        status: "active",
        directPairKey: pairKey,
        title: null,
      },
      overrideAccess: true,
    });
    directConversationId = Number(created.id);
    directCreated = true;
  }

  async function ensureParticipant(
    conversationId: number,
    membershipId: number,
  ): Promise<number> {
    const existing = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-conversation-participants" as any,
      where: {
        and: [
          { conversation: { equals: conversationId } },
          { membership: { equals: membershipId } },
          { organization: { equals: organizationId } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (existing.docs.length > 0) {
      const id = Number(existing.docs[0].id);
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "connect-conversation-participants" as any,
        id,
        data: { status: "active" },
        overrideAccess: true,
      });
      return id;
    }
    const created = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-conversation-participants" as any,
      data: {
        publicId: createConnectPublicId(),
        organization: organizationId,
        conversation: conversationId,
        membership: membershipId,
        status: "active",
        joinedAt: new Date().toISOString(),
      },
      overrideAccess: true,
    });
    return Number(created.id);
  }

  const directPartA = await ensureParticipant(
    directConversationId,
    a.membershipId,
  );
  const directPartB = await ensureParticipant(
    directConversationId,
    b.membershipId,
  );

  // Group A+B+C
  const GROUP_TITLE = "KXD Connect Local Fixture Group";
  let groupPublicId: string;
  let groupConversationId: number;
  let groupCreated = false;
  const existingGroup = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-conversations" as any,
    where: {
      and: [
        { organization: { equals: organizationId } },
        { type: { equals: "group" } },
        { title: { equals: GROUP_TITLE } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (existingGroup.docs.length > 0) {
    const doc = existingGroup.docs[0] as { id: number; publicId: string };
    groupConversationId = Number(doc.id);
    groupPublicId = String(doc.publicId);
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-conversations" as any,
      id: groupConversationId,
      data: { status: "active", title: GROUP_TITLE },
      overrideAccess: true,
    });
  } else {
    groupPublicId = createConnectPublicId();
    const created = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-conversations" as any,
      data: {
        publicId: groupPublicId,
        organization: organizationId,
        type: "group",
        status: "active",
        title: GROUP_TITLE,
        directPairKey: null,
      },
      overrideAccess: true,
    });
    groupConversationId = Number(created.id);
    groupCreated = true;
  }

  const groupPartA = await ensureParticipant(groupConversationId, a.membershipId);
  const groupPartB = await ensureParticipant(groupConversationId, b.membershipId);
  const groupPartC = await ensureParticipant(groupConversationId, c.membershipId);

  async function ensureFixtureMessage(input: {
    conversationId: number;
    authorParticipantId: number;
    marker: string;
    body: string;
  }): Promise<{ publicId: string; created: boolean }> {
    const marker = `[fixture:${input.marker}]`;
    const existing = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-messages" as any,
      where: {
        and: [
          { conversation: { equals: input.conversationId } },
          { organization: { equals: organizationId } },
          { body: { contains: marker } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (existing.docs.length > 0) {
      return {
        publicId: String((existing.docs[0] as { publicId: string }).publicId),
        created: false,
      };
    }
    const publicId = createConnectPublicId();
    const created = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-messages" as any,
      data: {
        publicId,
        organization: organizationId,
        conversation: input.conversationId,
        authorParticipant: input.authorParticipantId,
        body: `${input.body} ${marker}`,
      },
      overrideAccess: true,
    });
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-conversations" as any,
      id: input.conversationId,
      data: {
        latestMessageAt:
          (created as { createdAt?: string }).createdAt ??
          new Date().toISOString(),
      },
      overrideAccess: true,
    });
    return { publicId, created: true };
  }

  const directMessages = [];
  for (let i = 1; i <= 12; i += 1) {
    const author = i % 2 === 1 ? directPartA : directPartB;
    directMessages.push(
      await ensureFixtureMessage({
        conversationId: directConversationId,
        authorParticipantId: author,
        marker: `direct-${i}`,
        body: `Direct fixture message ${i}.`,
      }),
    );
  }

  const groupMessages = [];
  const groupAuthors = [groupPartA, groupPartB, groupPartC];
  for (let i = 1; i <= 9; i += 1) {
    groupMessages.push(
      await ensureFixtureMessage({
        conversationId: groupConversationId,
        authorParticipantId: groupAuthors[(i - 1) % 3],
        marker: `group-${i}`,
        body: `Group fixture message ${i}.`,
      }),
    );
  }

  // Leave B's direct unread pointer behind the latest message for unread tests.
  const olderDirect = directMessages[Math.max(0, directMessages.length - 4)];
  if (olderDirect) {
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-conversation-participants" as any,
      id: directPartB,
      data: {
        lastReadMessagePublicId: olderDirect.publicId,
        lastReadAt: new Date().toISOString(),
      },
      overrideAccess: true,
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        localOnly: true,
        dogfoodAuthorized: false,
        productionEnablement: false,
        target: formatConnectLocalDbTarget(target),
        organizationId,
        organizationKey: "kxd",
        staff: staff.map((s) => ({
          email: s.email,
          userId: s.userId,
          membershipId: s.membershipId,
          createdUser: s.createdUser,
          createdMembership: s.createdMembership,
        })),
        direct: {
          publicId: directPublicId,
          conversationId: directConversationId,
          created: directCreated,
          messageCount: directMessages.length,
        },
        group: {
          publicId: groupPublicId,
          conversationId: groupConversationId,
          created: groupCreated,
          title: GROUP_TITLE,
          messageCount: groupMessages.length,
        },
        notice:
          "Fixtures ready for local validation only. Connect remains disabled until operator env enablement. This script is not dogfood or production authorization.",
        suggestedLocalEnv: {
          KXD_CONNECT_ENABLED: "1",
          KXD_CONNECT_ORG_ALLOWLIST: "kxd",
          KXD_CONNECT_STAFF_DOGFOOD_EMAILS: CONNECT_LOCAL_FIXTURE_STAFF.map(
            (s) => s.email,
          ).join(","),
        },
      },
      null,
      2,
    ),
  );
}

const isMain =
  typeof process.argv[1] === "string" &&
  process.argv[1].includes("bootstrap-connect-local-dogfood-fixtures");

if (isMain) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[connect-fixtures] failed:", err);
      process.exit(1);
    });
}
