/**
 * Phase 6 Batch C3 — shared Postgres executor detection for Connect.
 *
 * Prefer database-native operations when the Payload Postgres adapter is active.
 * SQLite local fallbacks must not define production Postgres behavior.
 */

import "server-only";

export type ConnectPgExecutable = {
  execute: (query: unknown) => Promise<unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transaction?: (fn: (tx: ConnectPgExecutable) => Promise<any>) => Promise<any>;
};

export function getConnectPostgresExecutor(payload: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db?: any;
}): ConnectPgExecutable | null {
  const db = payload.db;
  if (!db) return null;
  if (db.drizzle && typeof db.drizzle.execute === "function") {
    return db.drizzle as ConnectPgExecutable;
  }
  if (typeof db.execute === "function") {
    return db as ConnectPgExecutable;
  }
  return null;
}

export function canUseConnectPostgres(payload: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db?: any;
}): boolean {
  return getConnectPostgresExecutor(payload) != null;
}

export function asRowList<T>(
  rows: { rows?: T[] } | T[] | null | undefined,
): T[] {
  if (!rows) return [];
  if (Array.isArray(rows)) return rows;
  return rows.rows ?? [];
}
