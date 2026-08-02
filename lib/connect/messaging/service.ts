/**
 * Phase 6 Batch C1 — Payload-backed Connect messaging services.
 *
 * Trusted server-side only. Authorization order enforced before every operation.
 * Message bodies are never written to audit events or meter records.
 * Message editing/deletion is deferred (not partially implemented).
 */

import "server-only";

import { getPayload } from "payload";
import config from "@/payload.config";
import { appendConnectAuditEvent } from "../audit";
import { createConnectPublicId, normalizeConnectPublicId } from "../ids";
import { incrementConnectMeter } from "../metering/service";
import { connectDailyPeriodKey } from "../metering/period";
import {
  authorizeConnectMessaging,
  connectMessagingSafeError,
} from "./authorization";
import {
  validateConnectGroupTitle,
  validateConnectMessageContent,
} from "./content";
import { buildDirectConversationPairKey } from "./pair-key";
import {
  clampConnectMessagePageSize,
  compareConnectMessageOrder,
  decodeConnectMessageCursor,
  encodeConnectMessageCursor,
  paginateConnectMessages,
} from "./pagination";
import {
  derivePrivateUnreadState,
  resolveMarkReadCursor,
} from "./read-state";
import {
  loadConnectMembershipById,
  type ConnectStaffSession,
} from "./session";
import type {
  ConnectConversationParticipantRecord,
  ConnectConversationRecord,
  ConnectConversationStatus,
  ConnectConversationType,
  ConnectMessageRecord,
} from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    const id = Number((value as AnyDoc).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

function mapConversation(doc: AnyDoc): ConnectConversationRecord {
  return {
    id: Number(doc.id),
    publicId: String(doc.publicId),
    organizationId: relId(doc.organization)!,
    type: doc.type as ConnectConversationType,
    status: doc.status as ConnectConversationStatus,
    title: doc.title ? String(doc.title) : null,
    directPairKey: doc.directPairKey ? String(doc.directPairKey) : null,
    createdAt: String(doc.createdAt),
    latestMessageAt: doc.latestMessageAt ? String(doc.latestMessageAt) : null,
  };
}

function mapParticipant(doc: AnyDoc): ConnectConversationParticipantRecord {
  return {
    id: Number(doc.id),
    publicId: String(doc.publicId),
    organizationId: relId(doc.organization)!,
    conversationId: relId(doc.conversation)!,
    membershipId: relId(doc.membership)!,
    status: doc.status === "left" ? "left" : "active",
    lastReadMessagePublicId: doc.lastReadMessagePublicId
      ? String(doc.lastReadMessagePublicId)
      : null,
    lastReadAt: doc.lastReadAt ? String(doc.lastReadAt) : null,
    joinedAt: String(doc.joinedAt ?? doc.createdAt),
  };
}

function mapMessage(doc: AnyDoc): ConnectMessageRecord {
  return {
    id: Number(doc.id),
    publicId: String(doc.publicId),
    organizationId: relId(doc.organization)!,
    conversationId: relId(doc.conversation)!,
    authorParticipantId: relId(doc.authorParticipant)!,
    body: String(doc.body ?? ""),
    createdAt: String(doc.createdAt),
  };
}

async function loadConversationByPublicId(
  publicId: string,
): Promise<ConnectConversationRecord | null> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-conversations" as any,
    where: { publicId: { equals: publicId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (result.docs.length === 0) return null;
  return mapConversation(result.docs[0] as AnyDoc);
}

async function loadActiveParticipation(
  conversationId: number,
  membershipId: number,
): Promise<ConnectConversationParticipantRecord | null> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-conversation-participants" as any,
    where: {
      and: [
        { conversation: { equals: conversationId } },
        { membership: { equals: membershipId } },
        { status: { equals: "active" } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (result.docs.length === 0) return null;
  return mapParticipant(result.docs[0] as AnyDoc);
}

function sessionAuth(
  session: ConnectStaffSession,
  operation: Parameters<typeof authorizeConnectMessaging>[0]["operation"],
  conversation?: ConnectConversationRecord | null,
  participation?: ConnectConversationParticipantRecord | null,
) {
  return authorizeConnectMessaging({
    subjectKind: "staff-user",
    staffEmail: session.staffEmail,
    staffUserId: session.staffUserId,
    organization: session.organization,
    membership: session.membership,
    conversation: conversation ?? null,
    participation: participation ?? null,
    operation,
  });
}

export function projectConversationSafe(c: ConnectConversationRecord) {
  return {
    publicId: c.publicId,
    type: c.type,
    status: c.status,
    title: c.title,
    createdAt: c.createdAt,
    latestMessageAt: c.latestMessageAt,
  };
}

export function projectMessageSafe(
  m: ConnectMessageRecord,
  authorParticipantPublicId: string | null,
) {
  return {
    publicId: m.publicId,
    body: m.body,
    createdAt: m.createdAt,
    authorParticipantPublicId,
  };
}

export async function createDirectConversationForSession(input: {
  session: ConnectStaffSession;
  otherMembershipId: number;
}): Promise<
  | { ok: true; conversation: ReturnType<typeof projectConversationSafe>; created: boolean }
  | { ok: false; status: number; message: string }
> {
  const gate = sessionAuth(input.session, "create_direct_conversation");
  if (!gate.allowed) {
    const err = connectMessagingSafeError(gate.reason);
    return { ok: false, status: err.status, message: err.message };
  }

  const other = await loadConnectMembershipById({
    membershipId: input.otherMembershipId,
    organizationId: input.session.organization.id,
  });
  if (
    !other ||
    other.status !== "active" ||
    other.subjectKind !== "staff-user" ||
    other.staffUserId == null ||
    other.id === input.session.membership.id
  ) {
    return { ok: false, status: 400, message: "Invalid participants." };
  }

  const pairKey = buildDirectConversationPairKey({
    organizationId: input.session.organization.id,
    participantA: {
      membershipId: input.session.membership.id,
      staffUserId: input.session.membership.staffUserId!,
    },
    participantB: {
      membershipId: other.id,
      staffUserId: other.staffUserId,
    },
  });
  if (!pairKey) {
    return { ok: false, status: 400, message: "Invalid participants." };
  }

  const payload = await getPayload({ config });
  const existing = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-conversations" as any,
    where: {
      and: [
        { organization: { equals: input.session.organization.id } },
        { type: { equals: "direct" } },
        { status: { equals: "active" } },
        { directPairKey: { equals: pairKey } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (existing.docs.length > 0) {
    return {
      ok: true,
      conversation: projectConversationSafe(
        mapConversation(existing.docs[0] as AnyDoc),
      ),
      created: false,
    };
  }

  const now = new Date().toISOString();
  const publicId = createConnectPublicId();
  try {
    const created = (await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-conversations" as any,
      data: {
        publicId,
        organization: input.session.organization.id,
        type: "direct",
        status: "active",
        title: null,
        directPairKey: pairKey,
        latestMessageAt: null,
      },
      overrideAccess: true,
    })) as AnyDoc;

    for (const membershipId of [input.session.membership.id, other.id]) {
      await payload.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "connect-conversation-participants" as any,
        data: {
          publicId: createConnectPublicId(),
          organization: input.session.organization.id,
          conversation: created.id,
          membership: membershipId,
          status: "active",
          joinedAt: now,
        },
        overrideAccess: true,
      });
    }

    await appendConnectAuditEvent({
      type: "conversation.created",
      organizationId: input.session.organization.id,
      actorKind: "operator",
      actorOperatorUserId: input.session.staffUserId,
      summary: "Direct conversation created",
      metadata: { conversationPublicId: publicId, type: "direct" },
    });

    await incrementConnectMeter({
      organizationId: input.session.organization.id,
      meterKey: "conversations_created",
      delta: 1,
      idempotencyKey: `conversation:${publicId}`,
      caller: { trustedServerCaller: true },
    });

    return {
      ok: true,
      conversation: projectConversationSafe(mapConversation(created)),
      created: true,
    };
  } catch {
    // Concurrent create — unique index on pair key; return existing.
    const raced = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-conversations" as any,
      where: {
        and: [
          { organization: { equals: input.session.organization.id } },
          { type: { equals: "direct" } },
          { status: { equals: "active" } },
          { directPairKey: { equals: pairKey } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (raced.docs.length > 0) {
      return {
        ok: true,
        conversation: projectConversationSafe(
          mapConversation(raced.docs[0] as AnyDoc),
        ),
        created: false,
      };
    }
    return { ok: false, status: 500, message: "Unable to create conversation." };
  }
}

export async function createGroupConversationForSession(input: {
  session: ConnectStaffSession;
  memberMembershipIds: number[];
  title?: string | null;
}): Promise<
  | { ok: true; conversation: ReturnType<typeof projectConversationSafe> }
  | { ok: false; status: number; message: string }
> {
  const gate = sessionAuth(input.session, "create_group_conversation");
  if (!gate.allowed) {
    const err = connectMessagingSafeError(gate.reason);
    return { ok: false, status: err.status, message: err.message };
  }

  const titleResult = validateConnectGroupTitle(input.title);
  if (!titleResult.ok) {
    return { ok: false, status: 400, message: titleResult.message };
  }

  const membershipIds = new Set<number>([input.session.membership.id]);
  for (const id of input.memberMembershipIds) {
    const m = await loadConnectMembershipById({
      membershipId: id,
      organizationId: input.session.organization.id,
    });
    if (!m || m.status !== "active" || m.subjectKind !== "staff-user") {
      return { ok: false, status: 400, message: "Invalid participants." };
    }
    membershipIds.add(m.id);
  }

  if (membershipIds.size < 2) {
    return {
      ok: false,
      status: 400,
      message: "Group conversations require at least two participants.",
    };
  }

  const payload = await getPayload({ config });
  const now = new Date().toISOString();
  const publicId = createConnectPublicId();
  const created = (await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-conversations" as any,
    data: {
      publicId,
      organization: input.session.organization.id,
      type: "group",
      status: "active",
      title: titleResult.title,
      directPairKey: null,
      latestMessageAt: null,
    },
    overrideAccess: true,
  })) as AnyDoc;

  for (const membershipId of membershipIds) {
    await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-conversation-participants" as any,
      data: {
        publicId: createConnectPublicId(),
        organization: input.session.organization.id,
        conversation: created.id,
        membership: membershipId,
        status: "active",
        joinedAt: now,
      },
      overrideAccess: true,
    });
  }

  await appendConnectAuditEvent({
    type: "conversation.created",
    organizationId: input.session.organization.id,
    actorKind: "operator",
    actorOperatorUserId: input.session.staffUserId,
    summary: "Group conversation created",
    metadata: {
      conversationPublicId: publicId,
      type: "group",
      participantCount: membershipIds.size,
    },
  });

  await incrementConnectMeter({
    organizationId: input.session.organization.id,
    meterKey: "conversations_created",
    delta: 1,
    idempotencyKey: `conversation:${publicId}`,
    caller: { trustedServerCaller: true },
  });

  return {
    ok: true,
    conversation: projectConversationSafe(mapConversation(created)),
  };
}

export async function listConversationsForSession(input: {
  session: ConnectStaffSession;
}): Promise<
  | { ok: true; conversations: ReturnType<typeof projectConversationSafe>[] }
  | { ok: false; status: number; message: string }
> {
  const gate = sessionAuth(input.session, "list_conversations");
  if (!gate.allowed) {
    const err = connectMessagingSafeError(gate.reason);
    return { ok: false, status: err.status, message: err.message };
  }

  const payload = await getPayload({ config });
  const parts = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-conversation-participants" as any,
    where: {
      and: [
        { membership: { equals: input.session.membership.id } },
        { organization: { equals: input.session.organization.id } },
        { status: { equals: "active" } },
      ],
    },
    limit: 200,
    depth: 0,
    overrideAccess: true,
  });

  const conversationIds = [
    ...new Set(
      parts.docs
        .map((d) => relId((d as AnyDoc).conversation))
        .filter((id): id is number => id != null),
    ),
  ];

  if (conversationIds.length === 0) {
    return { ok: true, conversations: [] };
  }

  const conversations = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-conversations" as any,
    where: {
      and: [
        { id: { in: conversationIds } },
        { organization: { equals: input.session.organization.id } },
      ],
    },
    limit: 200,
    depth: 0,
    overrideAccess: true,
    sort: "-latestMessageAt",
  });

  return {
    ok: true,
    conversations: conversations.docs.map((d) =>
      projectConversationSafe(mapConversation(d as AnyDoc)),
    ),
  };
}

export async function getConversationForSession(input: {
  session: ConnectStaffSession;
  conversationPublicId: string;
}): Promise<
  | { ok: true; conversation: ReturnType<typeof projectConversationSafe> }
  | { ok: false; status: number; message: string }
> {
  const publicId = normalizeConnectPublicId(input.conversationPublicId);
  if (!publicId) {
    return { ok: false, status: 404, message: "Not found." };
  }
  const conversation = await loadConversationByPublicId(publicId);
  const participation = conversation
    ? await loadActiveParticipation(
        conversation.id,
        input.session.membership.id,
      )
    : null;
  const gate = sessionAuth(
    input.session,
    "get_conversation",
    conversation,
    participation,
  );
  if (!gate.allowed) {
    const err = connectMessagingSafeError(gate.reason);
    return { ok: false, status: err.status, message: err.message };
  }
  return {
    ok: true,
    conversation: projectConversationSafe(conversation!),
  };
}

export async function listMessagesForSession(input: {
  session: ConnectStaffSession;
  conversationPublicId: string;
  cursor?: string | null;
  direction?: "before" | "after";
  limit?: number | null;
}): Promise<
  | {
      ok: true;
      messages: ReturnType<typeof projectMessageSafe>[];
      nextCursor: string | null;
      prevCursor: string | null;
      hasMore: boolean;
    }
  | { ok: false; status: number; message: string }
> {
  const publicId = normalizeConnectPublicId(input.conversationPublicId);
  if (!publicId) {
    return { ok: false, status: 404, message: "Not found." };
  }
  const conversation = await loadConversationByPublicId(publicId);
  const participation = conversation
    ? await loadActiveParticipation(
        conversation.id,
        input.session.membership.id,
      )
    : null;
  const gate = sessionAuth(
    input.session,
    "list_messages",
    conversation,
    participation,
  );
  if (!gate.allowed) {
    const err = connectMessagingSafeError(gate.reason);
    return { ok: false, status: err.status, message: err.message };
  }

  const limit = clampConnectMessagePageSize(input.limit);
  const cursor = decodeConnectMessageCursor(input.cursor);
  const direction = input.direction ?? "before";

  const payload = await getPayload({ config });
  // Fetch a bounded window larger than page size for stable in-process paging.
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-messages" as any,
    where: {
      and: [
        { conversation: { equals: conversation!.id } },
        { organization: { equals: input.session.organization.id } },
      ],
    },
    limit: Math.min(500, limit * 10),
    depth: 0,
    overrideAccess: true,
    sort: "createdAt",
  });

  const messages = (result.docs as AnyDoc[])
    .map(mapMessage)
    .filter((m) => m.organizationId === input.session.organization.id)
    .sort(compareConnectMessageOrder);

  const page = paginateConnectMessages({
    messages,
    limit,
    cursor,
    direction,
  });

  const authorIds = [...new Set(page.messages.map((m) => m.authorParticipantId))];
  const authorPublicIds = new Map<number, string>();
  if (authorIds.length > 0) {
    const authors = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-conversation-participants" as any,
      where: {
        and: [
          { id: { in: authorIds } },
          { organization: { equals: input.session.organization.id } },
        ],
      },
      limit: authorIds.length,
      depth: 0,
      overrideAccess: true,
    });
    for (const doc of authors.docs as AnyDoc[]) {
      authorPublicIds.set(Number(doc.id), String(doc.publicId));
    }
  }

  return {
    ok: true,
    messages: page.messages.map((m) =>
      projectMessageSafe(m, authorPublicIds.get(m.authorParticipantId) ?? null),
    ),
    nextCursor: page.nextCursor
      ? encodeConnectMessageCursor(page.nextCursor)
      : null,
    prevCursor: page.prevCursor
      ? encodeConnectMessageCursor(page.prevCursor)
      : null,
    hasMore: page.hasMore,
  };
}

export async function sendMessageForSession(input: {
  session: ConnectStaffSession;
  conversationPublicId: string;
  body: unknown;
  claimedAuthorParticipantId?: number | null;
}): Promise<
  | { ok: true; message: ReturnType<typeof projectMessageSafe> }
  | { ok: false; status: number; message: string }
> {
  const publicId = normalizeConnectPublicId(input.conversationPublicId);
  if (!publicId) {
    return { ok: false, status: 404, message: "Not found." };
  }
  const conversation = await loadConversationByPublicId(publicId);
  const participation = conversation
    ? await loadActiveParticipation(
        conversation.id,
        input.session.membership.id,
      )
    : null;
  const gate = sessionAuth(
    input.session,
    "send_message",
    conversation,
    participation,
  );
  if (!gate.allowed) {
    const err = connectMessagingSafeError(gate.reason);
    return { ok: false, status: err.status, message: err.message };
  }

  if (
    input.claimedAuthorParticipantId != null &&
    input.claimedAuthorParticipantId !== participation!.id
  ) {
    return { ok: false, status: 403, message: "Connect is unavailable." };
  }

  const content = validateConnectMessageContent(input.body);
  if (!content.ok) {
    return { ok: false, status: 400, message: content.message };
  }

  const payload = await getPayload({ config });
  const messagePublicId = createConnectPublicId();
  const created = (await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-messages" as any,
    data: {
      publicId: messagePublicId,
      organization: input.session.organization.id,
      conversation: conversation!.id,
      authorParticipant: participation!.id,
      body: content.body,
    },
    overrideAccess: true,
  })) as AnyDoc;

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-conversations" as any,
    id: conversation!.id,
    data: { latestMessageAt: created.createdAt ?? new Date().toISOString() },
    overrideAccess: true,
  });

  // Meter only after durable create — idempotent per message public id.
  await incrementConnectMeter({
    organizationId: input.session.organization.id,
    meterKey: "messages_sent",
    delta: 1,
    periodKey: connectDailyPeriodKey(),
    idempotencyKey: `message:${messagePublicId}`,
    caller: { trustedServerCaller: true },
  });

  return {
    ok: true,
    message: projectMessageSafe(mapMessage(created), participation!.publicId),
  };
}

export async function getUnreadForSession(input: {
  session: ConnectStaffSession;
  conversationPublicId: string;
}): Promise<
  | {
      ok: true;
      unread: {
        conversationPublicId: string;
        unreadCount: number;
        lastReadMessagePublicId: string | null;
        latestMessagePublicId: string | null;
      };
    }
  | { ok: false; status: number; message: string }
> {
  const publicId = normalizeConnectPublicId(input.conversationPublicId);
  if (!publicId) {
    return { ok: false, status: 404, message: "Not found." };
  }
  const conversation = await loadConversationByPublicId(publicId);
  const participation = conversation
    ? await loadActiveParticipation(
        conversation.id,
        input.session.membership.id,
      )
    : null;
  const gate = sessionAuth(
    input.session,
    "read_unread_state",
    conversation,
    participation,
  );
  if (!gate.allowed) {
    const err = connectMessagingSafeError(gate.reason);
    return { ok: false, status: err.status, message: err.message };
  }

  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-messages" as any,
    where: {
      and: [
        { conversation: { equals: conversation!.id } },
        { organization: { equals: input.session.organization.id } },
      ],
    },
    limit: 500,
    depth: 0,
    overrideAccess: true,
    sort: "createdAt",
  });
  const messages = (result.docs as AnyDoc[]).map(mapMessage);
  const unread = derivePrivateUnreadState({
    conversationPublicId: conversation!.publicId,
    participant: participation!,
    messages,
  });
  return { ok: true, unread };
}

export async function markReadForSession(input: {
  session: ConnectStaffSession;
  conversationPublicId: string;
  targetMessagePublicId?: string | null;
}): Promise<
  | {
      ok: true;
      unread: {
        conversationPublicId: string;
        unreadCount: number;
        lastReadMessagePublicId: string | null;
        latestMessagePublicId: string | null;
      };
      changed: boolean;
    }
  | { ok: false; status: number; message: string }
> {
  const publicId = normalizeConnectPublicId(input.conversationPublicId);
  if (!publicId) {
    return { ok: false, status: 404, message: "Not found." };
  }
  const conversation = await loadConversationByPublicId(publicId);
  const participation = conversation
    ? await loadActiveParticipation(
        conversation.id,
        input.session.membership.id,
      )
    : null;
  const gate = sessionAuth(
    input.session,
    "mark_read",
    conversation,
    participation,
  );
  if (!gate.allowed) {
    const err = connectMessagingSafeError(gate.reason);
    return { ok: false, status: err.status, message: err.message };
  }

  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-messages" as any,
    where: {
      and: [
        { conversation: { equals: conversation!.id } },
        { organization: { equals: input.session.organization.id } },
      ],
    },
    limit: 500,
    depth: 0,
    overrideAccess: true,
    sort: "createdAt",
  });
  const messages = (result.docs as AnyDoc[]).map(mapMessage);
  const resolved = resolveMarkReadCursor({
    participant: participation!,
    messages,
    targetMessagePublicId: input.targetMessagePublicId,
  });
  if (!resolved.ok) {
    return { ok: false, status: 404, message: "Not found." };
  }

  if (resolved.changed) {
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-conversation-participants" as any,
      id: participation!.id,
      data: {
        lastReadMessagePublicId: resolved.lastReadMessagePublicId,
        lastReadAt: new Date().toISOString(),
      },
      overrideAccess: true,
    });
    participation!.lastReadMessagePublicId = resolved.lastReadMessagePublicId;
    participation!.lastReadAt = new Date().toISOString();
  }

  const unread = derivePrivateUnreadState({
    conversationPublicId: conversation!.publicId,
    participant: participation!,
    messages,
  });
  return { ok: true, unread, changed: resolved.changed };
}

export async function addParticipantForSession(input: {
  session: ConnectStaffSession;
  conversationPublicId: string;
  membershipId: number;
}): Promise<
  | { ok: true }
  | { ok: false; status: number; message: string }
> {
  const publicId = normalizeConnectPublicId(input.conversationPublicId);
  if (!publicId) {
    return { ok: false, status: 404, message: "Not found." };
  }
  const conversation = await loadConversationByPublicId(publicId);
  const participation = conversation
    ? await loadActiveParticipation(
        conversation.id,
        input.session.membership.id,
      )
    : null;
  const gate = sessionAuth(
    input.session,
    "add_participant",
    conversation,
    participation,
  );
  if (!gate.allowed) {
    const err = connectMessagingSafeError(gate.reason);
    return { ok: false, status: err.status, message: err.message };
  }
  if (!conversation || conversation.type !== "group") {
    return { ok: false, status: 400, message: "Invalid conversation." };
  }

  const membership = await loadConnectMembershipById({
    membershipId: input.membershipId,
    organizationId: input.session.organization.id,
  });
  if (!membership || membership.status !== "active") {
    return { ok: false, status: 400, message: "Invalid participants." };
  }

  const existing = await loadActiveParticipation(
    conversation.id,
    membership.id,
  );
  if (existing) {
    return { ok: false, status: 409, message: "Participant already present." };
  }

  const payload = await getPayload({ config });
  try {
    await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-conversation-participants" as any,
      data: {
        publicId: createConnectPublicId(),
        organization: input.session.organization.id,
        conversation: conversation.id,
        membership: membership.id,
        status: "active",
        joinedAt: new Date().toISOString(),
      },
      overrideAccess: true,
    });
  } catch {
    return { ok: false, status: 409, message: "Participant already present." };
  }

  await appendConnectAuditEvent({
    type: "conversation.participant_added",
    organizationId: input.session.organization.id,
    actorKind: "operator",
    actorOperatorUserId: input.session.staffUserId,
    summary: "Participant added",
    metadata: {
      conversationPublicId: conversation.publicId,
      membershipId: membership.id,
    },
  });

  return { ok: true };
}

export async function removeParticipantForSession(input: {
  session: ConnectStaffSession;
  conversationPublicId: string;
  membershipId: number;
}): Promise<
  | { ok: true }
  | { ok: false; status: number; message: string }
> {
  const publicId = normalizeConnectPublicId(input.conversationPublicId);
  if (!publicId) {
    return { ok: false, status: 404, message: "Not found." };
  }
  const conversation = await loadConversationByPublicId(publicId);
  const participation = conversation
    ? await loadActiveParticipation(
        conversation.id,
        input.session.membership.id,
      )
    : null;
  const isSelf = input.membershipId === input.session.membership.id;
  const gate = sessionAuth(
    input.session,
    "remove_participant",
    conversation,
    participation,
  );
  if (!gate.allowed) {
    const err = connectMessagingSafeError(gate.reason);
    return { ok: false, status: err.status, message: err.message };
  }
  if (
    !isSelf &&
    input.session.role !== "platform-operator" &&
    input.session.role !== "organization-admin"
  ) {
    return { ok: false, status: 404, message: "Not found." };
  }

  const target = conversation
    ? await loadActiveParticipation(conversation.id, input.membershipId)
    : null;
  if (!conversation || !target) {
    return { ok: false, status: 404, message: "Not found." };
  }

  const payload = await getPayload({ config });
  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-conversation-participants" as any,
    id: target.id,
    data: { status: "left" },
    overrideAccess: true,
  });

  await appendConnectAuditEvent({
    type: "conversation.participant_removed",
    organizationId: input.session.organization.id,
    actorKind: "operator",
    actorOperatorUserId: input.session.staffUserId,
    summary: "Participant removed",
    metadata: {
      conversationPublicId: conversation.publicId,
      membershipId: input.membershipId,
    },
  });

  return { ok: true };
}
