/**
 * Phase 6 Batch C2 — UI-oriented Connect messaging projections.
 *
 * Builds on C1 ownership/authorization without exposing internal IDs,
 * pair keys, other users' read state, or operator notes.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@/payload.config";
import { CONNECT_MESSAGE_MAX_LENGTH } from "../types";
import { authorizeConnectMessaging, connectMessagingSafeError } from "./authorization";
import { derivePrivateUnreadState } from "./read-state";
import {
  createDirectConversationForSession,
  createGroupConversationForSession,
  getConversationForSession,
  getUnreadForSession,
  listMessagesForSession,
  markReadForSession,
  sendMessageForSession,
} from "./service";
import type { ConnectStaffSession } from "./session";
import {
  CONNECT_GROUP_MAX_PARTICIPANTS,
  type ConnectUiConversation,
  type ConnectUiEligibleMember,
  type ConnectUiMessage,
  type ConnectUiUnread,
} from "./ui-types";

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

function staffDisplayName(user: AnyDoc | null | undefined, emailFallback: string): string {
  const name =
    typeof user?.displayName === "string" && user.displayName.trim()
      ? user.displayName.trim()
      : typeof user?.email === "string"
        ? user.email
        : emailFallback;
  return name.slice(0, 120);
}

function previewBody(body: string): string {
  const oneLine = body.replace(/\s+/g, " ").trim();
  if (oneLine.length <= 120) return oneLine;
  return `${oneLine.slice(0, 117)}…`;
}

async function resolveMembershipStaffLabel(
  membershipId: number,
  organizationId: number,
): Promise<{ email: string; displayName: string } | null> {
  const payload = await getPayload({ config });
  try {
    const mem = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-organization-memberships" as any,
      id: membershipId,
      depth: 1,
      overrideAccess: true,
    })) as AnyDoc;
    if (relId(mem.organization) !== organizationId) return null;
    if (mem.subjectKind !== "staff-user" || mem.status !== "active") return null;
    const staff =
      typeof mem.staffUser === "object" && mem.staffUser != null
        ? (mem.staffUser as AnyDoc)
        : null;
    const email =
      typeof staff?.email === "string"
        ? staff.email.trim().toLowerCase()
        : "";
    if (!email) return null;
    return { email, displayName: staffDisplayName(staff, email) };
  } catch {
    return null;
  }
}

async function findActiveMembershipByStaffEmail(input: {
  organizationId: number;
  staffEmail: string;
}): Promise<number | null> {
  const email = input.staffEmail.trim().toLowerCase();
  if (!email || !email.includes("@")) return null;
  const payload = await getPayload({ config });
  const users = await payload.find({
    collection: "users",
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (users.docs.length === 0) return null;
  const staffUserId = Number(users.docs[0].id);
  const memberships = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-organization-memberships" as any,
    where: {
      and: [
        { organization: { equals: input.organizationId } },
        { subjectKind: { equals: "staff-user" } },
        { staffUser: { equals: staffUserId } },
        { status: { equals: "active" } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (memberships.docs.length === 0) return null;
  return Number(memberships.docs[0].id);
}

async function enrichConversation(
  session: ConnectStaffSession,
  publicId: string,
  base: {
    type: "direct" | "group";
    status: "active" | "archived";
    title: string | null;
    createdAt: string;
    latestMessageAt: string | null;
  },
): Promise<ConnectUiConversation | null> {
  const payload = await getPayload({ config });
  const conv = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-conversations" as any,
    where: {
      and: [
        { publicId: { equals: publicId } },
        { organization: { equals: session.organization.id } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (conv.docs.length === 0) return null;
  const conversationId = Number(conv.docs[0].id);

  const parts = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-conversation-participants" as any,
    where: {
      and: [
        { conversation: { equals: conversationId } },
        { organization: { equals: session.organization.id } },
        { status: { equals: "active" } },
      ],
    },
    limit: 40,
    depth: 0,
    overrideAccess: true,
  });

  let selfParticipantPublicId: string | null = null;
  const labels: string[] = [];
  let selfParticipation: {
    lastReadMessagePublicId: string | null;
  } | null = null;

  for (const doc of parts.docs as AnyDoc[]) {
    const membershipId = relId(doc.membership);
    if (membershipId == null) continue;
    if (membershipId === session.membership.id) {
      selfParticipantPublicId = String(doc.publicId);
      selfParticipation = {
        lastReadMessagePublicId: doc.lastReadMessagePublicId
          ? String(doc.lastReadMessagePublicId)
          : null,
      };
      continue;
    }
    const label = await resolveMembershipStaffLabel(
      membershipId,
      session.organization.id,
    );
    if (label) labels.push(label.displayName);
  }

  labels.sort((a, b) => a.localeCompare(b));

  const displayLabel =
    base.type === "group"
      ? base.title?.trim() ||
        (labels.length > 0 ? labels.join(", ") : "Group conversation")
      : labels[0] || "Direct conversation";

  // Latest preview — single newest message only (no unbounded fetch).
  const latest = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-messages" as any,
    where: {
      and: [
        { conversation: { equals: conversationId } },
        { organization: { equals: session.organization.id } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    sort: "-createdAt",
  });
  const latestPreview =
    latest.docs.length > 0
      ? previewBody(String((latest.docs[0] as AnyDoc).body ?? ""))
      : null;

  // Private unread — bounded recent window for count (C1 scaling note).
  const recent = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-messages" as any,
    where: {
      and: [
        { conversation: { equals: conversationId } },
        { organization: { equals: session.organization.id } },
      ],
    },
    limit: 200,
    depth: 0,
    overrideAccess: true,
    sort: "createdAt",
  });
  const messages = (recent.docs as AnyDoc[]).map((d) => ({
    id: Number(d.id),
    publicId: String(d.publicId),
    organizationId: session.organization.id,
    conversationId,
    authorParticipantId: relId(d.authorParticipant) ?? 0,
    body: String(d.body ?? ""),
    createdAt: String(d.createdAt),
  }));
  const unread = derivePrivateUnreadState({
    conversationPublicId: publicId,
    participant: selfParticipation ?? { lastReadMessagePublicId: null },
    messages,
  });

  return {
    publicId,
    type: base.type,
    status: base.status,
    title: base.title,
    displayLabel,
    participantLabels: labels,
    latestMessageAt: base.latestMessageAt,
    latestPreview,
    unreadCount: unread.unreadCount,
    selfParticipantPublicId,
    createdAt: base.createdAt,
  };
}

export async function listConversationsForUi(input: {
  session: ConnectStaffSession;
}): Promise<
  | { ok: true; conversations: ConnectUiConversation[] }
  | { ok: false; status: number; message: string }
> {
  const gate = authorizeConnectMessaging({
    subjectKind: "staff-user",
    staffEmail: input.session.staffEmail,
    staffUserId: input.session.staffUserId,
    organization: input.session.organization,
    membership: input.session.membership,
    operation: "list_conversations",
  });
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

  const out: ConnectUiConversation[] = [];
  for (const doc of conversations.docs as AnyDoc[]) {
    const enriched = await enrichConversation(input.session, String(doc.publicId), {
      type: doc.type,
      status: doc.status,
      title: doc.title ? String(doc.title) : null,
      createdAt: String(doc.createdAt),
      latestMessageAt: doc.latestMessageAt ? String(doc.latestMessageAt) : null,
    });
    if (enriched) out.push(enriched);
  }

  out.sort((a, b) => {
    const aT = a.latestMessageAt ?? a.createdAt;
    const bT = b.latestMessageAt ?? b.createdAt;
    return aT < bT ? 1 : aT > bT ? -1 : 0;
  });

  return { ok: true, conversations: out };
}

export async function getConversationForUi(input: {
  session: ConnectStaffSession;
  conversationPublicId: string;
}): Promise<
  | { ok: true; conversation: ConnectUiConversation }
  | { ok: false; status: number; message: string }
> {
  const base = await getConversationForSession(input);
  if (!base.ok) return base;
  const enriched = await enrichConversation(
    input.session,
    base.conversation.publicId,
    base.conversation,
  );
  if (!enriched) {
    return { ok: false, status: 404, message: "Not found." };
  }
  return { ok: true, conversation: enriched };
}

export async function listMessagesForUi(input: {
  session: ConnectStaffSession;
  conversationPublicId: string;
  cursor?: string | null;
  direction?: "before" | "after";
  limit?: number | null;
}): Promise<
  | {
      ok: true;
      messages: ConnectUiMessage[];
      nextCursor: string | null;
      prevCursor: string | null;
      hasMore: boolean;
      selfParticipantPublicId: string | null;
    }
  | { ok: false; status: number; message: string }
> {
  const result = await listMessagesForSession(input);
  if (!result.ok) return result;

  const payload = await getPayload({ config });
  const authorNames = new Map<string, string>();
  const participantPublicIds = [
    ...new Set(
      result.messages
        .map((m) => m.authorParticipantPublicId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (participantPublicIds.length > 0) {
    const authors = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-conversation-participants" as any,
      where: {
        and: [
          { publicId: { in: participantPublicIds } },
          { organization: { equals: input.session.organization.id } },
        ],
      },
      limit: participantPublicIds.length,
      depth: 0,
      overrideAccess: true,
    });
    for (const doc of authors.docs as AnyDoc[]) {
      const membershipId = relId(doc.membership);
      if (membershipId == null) continue;
      const label = await resolveMembershipStaffLabel(
        membershipId,
        input.session.organization.id,
      );
      authorNames.set(
        String(doc.publicId),
        label?.displayName ?? "Participant",
      );
    }
  }

  const self = await getConversationForUi({
    session: input.session,
    conversationPublicId: input.conversationPublicId,
  });
  const selfParticipantPublicId = self.ok
    ? self.conversation.selfParticipantPublicId
    : null;

  const messages: ConnectUiMessage[] = result.messages.map((m) => ({
    publicId: m.publicId,
    body: m.body.slice(0, CONNECT_MESSAGE_MAX_LENGTH),
    createdAt: m.createdAt,
    authorParticipantPublicId: m.authorParticipantPublicId,
    authorDisplayName:
      authorNames.get(m.authorParticipantPublicId ?? "") ?? "Participant",
    isSelf:
      selfParticipantPublicId != null &&
      m.authorParticipantPublicId === selfParticipantPublicId,
  }));

  return {
    ok: true,
    messages,
    nextCursor: result.nextCursor,
    prevCursor: result.prevCursor,
    hasMore: result.hasMore,
    selfParticipantPublicId,
  };
}

export async function sendMessageForUi(input: {
  session: ConnectStaffSession;
  conversationPublicId: string;
  body: unknown;
}): Promise<
  | { ok: true; message: ConnectUiMessage }
  | { ok: false; status: number; message: string }
> {
  // Never accept client author/org overrides.
  const result = await sendMessageForSession({
    session: input.session,
    conversationPublicId: input.conversationPublicId,
    body: input.body,
    claimedAuthorParticipantId: null,
  });
  if (!result.ok) return result;

  return {
    ok: true,
    message: {
      publicId: result.message.publicId,
      body: result.message.body,
      createdAt: result.message.createdAt,
      authorParticipantPublicId: result.message.authorParticipantPublicId,
      authorDisplayName: "You",
      isSelf: true,
    },
  };
}

export async function getUnreadForUi(input: {
  session: ConnectStaffSession;
  conversationPublicId: string;
}): Promise<
  | { ok: true; unread: ConnectUiUnread }
  | { ok: false; status: number; message: string }
> {
  return getUnreadForSession(input);
}

export async function markReadForUi(input: {
  session: ConnectStaffSession;
  conversationPublicId: string;
  targetMessagePublicId?: string | null;
}): Promise<
  | { ok: true; unread: ConnectUiUnread; changed: boolean }
  | { ok: false; status: number; message: string }
> {
  return markReadForSession(input);
}

export async function listEligibleMembersForUi(input: {
  session: ConnectStaffSession;
}): Promise<
  | { ok: true; members: ConnectUiEligibleMember[] }
  | { ok: false; status: number; message: string }
> {
  const gate = authorizeConnectMessaging({
    subjectKind: "staff-user",
    staffEmail: input.session.staffEmail,
    staffUserId: input.session.staffUserId,
    organization: input.session.organization,
    membership: input.session.membership,
    operation: "list_conversations",
  });
  if (!gate.allowed) {
    const err = connectMessagingSafeError(gate.reason);
    return { ok: false, status: err.status, message: err.message };
  }

  const payload = await getPayload({ config });
  const memberships = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-organization-memberships" as any,
    where: {
      and: [
        { organization: { equals: input.session.organization.id } },
        { subjectKind: { equals: "staff-user" } },
        { status: { equals: "active" } },
      ],
    },
    limit: 100,
    depth: 1,
    overrideAccess: true,
  });

  const members: ConnectUiEligibleMember[] = [];
  for (const doc of memberships.docs as AnyDoc[]) {
    if (Number(doc.id) === input.session.membership.id) continue;
    const staff =
      typeof doc.staffUser === "object" && doc.staffUser != null
        ? (doc.staffUser as AnyDoc)
        : null;
    const email =
      typeof staff?.email === "string"
        ? staff.email.trim().toLowerCase()
        : "";
    if (!email) continue;
    // Portal subjects never appear — subjectKind filter above.
    members.push({
      staffEmail: email,
      displayName: staffDisplayName(staff, email),
    });
  }

  members.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return { ok: true, members };
}

export async function createDirectConversationForUi(input: {
  session: ConnectStaffSession;
  otherStaffEmail: string;
}): Promise<
  | { ok: true; conversation: ConnectUiConversation; created: boolean }
  | { ok: false; status: number; message: string }
> {
  if (input.otherStaffEmail.trim().toLowerCase() === input.session.staffEmail.toLowerCase()) {
    return { ok: false, status: 400, message: "Invalid participants." };
  }
  const membershipId = await findActiveMembershipByStaffEmail({
    organizationId: input.session.organization.id,
    staffEmail: input.otherStaffEmail,
  });
  if (membershipId == null) {
    return { ok: false, status: 400, message: "Invalid participants." };
  }
  const created = await createDirectConversationForSession({
    session: input.session,
    otherMembershipId: membershipId,
  });
  if (!created.ok) return created;
  const enriched = await enrichConversation(
    input.session,
    created.conversation.publicId,
    created.conversation,
  );
  if (!enriched) {
    return { ok: false, status: 500, message: "Unable to create conversation." };
  }
  return { ok: true, conversation: enriched, created: created.created };
}

export async function createGroupConversationForUi(input: {
  session: ConnectStaffSession;
  title: string;
  memberStaffEmails: string[];
}): Promise<
  | { ok: true; conversation: ConnectUiConversation }
  | { ok: false; status: number; message: string }
> {
  const emails = [
    ...new Set(
      input.memberStaffEmails
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes("@")),
    ),
  ].filter((e) => e !== input.session.staffEmail.toLowerCase());

  // Creator + selected members; total participants = emails.length + 1
  const total = emails.length + 1;
  if (total < 2) {
    return {
      ok: false,
      status: 400,
      message: "Group conversations require at least two participants.",
    };
  }
  if (total > CONNECT_GROUP_MAX_PARTICIPANTS) {
    return {
      ok: false,
      status: 400,
      message: `Group conversations are limited to ${CONNECT_GROUP_MAX_PARTICIPANTS} participants.`,
    };
  }

  const membershipIds: number[] = [];
  for (const email of emails) {
    const id = await findActiveMembershipByStaffEmail({
      organizationId: input.session.organization.id,
      staffEmail: email,
    });
    if (id == null) {
      return { ok: false, status: 400, message: "Invalid participants." };
    }
    membershipIds.push(id);
  }

  const created = await createGroupConversationForSession({
    session: input.session,
    memberMembershipIds: membershipIds,
    title: input.title,
  });
  if (!created.ok) return created;
  const enriched = await enrichConversation(
    input.session,
    created.conversation.publicId,
    created.conversation,
  );
  if (!enriched) {
    return { ok: false, status: 500, message: "Unable to create conversation." };
  }
  return { ok: true, conversation: enriched };
}

export { CONNECT_MESSAGE_MAX_LENGTH, CONNECT_GROUP_MAX_PARTICIPANTS };
