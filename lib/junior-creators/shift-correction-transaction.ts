/**
 * Payload/Postgres transaction + FOR UPDATE helpers for junior shift corrections.
 *
 * Serializes concurrent admin mutations so correctionAudit appends cannot be lost.
 */
import "server-only";

import {
  commitTransaction,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadRequest,
} from "payload";
import { sql } from "@payloadcms/db-postgres";

export type CorrectionTxReq = PayloadRequest & {
  payload: Payload;
  transactionID?: number | string | Promise<number | string | null> | null;
};

type DrizzleSession = {
  db: {
    execute: (query: unknown) => Promise<unknown>;
  };
};

function getAdapterSessions(payload: Payload): Record<string, DrizzleSession> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = payload.db as any;
  if (!adapter?.sessions || typeof adapter.beginTransaction !== "function") {
    throw new Error("Junior shift corrections require a transactional Postgres adapter.");
  }
  return adapter.sessions as Record<string, DrizzleSession>;
}

export async function createCorrectionRequest(payload: Payload): Promise<CorrectionTxReq> {
  return { payload } as CorrectionTxReq;
}

/**
 * Begin a Payload DB transaction and return whether this caller owns commit/rollback.
 */
export async function beginCorrectionTransaction(req: CorrectionTxReq): Promise<boolean> {
  const started = await initTransaction(req);
  if (!started && !req.transactionID) {
    throw new Error("Failed to begin junior shift correction transaction.");
  }
  return started;
}

export async function commitCorrectionTransaction(
  req: CorrectionTxReq,
  ownsTransaction: boolean,
): Promise<void> {
  if (!ownsTransaction) return;
  await commitTransaction(req);
}

export async function rollbackCorrectionTransaction(
  req: CorrectionTxReq,
  ownsTransaction: boolean,
): Promise<void> {
  if (!ownsTransaction) return;
  await killTransaction(req);
}

/**
 * Acquire deterministic FOR UPDATE row locks on junior_creator_shifts rows.
 * IDs are sorted ascending before locking to avoid deadlocks.
 */
export async function lockJuniorShiftRowsForUpdate(
  req: CorrectionTxReq,
  shiftIds: number[],
): Promise<void> {
  const uniqueSorted = [...new Set(shiftIds.map((id) => Number(id)))]
    .filter((id) => Number.isFinite(id) && id > 0)
    .sort((a, b) => a - b);

  if (uniqueSorted.length === 0) {
    throw new Error("At least one junior shift id is required for row locking.");
  }

  const transactionID = await req.transactionID;
  if (!transactionID) {
    throw new Error("Cannot lock junior shifts without an active transaction.");
  }

  const sessions = getAdapterSessions(req.payload);
  const session = sessions[String(transactionID)];
  if (!session?.db) {
    throw new Error("Junior shift correction transaction session is unavailable.");
  }

  for (const id of uniqueSorted) {
    await session.db.execute(
      sql`SELECT id FROM junior_creator_shifts WHERE id = ${id} FOR UPDATE`,
    );
  }
}

/**
 * Run work inside a Payload transaction with FOR UPDATE locks on the given shift IDs.
 * Commits on success; rolls back on any thrown error when this caller owns the txn.
 */
export async function withJuniorShiftCorrectionTransaction<T>(
  payload: Payload,
  shiftIds: number[],
  work: (req: CorrectionTxReq) => Promise<T>,
): Promise<T> {
  const req = await createCorrectionRequest(payload);
  const ownsTransaction = await beginCorrectionTransaction(req);

  try {
    await lockJuniorShiftRowsForUpdate(req, shiftIds);
    const result = await work(req);
    await commitCorrectionTransaction(req, ownsTransaction);
    return result;
  } catch (error) {
    await rollbackCorrectionTransaction(req, ownsTransaction);
    throw error;
  }
}
