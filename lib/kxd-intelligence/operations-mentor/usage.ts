import "server-only";

import { createHash } from "crypto";
import type { MentorUsageLogEntry, MentorUsageMeta, OperationsGuidanceRequest } from "./types";

const RESPONSE_CACHE = new Map<string, { expires: number; payload: unknown }>();
const IN_FLIGHT = new Map<string, Promise<unknown>>();
const USAGE_LOG: MentorUsageLogEntry[] = [];

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_LOG = 200;

export function hashLearnerKey(learnerKey: string): string {
  return createHash("sha256").update(learnerKey).digest("hex").slice(0, 16);
}

export function buildGuidanceCacheKey(
  request: OperationsGuidanceRequest,
  learnerKey: string,
): string {
  const checklist = (request.checklistCompletedIds ?? []).slice().sort().join(",");
  const note = (request.learnerNote ?? "").trim().toLowerCase().slice(0, 200);
  return [
    request.capability,
    request.pathSlug,
    request.lessonSlug,
    checklist,
    note,
    hashLearnerKey(learnerKey),
    request.clientRequestKey?.trim() || "",
  ].join("|");
}

export function getCachedGuidance<T>(key: string): T | null {
  const row = RESPONSE_CACHE.get(key);
  if (!row) return null;
  if (Date.now() > row.expires) {
    RESPONSE_CACHE.delete(key);
    return null;
  }
  return row.payload as T;
}

export function setCachedGuidance(key: string, payload: unknown): void {
  RESPONSE_CACHE.set(key, { expires: Date.now() + CACHE_TTL_MS, payload });
}

/**
 * Deduplicate concurrent identical requests.
 */
export async function withGuidanceDedupe<T>(
  key: string,
  factory: () => Promise<T>,
): Promise<{ value: T; deduped: boolean }> {
  const existing = IN_FLIGHT.get(key) as Promise<T> | undefined;
  if (existing) {
    return { value: await existing, deduped: true };
  }
  const promise = factory().finally(() => {
    IN_FLIGHT.delete(key);
  });
  IN_FLIGHT.set(key, promise);
  return { value: await promise, deduped: false };
}

export function logMentorUsage(entry: Omit<MentorUsageLogEntry, "at">): void {
  USAGE_LOG.unshift({ ...entry, at: new Date().toISOString() });
  if (USAGE_LOG.length > MAX_LOG) USAGE_LOG.length = MAX_LOG;
}

export function listRecentMentorUsage(limit = 20): MentorUsageLogEntry[] {
  return USAGE_LOG.slice(0, limit);
}

export function createUsageMeta(input: {
  requestId: string;
  cached: boolean;
  deduped: boolean;
  mode: MentorUsageMeta["mode"];
  capability: MentorUsageMeta["capability"];
  pathSlug: string;
  lessonSlug: string;
  noteLength: number;
}): MentorUsageMeta {
  return {
    ...input,
    generatedAt: new Date().toISOString(),
  };
}

export function newRequestId(): string {
  return `mentor-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
