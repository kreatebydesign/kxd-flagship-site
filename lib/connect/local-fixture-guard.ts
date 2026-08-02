/**
 * Phase 6 Batch C3 — local-only Connect fixture / dogfood-prep guards.
 *
 * Fixture bootstrapping must fail closed unless the database target is proven
 * local (or explicitly development-only). Never a production authorization.
 */

export type ConnectLocalDbTarget = {
  kind: "sqlite" | "local-postgres" | "remote-postgres" | "missing";
  host: string;
  database: string;
  isLocal: boolean;
  isRemote: boolean;
  sourceVar: string;
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

/** Resolve DB target from env without printing secrets. */
export function resolveConnectLocalDbTarget(
  env: NodeJS.ProcessEnv = process.env,
): ConnectLocalDbTarget {
  const databaseUri =
    env.DATABASE_URI?.trim() || env.DATABASE_URL?.trim() || "";

  if (databaseUri) {
    const sourceVar = env.DATABASE_URI?.trim() ? "DATABASE_URI" : "DATABASE_URL";
    if (/neon\.tech|amazonaws\.com|vercel-storage|supabase\.co/i.test(databaseUri)) {
      return {
        kind: "remote-postgres",
        host: "(remote-marker)",
        database: "(unknown)",
        isLocal: false,
        isRemote: true,
        sourceVar,
      };
    }
    try {
      const url = new URL(databaseUri);
      const { isLocal, isRemote } = classifyHost(url.hostname);
      return {
        kind: isLocal ? "local-postgres" : "remote-postgres",
        host: url.hostname,
        database: url.pathname.replace(/^\//, "").split("?")[0] || "(default)",
        isLocal,
        isRemote,
        sourceVar,
      };
    } catch {
      return {
        kind: "remote-postgres",
        host: "(unparseable)",
        database: "(unknown)",
        isLocal: false,
        isRemote: true,
        sourceVar,
      };
    }
  }

  const sqlitePath =
    env.PAYLOAD_SQLITE_PATH?.trim() || "file:./.payload/kxd.sqlite";
  return {
    kind: "sqlite",
    host: "(sqlite file)",
    database: sqlitePath,
    isLocal: true,
    isRemote: false,
    sourceVar: env.PAYLOAD_SQLITE_PATH?.trim()
      ? "PAYLOAD_SQLITE_PATH"
      : "none",
  };
}

export function formatConnectLocalDbTarget(target: ConnectLocalDbTarget): string {
  return [
    `kind=${target.kind}`,
    `source=${target.sourceVar}`,
    `host=${target.host}`,
    `database=${target.database}`,
    `local=${target.isLocal}`,
  ].join(" ");
}

/**
 * Fail closed unless the target is local Postgres or local SQLite.
 * NODE_ENV=production always refuses fixture mutation.
 */
export function assertConnectLocalFixtureTarget(
  target: ConnectLocalDbTarget,
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (env.NODE_ENV === "production") {
    throw new Error(
      "Refusing Connect local fixtures: NODE_ENV=production. " +
        "Fixture bootstrap is development-only and never production authorization.",
    );
  }
  if (env.VERCEL_ENV === "production") {
    throw new Error(
      "Refusing Connect local fixtures: VERCEL_ENV=production.",
    );
  }
  if (target.kind === "remote-postgres" || target.isRemote || !target.isLocal) {
    throw new Error(
      [
        "Refusing Connect local fixtures against a non-local database.",
        `Resolved: ${formatConnectLocalDbTarget(target)}`,
        "Use local Postgres (127.0.0.1 / localhost) or SQLite.",
      ].join("\n"),
    );
  }
  if (target.kind === "missing") {
    throw new Error("Refusing Connect local fixtures: database target missing.");
  }
}
