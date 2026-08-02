/**
 * Phase 6 Batch C3 — database-native Connect message retrieval.
 *
 * Normal runtime paths (history, older pages, polling, unread, mark-read)
 * use bounded indexed queries. They must not load a ~500-message window
 * into application memory.
 *
 * The former in-process 500-message window is retired from normal UI/API
 * operation. In-memory pagination helpers remain for unit tests and the
 * in-memory messaging store only.
 */

import "server-only";

import { sql } from "@payloadcms/db-postgres";
import {
  asRowList,
  canUseConnectPostgres,
  getConnectPostgresExecutor,
} from "../db";
import type { ConnectMessageRecord } from "../types";
import {
  clampConnectMessagePageSize,
  compareConnectMessageOrder,
  type ConnectMessageCursor,
} from "./pagination";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PayloadLike = { db?: any; find: (...args: any[]) => Promise<any> };

type MessageRow = {
  id: number | string;
  public_id: string;
  organization_id: number | string;
  conversation_id: number | string;
  author_participant_id: number | string;
  body: string | null;
  created_at: string | Date;
};

function toIso(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

function mapRow(row: MessageRow): ConnectMessageRecord {
  return {
    id: Number(row.id),
    publicId: String(row.public_id),
    organizationId: Number(row.organization_id),
    conversationId: Number(row.conversation_id),
    authorParticipantId: Number(row.author_participant_id),
    body: String(row.body ?? ""),
    createdAt: toIso(row.created_at),
  };
}

function mapPayloadDoc(doc: AnyDoc): ConnectMessageRecord {
  const org =
    typeof doc.organization === "object" && doc.organization != null
      ? Number((doc.organization as AnyDoc).id)
      : Number(doc.organization);
  const conv =
    typeof doc.conversation === "object" && doc.conversation != null
      ? Number((doc.conversation as AnyDoc).id)
      : Number(doc.conversation);
  const author =
    typeof doc.authorParticipant === "object" && doc.authorParticipant != null
      ? Number((doc.authorParticipant as AnyDoc).id)
      : Number(doc.authorParticipant);
  return {
    id: Number(doc.id),
    publicId: String(doc.publicId),
    organizationId: org,
    conversationId: conv,
    authorParticipantId: author,
    body: String(doc.body ?? ""),
    createdAt: String(doc.createdAt),
  };
}

function cursorWhere(
  cursor: ConnectMessageCursor,
  direction: "before" | "after",
): AnyDoc {
  if (direction === "after") {
    return {
      or: [
        { createdAt: { greater_than: cursor.createdAt } },
        {
          and: [
            { createdAt: { equals: cursor.createdAt } },
            { publicId: { greater_than: cursor.publicId } },
          ],
        },
      ],
    };
  }
  return {
    or: [
      { createdAt: { less_than: cursor.createdAt } },
      {
        and: [
          { createdAt: { equals: cursor.createdAt } },
          { publicId: { less_than: cursor.publicId } },
        ],
      },
    ],
  };
}

export type ConnectMessagePageQueryResult = {
  messages: ConnectMessageRecord[];
  hasMore: boolean;
  nextCursor: ConnectMessageCursor | null;
  prevCursor: ConnectMessageCursor | null;
  /** True when the Postgres indexed path was used. */
  usedPostgres: boolean;
};

/**
 * Bounded page of messages for a conversation — history (`before`) or poll (`after`).
 * Fetches at most `limit + 1` rows from the database (never a 500-message window).
 */
export async function queryConnectMessagePage(input: {
  payload: PayloadLike;
  organizationId: number;
  conversationId: number;
  limit?: number | null;
  cursor?: ConnectMessageCursor | null;
  direction?: "before" | "after";
}): Promise<ConnectMessagePageQueryResult> {
  const limit = clampConnectMessagePageSize(input.limit);
  const direction = input.direction ?? "before";
  const cursor = input.cursor ?? null;

  if (canUseConnectPostgres(input.payload)) {
    const page = await queryMessagePagePostgres({
      payload: input.payload,
      organizationId: input.organizationId,
      conversationId: input.conversationId,
      limit,
      cursor,
      direction,
    });
    return { ...page, usedPostgres: true };
  }

  const page = await queryMessagePagePayload({
    payload: input.payload,
    organizationId: input.organizationId,
    conversationId: input.conversationId,
    limit,
    cursor,
    direction,
  });
  return { ...page, usedPostgres: false };
}

async function queryMessagePagePostgres(input: {
  payload: PayloadLike;
  organizationId: number;
  conversationId: number;
  limit: number;
  cursor: ConnectMessageCursor | null;
  direction: "before" | "after";
}): Promise<Omit<ConnectMessagePageQueryResult, "usedPostgres">> {
  const executor = getConnectPostgresExecutor(input.payload);
  if (!executor) {
    throw new Error("Connect Postgres executor unavailable");
  }

  const fetchLimit = input.limit + 1;
  let rows: MessageRow[];

  if (input.direction === "after") {
    if (!input.cursor) {
      rows = [];
    } else {
      const result = await executor.execute(sql`
        SELECT
          "id",
          "public_id",
          "organization_id",
          "conversation_id",
          "author_participant_id",
          "body",
          "created_at"
        FROM "connect_messages"
        WHERE "organization_id" = ${input.organizationId}
          AND "conversation_id" = ${input.conversationId}
          AND (
            "created_at" > ${input.cursor.createdAt}::timestamptz
            OR (
              "created_at" = ${input.cursor.createdAt}::timestamptz
              AND "public_id" > ${input.cursor.publicId}
            )
          )
        ORDER BY "created_at" ASC, "public_id" ASC
        LIMIT ${fetchLimit}
      `);
      rows = asRowList<MessageRow>(result as never);
    }
  } else if (!input.cursor) {
    const result = await executor.execute(sql`
      SELECT
        "id",
        "public_id",
        "organization_id",
        "conversation_id",
        "author_participant_id",
        "body",
        "created_at"
      FROM "connect_messages"
      WHERE "organization_id" = ${input.organizationId}
        AND "conversation_id" = ${input.conversationId}
      ORDER BY "created_at" DESC, "public_id" DESC
      LIMIT ${fetchLimit}
    `);
    rows = asRowList<MessageRow>(result as never).reverse();
  } else {
    const result = await executor.execute(sql`
      SELECT
        "id",
        "public_id",
        "organization_id",
        "conversation_id",
        "author_participant_id",
        "body",
        "created_at"
      FROM "connect_messages"
      WHERE "organization_id" = ${input.organizationId}
        AND "conversation_id" = ${input.conversationId}
        AND (
          "created_at" < ${input.cursor.createdAt}::timestamptz
          OR (
            "created_at" = ${input.cursor.createdAt}::timestamptz
            AND "public_id" < ${input.cursor.publicId}
          )
        )
      ORDER BY "created_at" DESC, "public_id" DESC
      LIMIT ${fetchLimit}
    `);
    rows = asRowList<MessageRow>(result as never).reverse();
  }

  // `after`: ASC rows, optional extra at end.
  // `before`: DESC fetch then reverse → ASC; optional extra oldest at start.
  const hasMore = rows.length > input.limit;
  const pageRows =
    input.direction === "after"
      ? rows.slice(0, input.limit)
      : hasMore
        ? rows.slice(1)
        : rows;
  const ordered = pageRows.map(mapRow);

  return {
    messages: ordered,
    hasMore,
    nextCursor:
      ordered.length > 0
        ? {
            createdAt: ordered[ordered.length - 1].createdAt,
            publicId: ordered[ordered.length - 1].publicId,
          }
        : null,
    prevCursor:
      ordered.length > 0
        ? {
            createdAt: ordered[0].createdAt,
            publicId: ordered[0].publicId,
          }
        : null,
  };
}

async function queryMessagePagePayload(input: {
  payload: PayloadLike;
  organizationId: number;
  conversationId: number;
  limit: number;
  cursor: ConnectMessageCursor | null;
  direction: "before" | "after";
}): Promise<Omit<ConnectMessagePageQueryResult, "usedPostgres">> {
  const fetchLimit = input.limit + 1;
  const baseWhere: AnyDoc[] = [
    { conversation: { equals: input.conversationId } },
    { organization: { equals: input.organizationId } },
  ];
  if (input.cursor) {
    baseWhere.push(cursorWhere(input.cursor, input.direction));
  } else if (input.direction === "after") {
    return {
      messages: [],
      hasMore: false,
      nextCursor: null,
      prevCursor: null,
    };
  }

  const sort =
    input.direction === "after" ? "createdAt" : ("-createdAt" as const);

  const result = await input.payload.find({
    collection: "connect-messages",
    where: { and: baseWhere },
    limit: fetchLimit,
    depth: 0,
    overrideAccess: true,
    sort,
  });

  const docs = (result.docs as AnyDoc[]).map(mapPayloadDoc);
  const hasMore = docs.length > input.limit;
  // after: ASC; before: DESC → reverse to ASC (extra oldest becomes index 0).
  const pageDocs =
    input.direction === "after"
      ? docs.slice(0, input.limit)
      : [...docs.slice(0, input.limit)].reverse();
  const ordered = pageDocs;

  return {
    messages: ordered,
    hasMore,
    nextCursor:
      ordered.length > 0
        ? {
            createdAt: ordered[ordered.length - 1].createdAt,
            publicId: ordered[ordered.length - 1].publicId,
          }
        : null,
    prevCursor:
      ordered.length > 0
        ? {
            createdAt: ordered[0].createdAt,
            publicId: ordered[0].publicId,
          }
        : null,
  };
}

export type ConnectUnreadQueryResult = {
  unreadCount: number;
  lastReadMessagePublicId: string | null;
  latestMessagePublicId: string | null;
  usedPostgres: boolean;
};

/** Private unread count via COUNT(*) / latest lookup — no message window load. */
export async function queryConnectUnreadState(input: {
  payload: PayloadLike;
  organizationId: number;
  conversationId: number;
  conversationPublicId: string;
  lastReadMessagePublicId: string | null;
}): Promise<ConnectUnreadQueryResult> {
  if (canUseConnectPostgres(input.payload)) {
    const executor = getConnectPostgresExecutor(input.payload)!;
    const latestRows = asRowList<{ public_id: string }>(
      (await executor.execute(sql`
        SELECT "public_id"
        FROM "connect_messages"
        WHERE "organization_id" = ${input.organizationId}
          AND "conversation_id" = ${input.conversationId}
        ORDER BY "created_at" DESC, "public_id" DESC
        LIMIT 1
      `)) as never,
    );
    const latestMessagePublicId = latestRows[0]?.public_id
      ? String(latestRows[0].public_id)
      : null;

    let unreadCount = 0;
    if (!input.lastReadMessagePublicId) {
      const countRows = asRowList<{ count: string | number }>(
        (await executor.execute(sql`
          SELECT COUNT(*)::int AS "count"
          FROM "connect_messages"
          WHERE "organization_id" = ${input.organizationId}
            AND "conversation_id" = ${input.conversationId}
        `)) as never,
      );
      unreadCount = Number(countRows[0]?.count ?? 0);
    } else {
      const countRows = asRowList<{ count: string | number }>(
        (await executor.execute(sql`
          SELECT COUNT(*)::int AS "count"
          FROM "connect_messages" AS m
          WHERE m."organization_id" = ${input.organizationId}
            AND m."conversation_id" = ${input.conversationId}
            AND EXISTS (
              SELECT 1
              FROM "connect_messages" AS lr
              WHERE lr."public_id" = ${input.lastReadMessagePublicId}
                AND lr."organization_id" = ${input.organizationId}
                AND lr."conversation_id" = ${input.conversationId}
            )
            AND (
              m."created_at" > (
                SELECT lr."created_at"
                FROM "connect_messages" AS lr
                WHERE lr."public_id" = ${input.lastReadMessagePublicId}
                  AND lr."organization_id" = ${input.organizationId}
                  AND lr."conversation_id" = ${input.conversationId}
                LIMIT 1
              )
              OR (
                m."created_at" = (
                  SELECT lr."created_at"
                  FROM "connect_messages" AS lr
                  WHERE lr."public_id" = ${input.lastReadMessagePublicId}
                    AND lr."organization_id" = ${input.organizationId}
                    AND lr."conversation_id" = ${input.conversationId}
                  LIMIT 1
                )
                AND m."public_id" > ${input.lastReadMessagePublicId}
              )
            )
        `)) as never,
      );
      // If last-read message is missing, treat all as unread (fail-closed for unread).
      const existsRows = asRowList<{ exists: boolean }>(
        (await executor.execute(sql`
          SELECT EXISTS (
            SELECT 1
            FROM "connect_messages"
            WHERE "public_id" = ${input.lastReadMessagePublicId}
              AND "organization_id" = ${input.organizationId}
              AND "conversation_id" = ${input.conversationId}
          ) AS "exists"
        `)) as never,
      );
      if (!existsRows[0]?.exists) {
        const allRows = asRowList<{ count: string | number }>(
          (await executor.execute(sql`
            SELECT COUNT(*)::int AS "count"
            FROM "connect_messages"
            WHERE "organization_id" = ${input.organizationId}
              AND "conversation_id" = ${input.conversationId}
          `)) as never,
        );
        unreadCount = Number(allRows[0]?.count ?? 0);
      } else {
        unreadCount = Number(countRows[0]?.count ?? 0);
      }
    }

    return {
      unreadCount,
      lastReadMessagePublicId: input.lastReadMessagePublicId,
      latestMessagePublicId,
      usedPostgres: true,
    };
  }

  // SQLite / LocalAPI fallback — bounded page walks only (never a 500 dump).
  // Postgres COUNT path above is required for dogfood.
  const latestPage = await queryMessagePagePayload({
    payload: input.payload,
    organizationId: input.organizationId,
    conversationId: input.conversationId,
    limit: 1,
    cursor: null,
    direction: "before",
  });
  const latestMessagePublicId =
    latestPage.messages[0]?.publicId ??
    latestPage.messages[latestPage.messages.length - 1]?.publicId ??
    null;
  // newest-first page of 1 → messages[0] is oldest of that page = the newest message
  const latestId =
    latestPage.messages.length > 0
      ? latestPage.messages[latestPage.messages.length - 1].publicId
      : null;

  let unreadCount = 0;
  if (!input.lastReadMessagePublicId) {
    const counted = await input.payload.find({
      collection: "connect-messages",
      where: {
        and: [
          { conversation: { equals: input.conversationId } },
          { organization: { equals: input.organizationId } },
        ],
      },
      limit: 0,
      depth: 0,
      overrideAccess: true,
    });
    unreadCount = Number(counted.totalDocs ?? 0);
  } else {
    const lastRead = await loadConnectMessageByPublicId({
      payload: input.payload,
      organizationId: input.organizationId,
      conversationId: input.conversationId,
      publicId: input.lastReadMessagePublicId,
    });
    if (!lastRead) {
      const counted = await input.payload.find({
        collection: "connect-messages",
        where: {
          and: [
            { conversation: { equals: input.conversationId } },
            { organization: { equals: input.organizationId } },
          ],
        },
        limit: 0,
        depth: 0,
        overrideAccess: true,
      });
      unreadCount = Number(counted.totalDocs ?? 0);
    } else {
      const after = await queryMessagePagePayload({
        payload: input.payload,
        organizationId: input.organizationId,
        conversationId: input.conversationId,
        limit: 50,
        cursor: {
          createdAt: lastRead.createdAt,
          publicId: lastRead.publicId,
        },
        direction: "after",
      });
      // Count via repeated after pages (bounded 50) — sqlite local only.
      let cursor: ConnectMessageCursor | null = {
        createdAt: lastRead.createdAt,
        publicId: lastRead.publicId,
      };
      let guard = 0;
      while (guard < 10_000) {
        guard += 1;
        const page = await queryMessagePagePayload({
          payload: input.payload,
          organizationId: input.organizationId,
          conversationId: input.conversationId,
          limit: 50,
          cursor,
          direction: "after",
        });
        unreadCount += page.messages.length;
        if (!page.hasMore || !page.nextCursor) break;
        cursor = page.nextCursor;
      }
      void after;
    }
  }

  return {
    unreadCount,
    lastReadMessagePublicId: input.lastReadMessagePublicId,
    latestMessagePublicId: latestId ?? latestMessagePublicId,
    usedPostgres: false,
  };
}

export type AdvanceReadPointerResult =
  | {
      ok: true;
      changed: boolean;
      lastReadMessagePublicId: string | null;
      usedPostgres: boolean;
    }
  | { ok: false; reason: "message_not_found"; usedPostgres: boolean };

/**
 * Advance private read pointer only when the target is strictly newer.
 * Identical / older targets do not write.
 */
export async function advanceConnectReadPointer(input: {
  payload: PayloadLike & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: (...args: any[]) => Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    find: (...args: any[]) => Promise<any>;
  };
  organizationId: number;
  conversationId: number;
  participantId: number;
  currentLastReadMessagePublicId: string | null;
  targetMessagePublicId?: string | null;
}): Promise<AdvanceReadPointerResult> {
  const targetPublicId = input.targetMessagePublicId
    ? String(input.targetMessagePublicId)
    : null;

  if (canUseConnectPostgres(input.payload)) {
    const executor = getConnectPostgresExecutor(input.payload)!;

    let target: { public_id: string; created_at: string | Date } | null = null;
    if (targetPublicId) {
      const rows = asRowList<{ public_id: string; created_at: string | Date }>(
        (await executor.execute(sql`
          SELECT "public_id", "created_at"
          FROM "connect_messages"
          WHERE "public_id" = ${targetPublicId}
            AND "organization_id" = ${input.organizationId}
            AND "conversation_id" = ${input.conversationId}
          LIMIT 1
        `)) as never,
      );
      target = rows[0] ?? null;
      if (!target) {
        return { ok: false, reason: "message_not_found", usedPostgres: true };
      }
    } else {
      const rows = asRowList<{ public_id: string; created_at: string | Date }>(
        (await executor.execute(sql`
          SELECT "public_id", "created_at"
          FROM "connect_messages"
          WHERE "organization_id" = ${input.organizationId}
            AND "conversation_id" = ${input.conversationId}
          ORDER BY "created_at" DESC, "public_id" DESC
          LIMIT 1
        `)) as never,
      );
      target = rows[0] ?? null;
      if (!target) {
        return {
          ok: true,
          changed: false,
          lastReadMessagePublicId: input.currentLastReadMessagePublicId,
          usedPostgres: true,
        };
      }
    }

    const targetId = String(target.public_id);
    if (input.currentLastReadMessagePublicId === targetId) {
      return {
        ok: true,
        changed: false,
        lastReadMessagePublicId: targetId,
        usedPostgres: true,
      };
    }

    if (input.currentLastReadMessagePublicId) {
      const currentRows = asRowList<{
        public_id: string;
        created_at: string | Date;
      }>(
        (await executor.execute(sql`
          SELECT "public_id", "created_at"
          FROM "connect_messages"
          WHERE "public_id" = ${input.currentLastReadMessagePublicId}
            AND "organization_id" = ${input.organizationId}
            AND "conversation_id" = ${input.conversationId}
          LIMIT 1
        `)) as never,
      );
      const current = currentRows[0];
      if (current) {
        const cmp = compareConnectMessageOrder(
          { createdAt: toIso(current.created_at), publicId: current.public_id },
          { createdAt: toIso(target.created_at), publicId: target.public_id },
        );
        if (cmp >= 0) {
          return {
            ok: true,
            changed: false,
            lastReadMessagePublicId: input.currentLastReadMessagePublicId,
            usedPostgres: true,
          };
        }
      }
    }

    // Monotonic write: only update when stored pointer is null/missing or older.
    const updated = asRowList<{ id: number | string }>(
      (await executor.execute(sql`
        UPDATE "connect_conversation_participants" AS p
        SET
          "last_read_message_public_id" = ${targetId},
          "last_read_at" = now(),
          "updated_at" = now()
        WHERE p."id" = ${input.participantId}
          AND p."organization_id" = ${input.organizationId}
          AND p."conversation_id" = ${input.conversationId}
          AND (
            p."last_read_message_public_id" IS NULL
            OR p."last_read_message_public_id" = ''
            OR NOT EXISTS (
              SELECT 1
              FROM "connect_messages" AS cur
              WHERE cur."public_id" = p."last_read_message_public_id"
                AND cur."organization_id" = ${input.organizationId}
                AND cur."conversation_id" = ${input.conversationId}
            )
            OR EXISTS (
              SELECT 1
              FROM "connect_messages" AS cur
              WHERE cur."public_id" = p."last_read_message_public_id"
                AND cur."organization_id" = ${input.organizationId}
                AND cur."conversation_id" = ${input.conversationId}
                AND (
                  cur."created_at" < ${toIso(target.created_at)}::timestamptz
                  OR (
                    cur."created_at" = ${toIso(target.created_at)}::timestamptz
                    AND cur."public_id" < ${targetId}
                  )
                )
            )
          )
        RETURNING p."id"
      `)) as never,
    );

    return {
      ok: true,
      changed: updated.length > 0,
      lastReadMessagePublicId:
        updated.length > 0 ? targetId : input.currentLastReadMessagePublicId,
      usedPostgres: true,
    };
  }

  // Payload fallback — resolve target + current with two point lookups.
  let targetMsg: ConnectMessageRecord | null = null;
  if (targetPublicId) {
    const found = await input.payload.find({
      collection: "connect-messages",
      where: {
        and: [
          { publicId: { equals: targetPublicId } },
          { organization: { equals: input.organizationId } },
          { conversation: { equals: input.conversationId } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (found.docs.length === 0) {
      return { ok: false, reason: "message_not_found", usedPostgres: false };
    }
    targetMsg = mapPayloadDoc(found.docs[0] as AnyDoc);
  } else {
    const found = await input.payload.find({
      collection: "connect-messages",
      where: {
        and: [
          { organization: { equals: input.organizationId } },
          { conversation: { equals: input.conversationId } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      sort: "-createdAt",
    });
    if (found.docs.length === 0) {
      return {
        ok: true,
        changed: false,
        lastReadMessagePublicId: input.currentLastReadMessagePublicId,
        usedPostgres: false,
      };
    }
    targetMsg = mapPayloadDoc(found.docs[0] as AnyDoc);
  }

  if (
    input.currentLastReadMessagePublicId &&
    input.currentLastReadMessagePublicId === targetMsg.publicId
  ) {
    return {
      ok: true,
      changed: false,
      lastReadMessagePublicId: input.currentLastReadMessagePublicId,
      usedPostgres: false,
    };
  }

  if (input.currentLastReadMessagePublicId) {
    const found = await input.payload.find({
      collection: "connect-messages",
      where: {
        and: [
          { publicId: { equals: input.currentLastReadMessagePublicId } },
          { organization: { equals: input.organizationId } },
          { conversation: { equals: input.conversationId } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (found.docs.length > 0) {
      const current = mapPayloadDoc(found.docs[0] as AnyDoc);
      if (compareConnectMessageOrder(current, targetMsg) >= 0) {
        return {
          ok: true,
          changed: false,
          lastReadMessagePublicId: input.currentLastReadMessagePublicId,
          usedPostgres: false,
        };
      }
    }
  }

  await input.payload.update({
    collection: "connect-conversation-participants",
    id: input.participantId,
    data: {
      lastReadMessagePublicId: targetMsg.publicId,
      lastReadAt: new Date().toISOString(),
    },
    overrideAccess: true,
  });

  return {
    ok: true,
    changed: true,
    lastReadMessagePublicId: targetMsg.publicId,
    usedPostgres: false,
  };
}

/** Point-load a message by public id within org+conversation scope. */
export async function loadConnectMessageByPublicId(input: {
  payload: PayloadLike;
  organizationId: number;
  conversationId: number;
  publicId: string;
}): Promise<ConnectMessageRecord | null> {
  if (canUseConnectPostgres(input.payload)) {
    const executor = getConnectPostgresExecutor(input.payload)!;
    const rows = asRowList<MessageRow>(
      (await executor.execute(sql`
        SELECT
          "id",
          "public_id",
          "organization_id",
          "conversation_id",
          "author_participant_id",
          "body",
          "created_at"
        FROM "connect_messages"
        WHERE "public_id" = ${input.publicId}
          AND "organization_id" = ${input.organizationId}
          AND "conversation_id" = ${input.conversationId}
        LIMIT 1
      `)) as never,
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  const found = await input.payload.find({
    collection: "connect-messages",
    where: {
      and: [
        { publicId: { equals: input.publicId } },
        { organization: { equals: input.organizationId } },
        { conversation: { equals: input.conversationId } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (found.docs.length === 0) return null;
  return mapPayloadDoc(found.docs[0] as AnyDoc);
}
