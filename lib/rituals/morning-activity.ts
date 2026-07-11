/**
 * Morning Brief — live client activity (admin / executive only).
 * Concrete operational details for founder review. Not used on portal routes.
 */

import { WEBSITE_REVIEW_EXPERIENCE_MODULE } from "@/lib/ces/modules/website-review/constants";
import {
  clientId,
  clientName,
  OPEN_REQUEST_STATUSES,
} from "@/lib/intelligence/context";
import type { BriefingInputContext } from "@/lib/intelligence/briefings/types";
import {
  formatDisplayTime,
  KXD_BUSINESS_TIMEZONE,
} from "@/lib/platform/timezone";
import { WORK_STATUS_LABELS } from "@/lib/work/constants";
import type { WorkListItem } from "@/lib/work/types";
import { reviewInboxStatusOption } from "@/lib/website-review-inbox/status";
import type { ReviewInboxItem } from "@/lib/website-review-inbox/types";

export type MorningActivityKind =
  | "website-review-new"
  | "website-review-active"
  | "client-request"
  | "communication"
  | "work";

export interface MorningActivityLine {
  id: string;
  kind: MorningActivityKind;
  label: string;
  title: string;
  status: string;
  location: string | null;
  occurredAt: string;
  occurredAtDisplay: string;
  href: string;
}

export interface MorningClientActivityGroup {
  clientId: number | null;
  clientName: string;
  lines: MorningActivityLine[];
}

export interface MorningClientActivity {
  title: string;
  summary: string;
  hasActivity: boolean;
  groups: MorningClientActivityGroup[];
  emptyMessage: string;
}

function formatOccurredAt(iso: string, timeZone: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  const datePart = date.toLocaleDateString("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
  });
  const timePart = formatDisplayTime(date, timeZone);
  return `${datePart} · ${timePart}`;
}

function sortLines(a: MorningActivityLine, b: MorningActivityLine): number {
  return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
}

function workStatusLabel(item: WorkListItem): string {
  return WORK_STATUS_LABELS[item.status] ?? item.status;
}

function reviewLine(
  item: ReviewInboxItem,
  kind: "website-review-new" | "website-review-active",
  timeZone: string,
): MorningActivityLine {
  const status = reviewInboxStatusOption(item.status);
  return {
    id: `review-${kind}-${item.id}`,
    kind,
    label: kind === "website-review-new" ? "New Website Review" : "Active Revision",
    title: item.title,
    status: status.label,
    location: item.pageLocation,
    occurredAt: item.submittedAt,
    occurredAtDisplay: formatOccurredAt(item.submittedAt, timeZone),
    href: item.workspaceUrl,
  };
}

/**
 * Build concrete client-level activity for Morning Brief from live briefing context.
 */
export function buildMorningClientActivity(
  input: BriefingInputContext,
  timeZone: string = KXD_BUSINESS_TIMEZONE,
): MorningClientActivity {
  const byClient = new Map<string, MorningClientActivityGroup>();

  const ensureGroup = (id: number | null, name: string): MorningClientActivityGroup => {
    const key = id != null ? `id:${id}` : `name:${name}`;
    let group = byClient.get(key);
    if (!group) {
      group = { clientId: id, clientName: name, lines: [] };
      byClient.set(key, group);
    }
    return group;
  };

  const addLine = (clientIdValue: number | null, clientLabel: string, line: MorningActivityLine) => {
    ensureGroup(clientIdValue, clientLabel).lines.push(line);
  };

  // Website Review — new submissions
  for (const item of input.reviewInbox.items.filter((i) => i.status === "new")) {
    addLine(item.clientId, item.clientName, reviewLine(item, "website-review-new", timeZone));
  }

  // Website Review — active revisions (open, not new — avoid double-listing)
  for (const item of input.reviewInbox.items.filter(
    (i) => i.status !== "new" && i.status !== "complete" && i.status !== "declined",
  )) {
    addLine(item.clientId, item.clientName, reviewLine(item, "website-review-active", timeZone));
  }

  // New / open client requests (exclude Website Review module — already covered)
  for (const req of input.intelligence.requests) {
    if (String(req.experienceModule ?? "") === WEBSITE_REVIEW_EXPERIENCE_MODULE) continue;
    const status = String(req.status ?? "");
    if (!OPEN_REQUEST_STATUSES.has(status)) continue;
    if (status !== "new" && status !== "triaged") continue;

    const cid = clientId(req.client);
    const cname = clientName(req.client, input.intelligence);
    const title = String(req.requestTitle ?? req.title ?? "Client request");
    const occurredAt = String(req.createdAt ?? req.updatedAt ?? input.generatedAt);

    addLine(cid, cname, {
      id: `request-${req.id}`,
      kind: "client-request",
      label: status === "new" ? "New client request" : "Open client request",
      title,
      status: status === "new" ? "New" : "Triaged",
      location: null,
      occurredAt,
      occurredAtDisplay: formatOccurredAt(occurredAt, timeZone),
      href: `/admin/collections/client-requests/${req.id}`,
    });
  }

  // Communications needing reply
  for (const item of input.communications.needsReply) {
    addLine(item.clientId, item.clientName, {
      id: `comms-${item.id}`,
      kind: "communication",
      label: "Needs reply",
      title: item.subject,
      status: "Needs reply",
      location: null,
      occurredAt: item.date,
      occurredAtDisplay: formatOccurredAt(item.date, timeZone),
      href: item.href,
    });
  }

  // Important Work Engine changes — blocked, completed today, high/critical in progress
  const importantWork: WorkListItem[] = [];
  const seenWork = new Set<number>();
  const pushWork = (items: WorkListItem[]) => {
    for (const item of items) {
      if (seenWork.has(item.id)) continue;
      seenWork.add(item.id);
      importantWork.push(item);
    }
  };

  pushWork(input.work.currentWork.filter((item) => item.status === "blocked"));
  pushWork(input.work.completedToday);
  pushWork(
    [...input.work.inProgress, ...input.work.review].filter(
      (item) => item.priority === "high" || item.priority === "critical",
    ),
  );

  for (const item of importantWork) {
    const label =
      item.status === "blocked"
        ? "Work blocked"
        : item.status === "completed"
          ? "Work completed today"
          : "Work in motion";

    addLine(item.clientId, item.clientName, {
      id: `work-${item.id}`,
      kind: "work",
      label,
      title: item.title,
      status: workStatusLabel(item),
      location: null,
      occurredAt: item.updatedAt || item.completedAt || item.createdAt,
      occurredAtDisplay: formatOccurredAt(
        item.updatedAt || item.completedAt || item.createdAt,
        timeZone,
      ),
      href: item.adminHref,
    });
  }

  const groups = [...byClient.values()]
    .map((group) => ({
      ...group,
      lines: [...group.lines].sort(sortLines).slice(0, 8),
    }))
    .filter((group) => group.lines.length > 0)
    .sort((a, b) => a.clientName.localeCompare(b.clientName));

  const totalLines = groups.reduce((sum, g) => sum + g.lines.length, 0);
  const hasActivity = totalLines > 0;

  const summary = hasActivity
    ? `${totalLines} item${totalLines === 1 ? "" : "s"} across ${groups.length} client${groups.length === 1 ? "" : "s"}`
    : "No new client activity since your last check.";

  return {
    title: "Client Activity",
    summary,
    hasActivity,
    groups,
    emptyMessage: "No new client activity since your last check.",
  };
}
