/**
 * Phase 4 Batch I — in-process sliding-window rate limits for auth/invite/activate.
 * Fail-closed when exceeded. No secrets stored.
 */

export type RateLimitBucket =
  | "portal-login"
  | "portal-activate"
  | "portal-webauthn"
  | "portal-totp"
  | "admin-invite-send";

type Entry = { timestamps: number[] };

const store = new Map<string, Entry>();

const DEFAULTS: Record<RateLimitBucket, { limit: number; windowMs: number }> = {
  "portal-login": { limit: 20, windowMs: 15 * 60 * 1000 },
  "portal-activate": { limit: 30, windowMs: 60 * 60 * 1000 },
  "portal-webauthn": { limit: 40, windowMs: 15 * 60 * 1000 },
  "portal-totp": { limit: 20, windowMs: 15 * 60 * 1000 },
  "admin-invite-send": { limit: 60, windowMs: 60 * 60 * 1000 },
};

function keyFor(bucket: RateLimitBucket, identity: string): string {
  return `${bucket}:${identity}`;
}

export function assertPortalRateLimit(input: {
  bucket: RateLimitBucket;
  identity: string;
  nowMs?: number;
}): { ok: true } | { ok: false; retryAfterSec: number } {
  const cfg = DEFAULTS[input.bucket];
  const now = input.nowMs ?? Date.now();
  const identity = input.identity.trim().toLowerCase() || "unknown";
  const key = keyFor(input.bucket, identity);
  const entry = store.get(key) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => now - t < cfg.windowMs);

  if (entry.timestamps.length >= cfg.limit) {
    const oldest = entry.timestamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((cfg.windowMs - (now - oldest)) / 1000));
    store.set(key, entry);
    return { ok: false, retryAfterSec };
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return { ok: true };
}

export function clientIpFromRequest(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Test-only. */
export function __resetPortalRateLimitsForTests(): void {
  store.clear();
}
