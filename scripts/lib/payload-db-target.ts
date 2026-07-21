/**
 * Resolve and classify the database target used by Payload CLI commands.
 * Prints host/db metadata only — never credentials.
 */

import path from "path";
import { fileURLToPath } from "url";
import { loadEnv } from "payload/node";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "../..");

export type DbTargetKind = "sqlite" | "local-postgres" | "remote-postgres" | "missing";

export type ResolvedDbTarget = {
  kind: DbTargetKind;
  sourceVar: "DATABASE_URI" | "DATABASE_URL" | "PAYLOAD_SQLITE_PATH" | "none";
  host: string;
  database: string;
  protocol: string;
  isLocal: boolean;
  isRemote: boolean;
  connectionStringPresent: boolean;
};

function classifyHost(host: string): { isLocal: boolean; isRemote: boolean } {
  const normalized = host.trim().toLowerCase();
  const isLocal =
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized.endsWith(".local");
  return { isLocal, isRemote: !isLocal };
}

export function loadPayloadEnv(): void {
  loadEnv(repoRoot);
}

export function resolveDbTarget(): ResolvedDbTarget {
  loadPayloadEnv();

  const databaseUri =
    process.env.DATABASE_URI?.trim() || process.env.DATABASE_URL?.trim() || "";

  if (databaseUri) {
    const sourceVar = process.env.DATABASE_URI?.trim()
      ? "DATABASE_URI"
      : "DATABASE_URL";
    try {
      const url = new URL(databaseUri);
      const { isLocal, isRemote } = classifyHost(url.hostname);
      return {
        kind: isLocal ? "local-postgres" : "remote-postgres",
        sourceVar,
        host: url.hostname,
        database: url.pathname.replace(/^\//, "") || "(default)",
        protocol: url.protocol.replace(/:$/, ""),
        isLocal,
        isRemote,
        connectionStringPresent: true,
      };
    } catch {
      return {
        kind: "remote-postgres",
        sourceVar,
        host: "(unparseable)",
        database: "(unknown)",
        protocol: "postgres",
        isLocal: false,
        isRemote: true,
        connectionStringPresent: true,
      };
    }
  }

  const sqlitePath =
    process.env.PAYLOAD_SQLITE_PATH?.trim() || "file:./.payload/kxd.sqlite";
  return {
    kind: "sqlite",
    sourceVar: process.env.PAYLOAD_SQLITE_PATH?.trim()
      ? "PAYLOAD_SQLITE_PATH"
      : "none",
    host: "(sqlite file)",
    database: sqlitePath,
    protocol: "sqlite",
    isLocal: true,
    isRemote: false,
    connectionStringPresent: false,
  };
}

export function formatDbTarget(target: ResolvedDbTarget): string {
  return [
    `kind=${target.kind}`,
    `source=${target.sourceVar}`,
    `host=${target.host}`,
    `database=${target.database}`,
    `protocol=${target.protocol}`,
    `local=${target.isLocal}`,
  ].join(" ");
}

export function assertSafeWriteTarget(
  target: ResolvedDbTarget,
  mode: "local" | "production",
): void {
  if (mode === "local") {
    if (target.kind === "remote-postgres" || target.isRemote) {
      throw new Error(
        [
          "Refusing local migration against a remote database.",
          `Resolved: ${formatDbTarget(target)}`,
          "Use a local Postgres URL (127.0.0.1 / localhost) or unset DATABASE_URI/DATABASE_URL for SQLite.",
          "Production applies must use: npm run migrate:production",
        ].join("\n"),
      );
    }
    return;
  }

  // production mode
  if (target.kind !== "remote-postgres" || !target.isRemote) {
    throw new Error(
      [
        "migrate:production requires a remote Postgres DATABASE_URI / DATABASE_URL.",
        `Resolved: ${formatDbTarget(target)}`,
        "For local databases use: npm run migrate:local",
      ].join("\n"),
    );
  }

  if (process.env.KXD_CONFIRM_PRODUCTION_MIGRATE?.trim() !== "1") {
    throw new Error(
      [
        "Refusing production migration without explicit confirmation.",
        `Resolved: ${formatDbTarget(target)}`,
        "Set KXD_CONFIRM_PRODUCTION_MIGRATE=1 after verifying the host and pending migrations.",
        "Inspect first with: npm run migrate:status",
      ].join("\n"),
    );
  }
}
