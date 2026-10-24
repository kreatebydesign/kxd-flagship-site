import "server-only";

/** Production Neon main pooler/direct host marker (see docs/KXD-OS-PREVIEW-DATABASE.md). */
export const PRODUCTION_NEON_MAIN_ENDPOINT_MARKER = "ep-twilight-math";

/** Preview Neon endpoint marker — must not be used for production runtime. */
export const PREVIEW_NEON_ENDPOINT_MARKER = "ep-frosty-bonus";

export function resolvePayloadDatabaseHostname(): string | null {
  const raw =
    process.env.DATABASE_URI?.trim() || process.env.DATABASE_URL?.trim() || "";
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

export function classifyNeonDatabaseHost(hostname: string | null): {
  host: string | null;
  isProductionMain: boolean;
  isPreviewBranch: boolean;
} {
  const host = hostname;
  return {
    host,
    isProductionMain: Boolean(
      host?.includes(PRODUCTION_NEON_MAIN_ENDPOINT_MARKER),
    ),
    isPreviewBranch: Boolean(host?.includes(PREVIEW_NEON_ENDPOINT_MARKER)),
  };
}
