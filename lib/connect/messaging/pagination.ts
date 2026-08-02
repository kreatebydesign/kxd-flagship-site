/**
 * Phase 6 Batch C1 — cursor-based message pagination (polling-ready).
 *
 * Ordering: createdAt ASC, publicId ASC (stable under equal timestamps).
 * Supports older-page history and newer-than-cursor short-poll retrieval.
 */

import {
  CONNECT_MESSAGE_PAGE_SIZE_DEFAULT,
  CONNECT_MESSAGE_PAGE_SIZE_MAX,
  type ConnectMessageRecord,
} from "../types";

export type ConnectMessageCursor = {
  createdAt: string;
  publicId: string;
};

export type ConnectMessagePage = {
  messages: ConnectMessageRecord[];
  nextCursor: ConnectMessageCursor | null;
  prevCursor: ConnectMessageCursor | null;
  hasMore: boolean;
};

export function clampConnectMessagePageSize(
  raw: number | null | undefined,
): number {
  if (raw == null || !Number.isFinite(raw)) {
    return CONNECT_MESSAGE_PAGE_SIZE_DEFAULT;
  }
  const n = Math.floor(raw);
  if (n < 1) return 1;
  if (n > CONNECT_MESSAGE_PAGE_SIZE_MAX) return CONNECT_MESSAGE_PAGE_SIZE_MAX;
  return n;
}

export function encodeConnectMessageCursor(
  cursor: ConnectMessageCursor,
): string {
  return Buffer.from(
    JSON.stringify({
      createdAt: cursor.createdAt,
      publicId: cursor.publicId,
    }),
    "utf8",
  ).toString("base64url");
}

export function decodeConnectMessageCursor(
  raw: string | null | undefined,
): ConnectMessageCursor | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as Partial<ConnectMessageCursor>;
    if (
      typeof parsed.createdAt !== "string" ||
      typeof parsed.publicId !== "string" ||
      !parsed.createdAt ||
      !parsed.publicId
    ) {
      return null;
    }
    return { createdAt: parsed.createdAt, publicId: parsed.publicId };
  } catch {
    return null;
  }
}

export function compareConnectMessageOrder(
  a: Pick<ConnectMessageRecord, "createdAt" | "publicId">,
  b: Pick<ConnectMessageRecord, "createdAt" | "publicId">,
): number {
  if (a.createdAt < b.createdAt) return -1;
  if (a.createdAt > b.createdAt) return 1;
  if (a.publicId < b.publicId) return -1;
  if (a.publicId > b.publicId) return 1;
  return 0;
}

/**
 * Paginate a pre-filtered, org+conversation-scoped message list.
 * `direction: "before"` = older history; `"after"` = newer than cursor (poll).
 */
export function paginateConnectMessages(input: {
  messages: readonly ConnectMessageRecord[];
  limit?: number | null;
  cursor?: ConnectMessageCursor | null;
  direction?: "before" | "after";
}): ConnectMessagePage {
  const limit = clampConnectMessagePageSize(input.limit);
  const direction = input.direction ?? "before";
  const sorted = [...input.messages].sort(compareConnectMessageOrder);

  let filtered = sorted;
  if (input.cursor) {
    filtered = sorted.filter((msg) => {
      const cmp = compareConnectMessageOrder(msg, input.cursor!);
      return direction === "after" ? cmp > 0 : cmp < 0;
    });
  }

  let page: ConnectMessageRecord[];
  let hasMore: boolean;

  if (direction === "after") {
    page = filtered.slice(0, limit);
    hasMore = filtered.length > limit;
  } else {
    // History: take the newest `limit` messages among those before the cursor
    // (or the newest page when no cursor).
    const start = Math.max(0, filtered.length - limit);
    page = filtered.slice(start);
    hasMore = start > 0;
  }

  const nextCursor =
    page.length > 0
      ? {
          createdAt: page[page.length - 1].createdAt,
          publicId: page[page.length - 1].publicId,
        }
      : null;
  const prevCursor =
    page.length > 0
      ? {
          createdAt: page[0].createdAt,
          publicId: page[0].publicId,
        }
      : null;

  return { messages: page, nextCursor, prevCursor, hasMore };
}

/** Project only fields needed by a future UI — never internal auth details. */
export function projectConnectMessageForClient(
  message: ConnectMessageRecord,
): {
  publicId: string;
  conversationPublicId?: undefined;
  body: string;
  createdAt: string;
  authorParticipantPublicId: string | null;
} {
  return {
    publicId: message.publicId,
    body: message.body,
    createdAt: message.createdAt,
    authorParticipantPublicId: null,
  };
}
