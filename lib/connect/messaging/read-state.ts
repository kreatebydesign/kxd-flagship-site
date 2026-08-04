/**
 * Phase 6 Batch C1 — private per-participant unread/read-state primitives.
 *
 * Read state is never visible to other participants (no read receipts).
 * List/fetch does not auto mark-read.
 */

import { compareConnectMessageOrder } from "./pagination";
import type {
  ConnectConversationParticipantRecord,
  ConnectMessageRecord,
} from "../types";

export type ConnectUnreadState = {
  conversationPublicId: string;
  unreadCount: number;
  lastReadMessagePublicId: string | null;
  latestMessagePublicId: string | null;
};

/**
 * Derive unread count for one participant without scanning other users' state.
 * Uses last-read cursor + ordered messages newer than that cursor.
 */
export function derivePrivateUnreadState(input: {
  conversationPublicId: string;
  participant: Pick<
    ConnectConversationParticipantRecord,
    "lastReadMessagePublicId"
  >;
  messages: readonly ConnectMessageRecord[];
}): ConnectUnreadState {
  const sorted = [...input.messages].sort(compareConnectMessageOrder);
  const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null;

  if (!input.participant.lastReadMessagePublicId) {
    return {
      conversationPublicId: input.conversationPublicId,
      unreadCount: sorted.length,
      lastReadMessagePublicId: null,
      latestMessagePublicId: latest?.publicId ?? null,
    };
  }

  const lastRead = sorted.find(
    (m) => m.publicId === input.participant.lastReadMessagePublicId,
  );

  if (!lastRead) {
    // Cursor references a missing/unknown message — treat as fully unread
    // only when there are messages; safe fail-closed for unread derivation.
    return {
      conversationPublicId: input.conversationPublicId,
      unreadCount: sorted.length,
      lastReadMessagePublicId: input.participant.lastReadMessagePublicId,
      latestMessagePublicId: latest?.publicId ?? null,
    };
  }

  const unreadCount = sorted.filter(
    (m) => compareConnectMessageOrder(m, lastRead) > 0,
  ).length;

  return {
    conversationPublicId: input.conversationPublicId,
    unreadCount,
    lastReadMessagePublicId: input.participant.lastReadMessagePublicId,
    latestMessagePublicId: latest?.publicId ?? null,
  };
}

/**
 * Compute next last-read cursor for mark-read.
 * Idempotent when already at or ahead of the target message.
 * Concurrent newer messages after mark-read remain unread (safe).
 */
export function resolveMarkReadCursor(input: {
  participant: Pick<
    ConnectConversationParticipantRecord,
    "lastReadMessagePublicId"
  >;
  messages: readonly ConnectMessageRecord[];
  /** When omitted, mark up to the latest message currently known. */
  targetMessagePublicId?: string | null;
}): {
  ok: true;
  lastReadMessagePublicId: string | null;
  changed: boolean;
} | { ok: false; reason: "message_not_found" } {
  const sorted = [...input.messages].sort(compareConnectMessageOrder);
  if (sorted.length === 0) {
    return {
      ok: true,
      lastReadMessagePublicId: input.participant.lastReadMessagePublicId,
      changed: false,
    };
  }

  let target: ConnectMessageRecord | undefined;
  if (input.targetMessagePublicId) {
    target = sorted.find((m) => m.publicId === input.targetMessagePublicId);
    if (!target) return { ok: false, reason: "message_not_found" };
  } else {
    target = sorted[sorted.length - 1];
  }

  const currentId = input.participant.lastReadMessagePublicId;
  if (currentId) {
    const current = sorted.find((m) => m.publicId === currentId);
    if (current && compareConnectMessageOrder(current, target) >= 0) {
      return {
        ok: true,
        lastReadMessagePublicId: currentId,
        changed: false,
      };
    }
  }

  return {
    ok: true,
    lastReadMessagePublicId: target.publicId,
    changed: true,
  };
}

/** Unread state of participant A must never appear in participant B's projection. */
export function assertPrivateUnreadIsolation(input: {
  viewerParticipantId: number;
  projectedParticipantIds: readonly number[];
}): boolean {
  return input.projectedParticipantIds.every(
    (id) => id === input.viewerParticipantId,
  );
}
