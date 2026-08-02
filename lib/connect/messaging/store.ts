/**
 * Phase 6 Batch C1 — in-memory Connect messaging engine for verification.
 *
 * Mirrors durable ownership/authorization rules without a database.
 * Concurrent direct-conversation creation is serialized per pair key.
 */

import { createConnectPublicId } from "../ids";
import { authorizeConnectMessaging } from "./authorization";
import { validateConnectGroupTitle, validateConnectMessageContent } from "./content";
import { buildDirectConversationPairKey } from "./pair-key";
import {
  paginateConnectMessages,
  type ConnectMessageCursor,
  type ConnectMessagePage,
} from "./pagination";
import {
  derivePrivateUnreadState,
  resolveMarkReadCursor,
  type ConnectUnreadState,
} from "./read-state";
import type {
  ConnectConversationParticipantRecord,
  ConnectConversationRecord,
  ConnectConversationStatus,
  ConnectConversationType,
  ConnectMembershipRecord,
  ConnectMessageRecord,
  ConnectOrganizationRecord,
  ConnectMembershipRole,
} from "../types";
import type { ConnectMeterStore } from "../metering/store";

export type ConnectMessagingActor = {
  subjectKind: "staff-user";
  staffUserId: number;
  staffEmail: string;
  membership: ConnectMembershipRecord;
  organization: ConnectOrganizationRecord;
  editionFeatureActive?: boolean;
  env?: NodeJS.ProcessEnv;
};

export type ConnectMessagingFailure =
  | { ok: false; reason: string; detail?: string };

type QueueMap = Map<string, Promise<unknown>>;

function enqueue<T>(queues: QueueMap, key: string, task: () => Promise<T>): Promise<T> {
  const prev = queues.get(key) ?? Promise.resolve();
  const next = prev.then(task, task);
  queues.set(
    key,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}

export class InMemoryConnectMessagingStore {
  private conversations = new Map<number, ConnectConversationRecord>();
  private participants = new Map<number, ConnectConversationParticipantRecord>();
  private messages = new Map<number, ConnectMessageRecord>();
  private nextConversationId = 1;
  private nextParticipantId = 1;
  private nextMessageId = 1;
  private pairQueues: QueueMap = new Map();
  private meterStore: ConnectMeterStore | null = null;
  private auditLog: Array<{
    type: string;
    organizationId: number;
    summary: string;
    metadata?: Record<string, unknown>;
  }> = [];

  setMeterStore(store: ConnectMeterStore | null): void {
    this.meterStore = store;
  }

  getAuditLog() {
    return [...this.auditLog];
  }

  reset(): void {
    this.conversations.clear();
    this.participants.clear();
    this.messages.clear();
    this.nextConversationId = 1;
    this.nextParticipantId = 1;
    this.nextMessageId = 1;
    this.pairQueues.clear();
    this.auditLog = [];
  }

  private audit(
    type: string,
    organizationId: number,
    summary: string,
    metadata?: Record<string, unknown>,
  ): void {
    // Never store message bodies.
    const safe = metadata
      ? Object.fromEntries(
          Object.entries(metadata).filter(
            ([k]) => !/message|body|content|filename/i.test(k),
          ),
        )
      : undefined;
    this.auditLog.push({ type, organizationId, summary, metadata: safe });
  }

  private auth(
    actor: ConnectMessagingActor,
    operation: Parameters<typeof authorizeConnectMessaging>[0]["operation"],
    conversation?: ConnectConversationRecord | null,
    participation?: ConnectConversationParticipantRecord | null,
  ) {
    return authorizeConnectMessaging({
      subjectKind: actor.subjectKind,
      staffEmail: actor.staffEmail,
      staffUserId: actor.staffUserId,
      organization: actor.organization,
      membership: actor.membership,
      conversation: conversation ?? null,
      participation: participation ?? null,
      operation,
      editionFeatureActive: actor.editionFeatureActive ?? true,
      env: actor.env,
    });
  }

  private findActiveParticipation(
    conversationId: number,
    membershipId: number,
  ): ConnectConversationParticipantRecord | null {
    for (const p of this.participants.values()) {
      if (
        p.conversationId === conversationId &&
        p.membershipId === membershipId &&
        p.status === "active"
      ) {
        return p;
      }
    }
    return null;
  }

  private conversationParticipants(
    conversationId: number,
    activeOnly = true,
  ): ConnectConversationParticipantRecord[] {
    return [...this.participants.values()].filter(
      (p) =>
        p.conversationId === conversationId &&
        (!activeOnly || p.status === "active"),
    );
  }

  private conversationMessages(conversationId: number): ConnectMessageRecord[] {
    return [...this.messages.values()].filter(
      (m) => m.conversationId === conversationId,
    );
  }

  private findByPublicId(publicId: string): ConnectConversationRecord | null {
    for (const c of this.conversations.values()) {
      if (c.publicId === publicId) return c;
    }
    return null;
  }

  private findDirectByPairKey(
    organizationId: number,
    pairKey: string,
  ): ConnectConversationRecord | null {
    for (const c of this.conversations.values()) {
      if (
        c.organizationId === organizationId &&
        c.type === "direct" &&
        c.status === "active" &&
        c.directPairKey === pairKey
      ) {
        return c;
      }
    }
    return null;
  }

  async createDirectConversation(input: {
    actor: ConnectMessagingActor;
    otherMembership: ConnectMembershipRecord;
    otherOrganization: ConnectOrganizationRecord;
  }): Promise<
    | { ok: true; conversation: ConnectConversationRecord; created: boolean }
    | ConnectMessagingFailure
  > {
    const gate = this.auth(input.actor, "create_direct_conversation");
    if (!gate.allowed) return { ok: false, reason: gate.reason };

    if (
      input.otherMembership.status !== "active" ||
      input.otherOrganization.status !== "active" ||
      input.otherMembership.organizationId !== input.actor.organization.id ||
      input.otherOrganization.id !== input.actor.organization.id ||
      input.otherMembership.subjectKind !== "staff-user" ||
      input.otherMembership.staffUserId == null
    ) {
      return { ok: false, reason: "operation_denied", detail: "invalid_participant" };
    }

    if (input.otherMembership.id === input.actor.membership.id) {
      return { ok: false, reason: "operation_denied", detail: "self_direct" };
    }

    const pairKey = buildDirectConversationPairKey({
      organizationId: input.actor.organization.id,
      participantA: {
        membershipId: input.actor.membership.id,
        staffUserId: input.actor.membership.staffUserId!,
      },
      participantB: {
        membershipId: input.otherMembership.id,
        staffUserId: input.otherMembership.staffUserId,
      },
    });
    if (!pairKey) {
      return { ok: false, reason: "operation_denied", detail: "pair_key" };
    }

    return enqueue(this.pairQueues, pairKey, async () => {
      const existing = this.findDirectByPairKey(
        input.actor.organization.id,
        pairKey,
      );
      if (existing) {
        return { ok: true as const, conversation: existing, created: false };
      }

      const now = new Date().toISOString();
      const conversation: ConnectConversationRecord = {
        id: this.nextConversationId++,
        publicId: createConnectPublicId(),
        organizationId: input.actor.organization.id,
        type: "direct",
        status: "active",
        title: null,
        directPairKey: pairKey,
        createdAt: now,
        latestMessageAt: null,
      };
      this.conversations.set(conversation.id, conversation);

      for (const membershipId of [
        input.actor.membership.id,
        input.otherMembership.id,
      ]) {
        const participant: ConnectConversationParticipantRecord = {
          id: this.nextParticipantId++,
          publicId: createConnectPublicId(),
          organizationId: input.actor.organization.id,
          conversationId: conversation.id,
          membershipId,
          status: "active",
          lastReadMessagePublicId: null,
          lastReadAt: null,
          joinedAt: now,
        };
        this.participants.set(participant.id, participant);
      }

      this.audit(
        "conversation.created",
        input.actor.organization.id,
        "Direct conversation created",
        {
          conversationPublicId: conversation.publicId,
          type: "direct",
        },
      );

      if (this.meterStore) {
        await this.meterStore.increment({
          organizationId: input.actor.organization.id,
          meterKey: "conversations_created",
          periodKind: "daily",
          periodKey: now.slice(0, 10),
          delta: 1,
          idempotencyKey: `conversation:${conversation.publicId}`,
        });
      }

      return { ok: true as const, conversation, created: true };
    });
  }

  async createGroupConversation(input: {
    actor: ConnectMessagingActor;
    memberMemberships: ConnectMembershipRecord[];
    title?: string | null;
  }): Promise<
    | { ok: true; conversation: ConnectConversationRecord }
    | ConnectMessagingFailure
  > {
    const gate = this.auth(input.actor, "create_group_conversation");
    if (!gate.allowed) return { ok: false, reason: gate.reason };

    const titleResult = validateConnectGroupTitle(input.title);
    if (!titleResult.ok) {
      return { ok: false, reason: "invalid_title", detail: titleResult.message };
    }

    const membershipIds = new Set<number>([input.actor.membership.id]);
    for (const m of input.memberMemberships) {
      if (
        m.status !== "active" ||
        m.organizationId !== input.actor.organization.id ||
        m.subjectKind !== "staff-user" ||
        m.staffUserId == null
      ) {
        return {
          ok: false,
          reason: "operation_denied",
          detail: "invalid_participant",
        };
      }
      membershipIds.add(m.id);
    }

    if (membershipIds.size < 2) {
      return {
        ok: false,
        reason: "operation_denied",
        detail: "group_requires_two",
      };
    }

    const now = new Date().toISOString();
    const conversation: ConnectConversationRecord = {
      id: this.nextConversationId++,
      publicId: createConnectPublicId(),
      organizationId: input.actor.organization.id,
      type: "group",
      status: "active",
      title: titleResult.title,
      directPairKey: null,
      createdAt: now,
      latestMessageAt: null,
    };
    this.conversations.set(conversation.id, conversation);

    for (const membershipId of membershipIds) {
      const participant: ConnectConversationParticipantRecord = {
        id: this.nextParticipantId++,
        publicId: createConnectPublicId(),
        organizationId: input.actor.organization.id,
        conversationId: conversation.id,
        membershipId,
        status: "active",
        lastReadMessagePublicId: null,
        lastReadAt: null,
        joinedAt: now,
      };
      this.participants.set(participant.id, participant);
    }

    this.audit(
      "conversation.created",
      input.actor.organization.id,
      "Group conversation created",
      {
        conversationPublicId: conversation.publicId,
        type: "group",
        participantCount: membershipIds.size,
      },
    );

    if (this.meterStore) {
      await this.meterStore.increment({
        organizationId: input.actor.organization.id,
        meterKey: "conversations_created",
        periodKind: "daily",
        periodKey: now.slice(0, 10),
        delta: 1,
        idempotencyKey: `conversation:${conversation.publicId}`,
      });
    }

    return { ok: true, conversation };
  }

  listConversations(actor: ConnectMessagingActor): {
    ok: true;
    conversations: ConnectConversationRecord[];
  } | ConnectMessagingFailure {
    const gate = this.auth(actor, "list_conversations");
    if (!gate.allowed) return { ok: false, reason: gate.reason };

    const ids = new Set<number>();
    for (const p of this.participants.values()) {
      if (
        p.membershipId === actor.membership.id &&
        p.status === "active" &&
        p.organizationId === actor.organization.id
      ) {
        ids.add(p.conversationId);
      }
    }

    const conversations = [...this.conversations.values()]
      .filter(
        (c) =>
          ids.has(c.id) &&
          c.organizationId === actor.organization.id,
      )
      .sort((a, b) => {
        const aT = a.latestMessageAt ?? a.createdAt;
        const bT = b.latestMessageAt ?? b.createdAt;
        return aT < bT ? 1 : aT > bT ? -1 : 0;
      });

    return { ok: true, conversations };
  }

  getConversation(
    actor: ConnectMessagingActor,
    conversationPublicId: string,
  ):
    | { ok: true; conversation: ConnectConversationRecord }
    | ConnectMessagingFailure {
    const conversation = this.findByPublicId(conversationPublicId);
    const participation = conversation
      ? this.findActiveParticipation(conversation.id, actor.membership.id)
      : null;
    const gate = this.auth(actor, "get_conversation", conversation, participation);
    if (!gate.allowed) return { ok: false, reason: gate.reason };
    return { ok: true, conversation: conversation! };
  }

  async addParticipant(input: {
    actor: ConnectMessagingActor;
    conversationPublicId: string;
    membership: ConnectMembershipRecord;
  }): Promise<
    | { ok: true; participant: ConnectConversationParticipantRecord }
    | ConnectMessagingFailure
  > {
    const conversation = this.findByPublicId(input.conversationPublicId);
    const participation = conversation
      ? this.findActiveParticipation(conversation.id, input.actor.membership.id)
      : null;
    const gate = this.auth(
      input.actor,
      "add_participant",
      conversation,
      participation,
    );
    if (!gate.allowed) return { ok: false, reason: gate.reason };
    if (!conversation || conversation.type !== "group") {
      return { ok: false, reason: "operation_denied", detail: "group_only" };
    }
    if (
      input.membership.status !== "active" ||
      input.membership.organizationId !== input.actor.organization.id ||
      input.membership.subjectKind !== "staff-user"
    ) {
      return { ok: false, reason: "operation_denied", detail: "invalid_participant" };
    }

    const existing = this.findActiveParticipation(
      conversation.id,
      input.membership.id,
    );
    if (existing) {
      return { ok: false, reason: "duplicate_participant" };
    }

    const now = new Date().toISOString();
    const participant: ConnectConversationParticipantRecord = {
      id: this.nextParticipantId++,
      publicId: createConnectPublicId(),
      organizationId: input.actor.organization.id,
      conversationId: conversation.id,
      membershipId: input.membership.id,
      status: "active",
      lastReadMessagePublicId: null,
      lastReadAt: null,
      joinedAt: now,
    };
    this.participants.set(participant.id, participant);
    this.audit(
      "conversation.participant_added",
      input.actor.organization.id,
      "Participant added",
      {
        conversationPublicId: conversation.publicId,
        membershipId: input.membership.id,
      },
    );
    return { ok: true, participant };
  }

  async removeParticipant(input: {
    actor: ConnectMessagingActor;
    conversationPublicId: string;
    membershipId: number;
  }): Promise<{ ok: true } | ConnectMessagingFailure> {
    const conversation = this.findByPublicId(input.conversationPublicId);
    const participation = conversation
      ? this.findActiveParticipation(conversation.id, input.actor.membership.id)
      : null;
    const isSelf = input.membershipId === input.actor.membership.id;
    const gate = this.auth(
      input.actor,
      "remove_participant",
      conversation,
      participation,
    );
    if (!gate.allowed && !isSelf) return { ok: false, reason: gate.reason };
    if (!gate.allowed && isSelf) {
      // Self-leave still requires base Connect access + participation.
      const base = this.auth(
        input.actor,
        "get_conversation",
        conversation,
        participation,
      );
      if (!base.allowed) return { ok: false, reason: base.reason };
    } else if (
      !isSelf &&
      gate.allowed &&
      gate.role !== "platform-operator" &&
      gate.role !== "organization-admin"
    ) {
      return { ok: false, reason: "operation_denied" };
    }

    if (!conversation || !participation) {
      return { ok: false, reason: "not_conversation_participant" };
    }

    const target = this.findActiveParticipation(
      conversation.id,
      input.membershipId,
    );
    if (!target) return { ok: false, reason: "not_conversation_participant" };

    const activeCount = this.conversationParticipants(conversation.id).length;
    if (conversation.type === "group" && activeCount <= 2 && !isSelf) {
      // Allow removal but group may drop below 2 — C1 allows leave; creation enforces ≥2.
    }

    target.status = "left";
    this.participants.set(target.id, target);
    this.audit(
      "conversation.participant_removed",
      input.actor.organization.id,
      "Participant removed",
      {
        conversationPublicId: conversation.publicId,
        membershipId: input.membershipId,
      },
    );
    return { ok: true };
  }

  async setConversationStatus(input: {
    actor: ConnectMessagingActor;
    conversationPublicId: string;
    status: ConnectConversationStatus;
  }): Promise<
    | { ok: true; conversation: ConnectConversationRecord }
    | ConnectMessagingFailure
  > {
    const conversation = this.findByPublicId(input.conversationPublicId);
    const participation = conversation
      ? this.findActiveParticipation(conversation.id, input.actor.membership.id)
      : null;
    const operation =
      input.status === "archived"
        ? "archive_conversation"
        : "reactivate_conversation";
    const gate = this.auth(input.actor, operation, conversation, participation);
    if (!gate.allowed) return { ok: false, reason: gate.reason };
    conversation!.status = input.status;
    this.conversations.set(conversation!.id, conversation!);
    this.audit(
      input.status === "archived"
        ? "conversation.archived"
        : "conversation.reactivated",
      input.actor.organization.id,
      input.status === "archived"
        ? "Conversation archived"
        : "Conversation reactivated",
      { conversationPublicId: conversation!.publicId },
    );
    return { ok: true, conversation: conversation! };
  }

  listMessages(input: {
    actor: ConnectMessagingActor;
    conversationPublicId: string;
    limit?: number | null;
    cursor?: ConnectMessageCursor | null;
    direction?: "before" | "after";
  }):
    | { ok: true; page: ConnectMessagePage; conversationType: ConnectConversationType }
    | ConnectMessagingFailure {
    const conversation = this.findByPublicId(input.conversationPublicId);
    const participation = conversation
      ? this.findActiveParticipation(conversation.id, input.actor.membership.id)
      : null;
    const gate = this.auth(
      input.actor,
      "list_messages",
      conversation,
      participation,
    );
    if (!gate.allowed) return { ok: false, reason: gate.reason };

    const messages = this.conversationMessages(conversation!.id).filter(
      (m) => m.organizationId === input.actor.organization.id,
    );
    const page = paginateConnectMessages({
      messages,
      limit: input.limit,
      cursor: input.cursor,
      direction: input.direction,
    });
    return { ok: true, page, conversationType: conversation!.type };
  }

  async sendMessage(input: {
    actor: ConnectMessagingActor;
    conversationPublicId: string;
    body: unknown;
    /** Rejected — author is always the authenticated participant. */
    claimedAuthorParticipantId?: number | null;
  }): Promise<
    | { ok: true; message: ConnectMessageRecord }
    | ConnectMessagingFailure
  > {
    const conversation = this.findByPublicId(input.conversationPublicId);
    const participation = conversation
      ? this.findActiveParticipation(conversation.id, input.actor.membership.id)
      : null;
    const gate = this.auth(
      input.actor,
      "send_message",
      conversation,
      participation,
    );
    if (!gate.allowed) return { ok: false, reason: gate.reason };

    if (
      input.claimedAuthorParticipantId != null &&
      input.claimedAuthorParticipantId !== participation!.id
    ) {
      return { ok: false, reason: "operation_denied", detail: "impersonation" };
    }

    const content = validateConnectMessageContent(input.body);
    if (!content.ok) {
      return { ok: false, reason: content.reason, detail: content.message };
    }

    const now = new Date().toISOString();
    const message: ConnectMessageRecord = {
      id: this.nextMessageId++,
      publicId: createConnectPublicId(),
      organizationId: input.actor.organization.id,
      conversationId: conversation!.id,
      authorParticipantId: participation!.id,
      body: content.body,
      createdAt: now,
    };
    this.messages.set(message.id, message);
    conversation!.latestMessageAt = now;
    this.conversations.set(conversation!.id, conversation!);

    if (this.meterStore) {
      await this.meterStore.increment({
        organizationId: input.actor.organization.id,
        meterKey: "messages_sent",
        periodKind: "daily",
        periodKey: now.slice(0, 10),
        delta: 1,
        idempotencyKey: `message:${message.publicId}`,
      });
    }

    return { ok: true, message };
  }

  getUnreadState(input: {
    actor: ConnectMessagingActor;
    conversationPublicId: string;
  }):
    | { ok: true; unread: ConnectUnreadState }
    | ConnectMessagingFailure {
    const conversation = this.findByPublicId(input.conversationPublicId);
    const participation = conversation
      ? this.findActiveParticipation(conversation.id, input.actor.membership.id)
      : null;
    const gate = this.auth(
      input.actor,
      "read_unread_state",
      conversation,
      participation,
    );
    if (!gate.allowed) return { ok: false, reason: gate.reason };

    const unread = derivePrivateUnreadState({
      conversationPublicId: conversation!.publicId,
      participant: participation!,
      messages: this.conversationMessages(conversation!.id),
    });
    return { ok: true, unread };
  }

  markRead(input: {
    actor: ConnectMessagingActor;
    conversationPublicId: string;
    targetMessagePublicId?: string | null;
  }):
    | { ok: true; unread: ConnectUnreadState; changed: boolean }
    | ConnectMessagingFailure {
    const conversation = this.findByPublicId(input.conversationPublicId);
    const participation = conversation
      ? this.findActiveParticipation(conversation.id, input.actor.membership.id)
      : null;
    const gate = this.auth(
      input.actor,
      "mark_read",
      conversation,
      participation,
    );
    if (!gate.allowed) return { ok: false, reason: gate.reason };

    const resolved = resolveMarkReadCursor({
      participant: participation!,
      messages: this.conversationMessages(conversation!.id),
      targetMessagePublicId: input.targetMessagePublicId,
    });
    if (!resolved.ok) return { ok: false, reason: resolved.reason };

    if (resolved.changed) {
      participation!.lastReadMessagePublicId = resolved.lastReadMessagePublicId;
      participation!.lastReadAt = new Date().toISOString();
      this.participants.set(participation!.id, participation!);
    }

    const unread = derivePrivateUnreadState({
      conversationPublicId: conversation!.publicId,
      participant: participation!,
      messages: this.conversationMessages(conversation!.id),
    });
    return { ok: true, unread, changed: resolved.changed };
  }

  /** Test helper — simulate deactivated membership losing access. */
  participantFor(
    conversationPublicId: string,
    membershipId: number,
  ): ConnectConversationParticipantRecord | null {
    const conversation = this.findByPublicId(conversationPublicId);
    if (!conversation) return null;
    return this.findActiveParticipation(conversation.id, membershipId);
  }

  messagesForOrg(organizationId: number): ConnectMessageRecord[] {
    return [...this.messages.values()].filter(
      (m) => m.organizationId === organizationId,
    );
  }

  conversationsForOrg(organizationId: number): ConnectConversationRecord[] {
    return [...this.conversations.values()].filter(
      (c) => c.organizationId === organizationId,
    );
  }
}

export function createTestMessagingActor(input: {
  organization: ConnectOrganizationRecord;
  membership: ConnectMembershipRecord;
  staffEmail: string;
  role?: ConnectMembershipRole;
  env?: NodeJS.ProcessEnv;
}): ConnectMessagingActor {
  return {
    subjectKind: "staff-user",
    staffUserId: input.membership.staffUserId!,
    staffEmail: input.staffEmail,
    organization: input.organization,
    membership: {
      ...input.membership,
      role: input.role ?? input.membership.role,
    },
    editionFeatureActive: true,
    env: input.env,
  };
}
