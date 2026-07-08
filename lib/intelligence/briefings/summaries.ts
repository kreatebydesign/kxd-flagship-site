import { clientId, clientName, daysSince } from "../context";
import type { BriefingChangeItem, BriefingInputContext } from "./types";

const CHANGE_WINDOW_DAYS = 2;

function isRecent(iso: string | null | undefined, windowDays = CHANGE_WINDOW_DAYS): boolean {
  const days = daysSince(iso);
  return days != null && days <= windowDays;
}

export function buildWhatChanged(input: BriefingInputContext): BriefingChangeItem[] {
  const { intelligence, work } = input;
  const changes: BriefingChangeItem[] = [];

  for (const item of work.completedToday) {
    changes.push({
      id: `work-completed-${item.id}`,
      label: "Work completed",
      detail: `${item.clientName} · ${item.title}`,
      source: "work",
      occurredAt: item.completedAt ?? item.updatedAt,
      href: item.adminHref,
    });
  }

  for (const item of work.recentWork) {
    if (!isRecent(item.updatedAt, 1)) continue;
    if (item.status === "completed" || item.status === "archived") continue;
    const already = changes.some((c) => c.id === `work-updated-${item.id}`);
    if (already) continue;

    changes.push({
      id: `work-updated-${item.id}`,
      label: "Work updated",
      detail: `${item.clientName} · ${item.title} → ${item.status.replace(/-/g, " ")}`,
      source: "work",
      occurredAt: item.updatedAt,
      href: item.adminHref,
    });
  }

  for (const event of intelligence.executiveTimeline) {
    const at = String(event.occurredAt ?? event.createdAt ?? "");
    if (!isRecent(at)) continue;

    const cid = clientId(event.client);
    changes.push({
      id: `timeline-${event.id}`,
      label: String(event.title ?? "Timeline event"),
      detail: cid ? clientName(event.client, intelligence) : "Portfolio",
      source: "timeline",
      occurredAt: at,
      href: cid ? `/admin/operations/timeline/${cid}` : "/admin/operations/timeline",
    });
  }

  for (const req of intelligence.requests) {
    if (String(req.experienceModule ?? "") !== "website-review") continue;
    if (String(req.status ?? "") !== "new") continue;
    if (!isRecent(String(req.createdAt ?? ""))) continue;

    const cid = clientId(req.client);
    changes.push({
      id: `review-new-${req.id}`,
      label: "New website review",
      detail: `${clientName(req.client, intelligence)} · ${String(req.requestTitle ?? "Revision")}`,
      source: "website-review",
      occurredAt: String(req.createdAt ?? ""),
      href: `/admin/operations/review-inbox/${req.id}`,
    });
  }

  for (const deliverable of intelligence.deliverables) {
    const status = String(deliverable.status ?? "");
    if (!["delivered", "complete"].includes(status)) continue;
    if (!isRecent(String(deliverable.updatedAt ?? deliverable.createdAt ?? ""))) continue;

    const cid = clientId(deliverable.client);
    changes.push({
      id: `deliverable-${deliverable.id}`,
      label: "Deliverable completed",
      detail: `${clientName(deliverable.client, intelligence)} · ${String(deliverable.title ?? "Deliverable")}`,
      source: "deliverables",
      occurredAt: String(deliverable.updatedAt ?? deliverable.createdAt ?? ""),
      href: cid ? `/admin/operations/client-command/${cid}` : undefined,
    });
  }

  return changes
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 8);
}
