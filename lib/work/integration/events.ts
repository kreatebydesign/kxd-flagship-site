/**
 * Canonical Work lifecycle publisher — routes through the Executive Activity Engine.
 * Payload-safe — used by CLI hooks and migrate scripts (no server-only).
 */

import type { Payload } from "payload";
import { publishActivity } from "@/lib/activity-engine/publish";
import type { WorkSource, WorkStatus } from "../types";
import { WORK_SOURCE_LABELS, WORK_STATUS_LABELS } from "../constants";
import type { PublishWorkEventInput, WorkLifecycleEvent } from "./types";

function timelineCategoryForSource(
  source: WorkSource,
): "website" | "communication" | "creative" | "project" {
  if (source === "website-review") return "website";
  if (source === "communication" || source === "client-request") return "communication";
  if (source === "future-brand-center" || source === "future-marketing") return "creative";
  return "project";
}

function defaultEventTitle(input: PublishWorkEventInput): string {
  switch (input.event) {
    case "work.created":
      return `Work opened · ${input.title}`;
    case "work.completed":
      return `Work completed · ${input.title}`;
    case "work.blocked":
      return `Work blocked · ${input.title}`;
    case "work.started":
      return `Work started · ${input.title}`;
    case "work.waiting":
      return input.status === "waiting-on-kxd"
        ? `Waiting on KXD · ${input.title}`
        : `Waiting on client · ${input.title}`;
    case "work.review":
      return `In review · ${input.title}`;
    case "work.archived":
      return `Work archived · ${input.title}`;
    case "work.updated":
      return `Work updated · ${input.title}`;
    default:
      return `Work · ${input.title}`;
  }
}

function defaultEventSummary(input: PublishWorkEventInput): string {
  if (input.summary?.trim()) return input.summary.trim();

  const statusLabel = WORK_STATUS_LABELS[input.status];
  const sourceLabel = WORK_SOURCE_LABELS[input.source];

  if (input.previousStatus) {
    return `${WORK_STATUS_LABELS[input.previousStatus]} → ${statusLabel}`;
  }

  return `${sourceLabel} · ${statusLabel}`;
}

/**
 * Canonical lifecycle publisher — all Work activity writes flow through the Activity Engine.
 */
export async function publishWorkEvent(
  input: PublishWorkEventInput,
  payloadInstance?: Payload,
): Promise<void> {
  if (!input.timelineEnabled) return;

  await publishActivity(
    {
      clientId: input.clientId,
      workId: input.workId,
      eventType: input.event,
      title: defaultEventTitle(input),
      summary: defaultEventSummary(input),
      category: timelineCategoryForSource(input.source),
      importance:
        input.event === "work.blocked"
          ? "high"
          : input.event === "work.updated"
            ? "low"
            : "normal",
      sourceModule: "Work",
      sourceType: "work",
      sourceId: `${input.workId}:${input.event}:${input.status}`,
      author: input.createdBy ?? undefined,
      occurredAt: new Date().toISOString(),
      internalOnly: !input.clientVisible,
      dedupe: false,
      relatedLinks: [
        {
          label: "Open work",
          href: `/admin/work/${input.workId}`,
        },
      ],
      metadata: {
        workId: input.workId,
        workNumber: input.workNumber ?? null,
        clientId: input.clientId,
        source: input.source,
        sourceId: input.sourceId ?? null,
        relationshipType: input.relationshipType ?? input.source,
        status: input.status,
        lifecycleEvent: input.event,
      },
    },
    payloadInstance,
  );
}

export function resolveLifecycleEvent(
  status: WorkStatus,
  previousStatus?: WorkStatus | null,
  operation?: "create" | "update",
): WorkLifecycleEvent {
  if (operation === "create") return "work.created";

  if (status === previousStatus) return "work.status-changed";

  switch (status) {
    case "in-progress":
      return "work.started";
    case "waiting-on-client":
    case "waiting-on-kxd":
      return "work.waiting";
    case "blocked":
      return "work.blocked";
    case "review":
      return "work.review";
    case "completed":
      return "work.completed";
    case "archived":
      return "work.archived";
    default:
      return "work.status-changed";
  }
}

function readWorkNumberFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const workNumber = (metadata as { workNumber?: unknown }).workNumber;
  return typeof workNumber === "string" && workNumber.trim() ? workNumber.trim() : null;
}

export function publishWorkEventFromDoc(
  doc: {
    id?: number;
    client?: unknown;
    title?: string;
    summary?: string;
    status?: string;
    source?: string;
    sourceId?: string;
    metadata?: unknown;
    clientVisible?: boolean;
    timelineEnabled?: boolean;
    createdBy?: string;
  },
  event: WorkLifecycleEvent,
  previousStatus?: WorkStatus | null,
  payloadInstance?: Payload,
): Promise<void> {
  const workId = doc.id;
  if (workId == null) return Promise.resolve();

  const clientId =
    typeof doc.client === "number"
      ? doc.client
      : doc.client && typeof doc.client === "object" && "id" in doc.client
        ? Number((doc.client as { id?: number }).id)
        : null;

  if (!clientId) return Promise.resolve();

  return publishWorkEvent(
    {
      workId,
      clientId,
      title: String(doc.title ?? "Work"),
      summary: doc.summary ? String(doc.summary) : undefined,
      status: String(doc.status ?? "new") as WorkStatus,
      source: String(doc.source ?? "manual") as WorkSource,
      sourceId: doc.sourceId ? String(doc.sourceId) : null,
      workNumber: readWorkNumberFromMetadata(doc.metadata),
      relationshipType: doc.source ? String(doc.source) : null,
      clientVisible: Boolean(doc.clientVisible),
      timelineEnabled: Boolean(doc.timelineEnabled ?? true),
      event,
      previousStatus: previousStatus ?? undefined,
      createdBy: doc.createdBy ? String(doc.createdBy) : undefined,
    },
    payloadInstance,
  );
}
