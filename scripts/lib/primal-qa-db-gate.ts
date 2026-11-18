/**
 * Refuse Primal local QA scripts unless DATABASE target is disposable SQLite.
 */
import { formatDbTarget, resolveDbTarget } from "./payload-db-target.ts";

/** Ensure portal/ingest QA never binds to disposable Postgres or production URIs. */
export function enforcePrimalLocalQaEnv(): void {
  const sqlitePath = process.env.PAYLOAD_SQLITE_PATH?.trim();
  if (!sqlitePath?.includes("primal-qa-integration")) {
    throw new Error(
      "Refusing Primal QA: set PAYLOAD_SQLITE_PATH=file:./.payload/primal-qa-integration.sqlite in worktree .env.local",
    );
  }
  delete process.env.DATABASE_URI;
  delete process.env.DATABASE_URL;
  delete process.env.POSTGRES_URL;
  delete process.env.POSTGRES_PRISMA_URL;
}

export function assertPrimalLocalQaDatabase(): void {
  enforcePrimalLocalQaEnv();
  const target = resolveDbTarget();
  if (target.kind !== "sqlite" || !target.isLocal) {
    throw new Error(
      [
        "Refusing Primal QA: require local SQLite (nonproduction).",
        `Resolved: ${formatDbTarget(target)}`,
        "Use worktree .env.local with PAYLOAD_SQLITE_PATH=file:./.payload/primal-qa-integration.sqlite",
      ].join("\n"),
    );
  }
  const sqlitePath =
    process.env.PAYLOAD_SQLITE_PATH?.trim() || "file:./.payload/kxd.sqlite";
  if (!sqlitePath.includes("primal-qa-integration")) {
    throw new Error(
      `Refusing Primal QA: PAYLOAD_SQLITE_PATH must use primal-qa-integration.sqlite (got: ${sqlitePath})`,
    );
  }
}