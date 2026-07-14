/**
 * Phase 33B / 33B.1 — Normalize reporting history from client activity + platform automation events.
 */

import { sanitizeReportingFailureMessage } from "@/lib/reporting/automation/sanitize";
import type { ReportingSyncOutcome } from "@/lib/reporting/automation/types";
import type { ReportingProviderId } from "@/lib/reporting/providers/types";
import { isValidReportingOpsProvider } from "./build-row";
import type { ReportingOpsHistoryEntry } from "./types";

export type RawReportingActivityDoc = {
  id: number | string;
  eventType?: unknown;
  title?: unknown;
  summary?: unknown;
  occurredAt?: unknown;
  createdAt?: unknown;
  client?: unknown;
  metadata?: unknown;
  sourceType?: unknown;
};

export type RawAutomationSweepDoc = {
  id: number | string;
  eventName?: unknown;
  module?: unknown;
  client?: unknown;
  payload?: unknown;
  createdAt?: unknown;
  processedAt?: unknown;
};

function clientRef(value: unknown): {
  id: number | null;
  name: string | null;
  slug: string | null;
} {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { id: value, name: null, slug: null };
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const id = typeof obj.id === "number" ? obj.id : null;
    return {
      id,
      name: typeof obj.name === "string" ? obj.name : null,
      slug: typeof obj.slug === "string" ? obj.slug : null,
    };
  }
  return { id: null, name: null, slug: null };
}

function sanitizeMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const safeMeta: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (/token|secret|password|credential|authorization|cookie|raw/i.test(key)) {
      continue;
    }
    if (typeof value === "string" && value.length > 280) {
      safeMeta[key] = sanitizeReportingFailureMessage(value);
    } else {
      safeMeta[key] = value;
    }
  }
  return safeMeta;
}

/** Client-owned sync events from executive-timeline-events. */
export function mapReportingActivityToHistory(
  doc: RawReportingActivityDoc,
): ReportingOpsHistoryEntry | null {
  const eventType = typeof doc.eventType === "string" ? doc.eventType : "";
  if (
    eventType !== "reporting.sync.succeeded" &&
    eventType !== "reporting.sync.failed"
  ) {
    return null;
  }

  const meta =
    doc.metadata && typeof doc.metadata === "object"
      ? sanitizeMeta(doc.metadata as Record<string, unknown>)
      : {};

  const providerRaw = meta.provider;
  const provider = isValidReportingOpsProvider(providerRaw)
    ? (providerRaw as ReportingProviderId)
    : null;

  const outcome =
    typeof meta.outcome === "string"
      ? (meta.outcome as ReportingSyncOutcome | string)
      : null;

  const client = clientRef(doc.client);
  if (client.id == null) {
    // Client-owned events must retain a real client.
    return null;
  }

  const timestamp =
    (typeof doc.occurredAt === "string" && doc.occurredAt) ||
    (typeof doc.createdAt === "string" && doc.createdAt) ||
    new Date().toISOString();

  const summary =
    typeof doc.summary === "string"
      ? sanitizeReportingFailureMessage(doc.summary, doc.summary)
      : null;

  const failed = eventType.endsWith(".failed");
  const succeeded = eventType.endsWith(".succeeded");

  return {
    id: doc.id,
    clientId: client.id,
    clientName: client.name,
    clientSlug: client.slug,
    provider,
    outcome,
    triggerType: "automation-sweep",
    scope: "client",
    scheduledWindow:
      typeof meta.scheduledWindow === "string"
        ? meta.scheduledWindow
        : typeof meta.windowId === "string"
          ? meta.windowId
          : null,
    runDurationMs:
      typeof meta.runDurationMs === "number" && Number.isFinite(meta.runDurationMs)
        ? Math.max(0, Math.floor(meta.runDurationMs))
        : null,
    factsWritten:
      typeof meta.factsWritten === "number" && Number.isFinite(meta.factsWritten)
        ? Math.max(0, Math.floor(meta.factsWritten))
        : null,
    failureCategory: failed
      ? typeof outcome === "string"
        ? outcome
        : "error"
      : null,
    failureSummary: failed ? summary : null,
    ok: succeeded ? true : failed ? false : typeof meta.ok === "boolean" ? meta.ok : null,
    timestamp,
    eventType,
    title: typeof doc.title === "string" ? doc.title : eventType,
    sweepTruncated: null,
    sweepClientsSkippedCapacity: null,
  };
}

/** Platform-scoped sweep summaries from automation-events (no client ownership). */
export function mapAutomationSweepToHistory(
  doc: RawAutomationSweepDoc,
): ReportingOpsHistoryEntry | null {
  if (doc.eventName !== "reporting.sweep.completed") return null;
  if (doc.client != null && doc.client !== undefined) {
    // Platform events must not carry a client relationship.
    // If a legacy/malformed row has one, treat as non-platform and skip here
    // (client timelines must never absorb platform sweeps).
    return null;
  }

  const payload =
    doc.payload && typeof doc.payload === "object"
      ? sanitizeMeta(doc.payload as Record<string, unknown>)
      : {};

  if (payload.scope != null && payload.scope !== "platform") {
    return null;
  }

  const timestamp =
    (typeof payload.finishedAt === "string" && payload.finishedAt) ||
    (typeof doc.processedAt === "string" && doc.processedAt) ||
    (typeof doc.createdAt === "string" && doc.createdAt) ||
    new Date().toISOString();

  const truncated = payload.truncated === true;
  const title =
    typeof payload.title === "string"
      ? payload.title
      : truncated
        ? "Reporting sweep completed (truncated)"
        : "Reporting sweep completed";

  return {
    id: `sweep:${doc.id}`,
    clientId: null,
    clientName: null,
    clientSlug: null,
    provider: null,
    outcome: truncated ? "truncated" : "completed",
    triggerType:
      payload.triggerType === "operator" ? "operator" : "automation-sweep",
    scope: "platform",
    scheduledWindow: null,
    runDurationMs:
      typeof payload.runDurationMs === "number" && Number.isFinite(payload.runDurationMs)
        ? Math.max(0, Math.floor(payload.runDurationMs))
        : null,
    factsWritten: null,
    failureCategory: null,
    failureSummary: null,
    ok: payload.ok === true || (payload.ok !== false && !truncated),
    timestamp,
    eventType: "reporting.sweep.completed",
    title,
    sweepTruncated: typeof payload.truncated === "boolean" ? payload.truncated : null,
    sweepClientsSkippedCapacity:
      typeof payload.clientsSkippedCapacity === "number" &&
      Number.isFinite(payload.clientsSkippedCapacity)
        ? Math.max(0, Math.floor(payload.clientsSkippedCapacity))
        : null,
  };
}

export function extractLastSweepCapacity(history: readonly ReportingOpsHistoryEntry[]): {
  truncated: boolean | null;
  finishedAt: string | null;
  clientsSkippedCapacity: number | null;
} {
  const sweep = history.find(
    (h) => h.eventType === "reporting.sweep.completed" && h.scope === "platform",
  );
  if (!sweep) {
    return { truncated: null, finishedAt: null, clientsSkippedCapacity: null };
  }
  return {
    truncated: sweep.sweepTruncated,
    finishedAt: sweep.timestamp,
    clientsSkippedCapacity: sweep.sweepClientsSkippedCapacity,
  };
}
