/**
 * Morning Brief — single recommended first action from cached briefing context.
 * No additional database queries.
 */

import { WEBSITE_REVIEW_EXPERIENCE_MODULE } from "@/lib/ces/modules/website-review/constants";
import type { BriefingInputContext } from "@/lib/intelligence/briefings/types";
import {
  clientName,
  OPEN_REQUEST_STATUSES,
} from "@/lib/intelligence/context";
import { OPEN_WORK_STATUSES } from "@/lib/work/constants";
import type { WorkListItem } from "@/lib/work/types";
import type { ReviewInboxItem } from "@/lib/website-review-inbox/types";

export type MorningFirstActionKind =
  | "website-review-new"
  | "website-review-active"
  | "communication"
  | "work"
  | "client-request"
  | "none";

export interface MorningFirstAction {
  title: string;
  kind: MorningFirstActionKind;
  hasAction: boolean;
  label: string;
  clientName: string | null;
  itemTitle: string | null;
  detail: string | null;
  href: string | null;
  hrefLabel: string | null;
}

function newestFirst(a: string, b: string): number {
  return new Date(b).getTime() - new Date(a).getTime();
}

function sortReviews(items: ReviewInboxItem[]): ReviewInboxItem[] {
  return [...items].sort((a, b) => newestFirst(a.submittedAt, b.submittedAt));
}

function isOverdueWork(item: WorkListItem): boolean {
  if (!item.dueDate) return false;
  const ts = new Date(item.dueDate).getTime();
  if (Number.isNaN(ts)) return false;
  return ts < Date.now();
}

function openWorkStatuses(): Set<string> {
  return new Set(OPEN_WORK_STATUSES);
}

function calmAction(): MorningFirstAction {
  return {
    title: "Recommended First Action",
    kind: "none",
    hasAction: false,
    label: "No urgent action. Continue planned work.",
    clientName: null,
    itemTitle: null,
    detail: null,
    href: null,
    hrefLabel: null,
  };
}

function actionFromReview(
  item: ReviewInboxItem,
  kind: "website-review-new" | "website-review-active",
  label: string,
  detail: string,
): MorningFirstAction {
  return {
    title: "Recommended First Action",
    kind,
    hasAction: true,
    label,
    clientName: item.clientName,
    itemTitle: item.title,
    detail: item.pageLocation ? `${detail} · ${item.pageLocation}` : detail,
    href: item.workspaceUrl,
    hrefLabel: "Open Review Inbox",
  };
}

/**
 * Pick exactly one founder-facing first action from live briefing context.
 */
export function buildMorningFirstAction(input: BriefingInputContext): MorningFirstAction {
  // 1. New Website Review submission
  const newReviews = sortReviews(
    input.reviewInbox.items.filter((item) => item.status === "new"),
  );
  if (newReviews[0]) {
    return actionFromReview(
      newReviews[0],
      "website-review-new",
      "Triage new Website Review",
      "New submission awaiting review",
    );
  }

  // 2. Active revision needing KXD action (studio-owned open statuses)
  const activeNeedingAction = sortReviews(
    input.reviewInbox.items.filter(
      (item) => item.status === "triaged" || item.status === "in-progress",
    ),
  );
  if (activeNeedingAction[0]) {
    return actionFromReview(
      activeNeedingAction[0],
      "website-review-active",
      "Continue active revision",
      activeNeedingAction[0].status === "in-progress" ? "In progress" : "In review",
    );
  }

  // 3. Client communication needing reply
  const needsReply = [...input.communications.needsReply].sort((a, b) =>
    newestFirst(a.date, b.date),
  );
  if (needsReply[0]) {
    const item = needsReply[0];
    return {
      title: "Recommended First Action",
      kind: "communication",
      hasAction: true,
      label: "Reply to client communication",
      clientName: item.clientName,
      itemTitle: item.subject,
      detail: "Needs reply",
      href: item.href,
      hrefLabel: "Open communication",
    };
  }

  // 4. Overdue or high-priority Work Engine item
  const openStatuses = openWorkStatuses();
  const openWork = input.work.currentWork.filter((item) => openStatuses.has(item.status));
  const overdue = [...openWork.filter(isOverdueWork)].sort((a, b) =>
    newestFirst(a.dueDate ?? a.updatedAt, b.dueDate ?? b.updatedAt),
  );
  const highPriority = [...openWork.filter(
    (item) => item.priority === "high" || item.priority === "critical",
  )].sort((a, b) => newestFirst(a.updatedAt, b.updatedAt));
  const workItem = overdue[0] ?? highPriority[0];
  if (workItem) {
    return {
      title: "Recommended First Action",
      kind: "work",
      hasAction: true,
      label: overdue[0] ? "Resolve overdue work" : "Advance high-priority work",
      clientName: workItem.clientName,
      itemTitle: workItem.title,
      detail: overdue[0]
        ? "Overdue"
        : workItem.priority === "critical"
          ? "Critical priority"
          : "High priority",
      href: workItem.adminHref,
      hrefLabel: "Open Work Engine",
    };
  }

  // 5. Open client request (non–Website Review)
  const openRequests = input.intelligence.requests
    .filter((req) => {
      if (String(req.experienceModule ?? "") === WEBSITE_REVIEW_EXPERIENCE_MODULE) {
        return false;
      }
      const status = String(req.status ?? "");
      return OPEN_REQUEST_STATUSES.has(status) && (status === "new" || status === "triaged");
    })
    .sort((a, b) =>
      newestFirst(
        String(a.createdAt ?? a.updatedAt ?? ""),
        String(b.createdAt ?? b.updatedAt ?? ""),
      ),
    );

  const request = openRequests[0];
  if (request) {
    return {
      title: "Recommended First Action",
      kind: "client-request",
      hasAction: true,
      label: "Review open client request",
      clientName: clientName(request.client, input.intelligence),
      itemTitle: String(request.requestTitle ?? request.title ?? "Client request"),
      detail: String(request.status ?? "open") === "new" ? "New" : "Triaged",
      href: `/admin/collections/client-requests/${request.id}`,
      hrefLabel: "Open request",
    };
  }

  // 6. Calm default
  return calmAction();
}
