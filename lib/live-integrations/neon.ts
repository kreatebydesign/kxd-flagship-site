import "server-only";

import { envPresent, envValue } from "./status";
import type { NormalizedNeon } from "./types";

function parseDatabaseHost(uri: string): string | null {
  try {
    const normalized = uri.replace(/^postgres:\/\//, "postgresql://");
    const url = new URL(normalized);
    return url.hostname || null;
  } catch {
    return null;
  }
}

export async function syncNeon(): Promise<{
  normalized: NormalizedNeon | null;
  recordsProcessed: number;
  error?: string;
}> {
  const uri = envValue("DATABASE_URI") ?? envValue("DATABASE_URL");

  if (!uri) {
    return {
      normalized: null,
      recordsProcessed: 0,
      error: "DATABASE_URI or DATABASE_URL not configured",
    };
  }

  const host = parseDatabaseHost(uri);
  const isNeon = host?.includes("neon.tech") ?? false;

  return {
    normalized: {
      host,
      databaseHealth: host ? "uri-valid" : "uri-invalid",
      storageGb: null,
      connections: null,
      backupsConfigured: isNeon ? true : null,
      connectionUriPresent: true,
    },
    recordsProcessed: 1,
  };
}

export function isNeonConfigured(): boolean {
  return envPresent("DATABASE_URI") || envPresent("DATABASE_URL");
}
