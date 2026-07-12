import "server-only";

/**
 * Map existing Work / Review / Activity records → ExecutiveContextRef.
 * Pure shaping — no new decisions.
 */

import type { ExecutiveActivityItem } from "@/lib/activity-engine";
import type { ExecutiveSignal } from "@/lib/executive-signals";
import type { ReviewInboxItem } from "@/lib/website-review-inbox/types";
import type { WorkListItem } from "@/lib/work/types";
import type { ExecutiveContextRef } from "./types";

export function refFromWork(item: WorkListItem): ExecutiveContextRef {
  return {
    id: `work-${item.id}`,
    kind: "work",
    title: item.title,
    detail: item.clientName || item.status,
    href: item.adminHref,
    clientId: item.clientId,
    clientName: item.clientName,
    workId: item.id,
  };
}

export function refFromReview(item: ReviewInboxItem): ExecutiveContextRef {
  return {
    id: `review-${item.id}`,
    kind: "review",
    title: item.title || "Website review",
    detail: item.clientName || item.status,
    href: item.workspaceUrl || "/admin/operations/review-inbox",
    clientId: item.clientId ?? null,
    clientName: item.clientName ?? null,
  };
}

export function refFromActivity(item: ExecutiveActivityItem): ExecutiveContextRef {
  return {
    id: `activity-${item.id}`,
    kind: "activity",
    title: item.title,
    detail: item.summary,
    href: item.href,
    clientId: item.clientId,
    clientName: item.clientName,
    workId: item.workId,
  };
}

export function refFromSignal(signal: ExecutiveSignal): ExecutiveContextRef {
  const kind: ExecutiveContextRef["kind"] =
    signal.domain === "review"
      ? "review"
      : signal.domain === "work"
        ? "work"
        : signal.domain === "training"
          ? "training"
          : signal.domain === "finance"
            ? "finance"
            : signal.domain === "client" || signal.domain === "onboarding"
              ? "client"
              : "activity";

  return {
    id: signal.id,
    kind,
    title: signal.title,
    detail: signal.summary,
    href: signal.href,
    clientId: signal.clientId,
    clientName: signal.clientName,
  };
}

export function uniqueClientsFromWork(items: WorkListItem[]): ExecutiveContextRef[] {
  const seen = new Map<number, ExecutiveContextRef>();
  for (const item of items) {
    if (item.clientId == null) continue;
    if (seen.has(item.clientId)) continue;
    seen.set(item.clientId, {
      id: `client-${item.clientId}`,
      kind: "client",
      title: item.clientName || `Client ${item.clientId}`,
      detail: null,
      href: `/admin/operations/client-success/${item.clientId}`,
      clientId: item.clientId,
      clientName: item.clientName,
    });
  }
  return [...seen.values()];
}
