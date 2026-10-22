/**
 * Postgres transaction + FOR UPDATE helpers for staff time punches.
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

export type StaffTimeTxReq = PayloadRequest & {
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
    throw new Error("Staff time requires a transactional Postgres adapter.");
  }
  return adapter.sessions as Record<string, DrizzleSession>;
}

export { withStaffTimeOperatorCorrectionContext } from "./correction-bypass";

export async function createStaffTimeRequest(payload: Payload): Promise<StaffTimeTxReq> {
  return { payload, context: {} } as StaffTimeTxReq;
}

export async function beginStaffTimeTransaction(req: StaffTimeTxReq): Promise<boolean> {
  const started = await initTransaction(req);
  if (!started && !req.transactionID) {
    throw new Error("Failed to begin staff time transaction.");
  }
  return started;
}

export async function commitStaffTimeTransaction(
  req: StaffTimeTxReq,
  ownsTransaction: boolean,
): Promise<void> {
  if (!ownsTransaction) return;
  await commitTransaction(req);
}

export async function rollbackStaffTimeTransaction(
  req: StaffTimeTxReq,
  ownsTransaction: boolean,
): Promise<void> {
  if (!ownsTransaction) return;
  await killTransaction(req);
}

export async function lockStaffTimeShiftForUpdate(
  req: StaffTimeTxReq,
  shiftId: number,
): Promise<void> {
  const id = Number(shiftId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid staff time shift id.");
  }

  const transactionID = await req.transactionID;
  if (!transactionID) {
    throw new Error("Cannot lock staff time shift without an active transaction.");
  }

  const sessions = getAdapterSessions(req.payload);
  const session = sessions[String(transactionID)];
  if (!session?.db) {
    throw new Error("Staff time transaction session is unavailable.");
  }

  await session.db.execute(
    sql`SELECT id FROM staff_time_shifts WHERE id = ${id} FOR UPDATE`,
  );
}

export async function lockStaffUserOpenShiftSlot(
  req: StaffTimeTxReq,
  staffUserId: number,
): Promise<void> {
  const userId = Number(staffUserId);
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new Error("Invalid staff user id.");
  }

  const transactionID = await req.transactionID;
  if (!transactionID) {
    throw new Error("Cannot lock staff user without an active transaction.");
  }

  const sessions = getAdapterSessions(req.payload);
  const session = sessions[String(transactionID)];
  if (!session?.db) {
    throw new Error("Staff time transaction session is unavailable.");
  }

  await session.db.execute(
    sql`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`,
  );
}

export async function withStaffTimeTransaction<T>(
  payload: Payload,
  fn: (req: StaffTimeTxReq) => Promise<T>,
): Promise<T> {
  const req = await createStaffTimeRequest(payload);
  const owns = await beginStaffTimeTransaction(req);
  if (!req.transactionID) {
    throw new Error("Failed to begin staff time transaction.");
  }
  try {
    const result = await fn(req);
    await commitStaffTimeTransaction(req, owns);
    return result;
  } catch (error) {
    await rollbackStaffTimeTransaction(req, owns);
    throw error;
  }
}
