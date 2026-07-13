/**
 * Phase 28A — Portfolio evidence from Morning Brief context.
 * Facts only — no recommendations.
 */

import { WEBSITE_REVIEW_EXPERIENCE_MODULE } from "@/lib/ces/modules/website-review/constants";
import type { BriefingInputContext } from "@/lib/intelligence/briefings/types";
import type { IntelligenceContext } from "@/lib/intelligence/types";
import { OPEN_WORK_STATUSES } from "@/lib/work/constants";
import type { WorkListItem } from "@/lib/work/types";
import type { ReviewInboxItem } from "@/lib/website-review-inbox/types";
import type { EvidenceItem } from "../types";

const OPEN_REQUEST_STATUSES = new Set([
  "new",
  "triaged",
  "in-progress",
  "waiting-on-client",
]);

function clientNameFromRequest(
  raw: unknown,
  ctx: IntelligenceContext,
): string {
  if (raw && typeof raw === "object" && "id" in raw) {
    const id = Number((raw as { id: unknown }).id);
    if (Number.isFinite(id) && ctx.clientsById.has(id)) {
      return String(ctx.clientsById.get(id)?.name ?? "Client");
    }
  }
  if (raw && typeof raw === "object" && "name" in raw) {
    return String((raw as { name: unknown }).name);
  }
  return "Client";
}

function isOverdueWork(item: WorkListItem): boolean {
  if (!item.dueDate) return false;
  const ts = new Date(item.dueDate).getTime();
  return !Number.isNaN(ts) && ts < Date.now();
}

function newestFirst(a: string, b: string): number {
  return new Date(b).getTime() - new Date(a).getTime();
}

function sortReviews(items: ReviewInboxItem[]): ReviewInboxItem[] {
  return [...items].sort((a, b) => newestFirst(a.submittedAt, b.submittedAt));
}

export function collectPortfolioEvidence(
  input: BriefingInputContext,
  observedAt: string,
): EvidenceItem[] {
  const evidence: EvidenceItem[] = [];
  const openStatuses = new Set(OPEN_WORK_STATUSES);
  const openWork = input.work.currentWork.filter((item) => openStatuses.has(item.status));

  const newReviews = sortReviews(
    input.reviewInbox.items.filter((item) => item.status === "new"),
  );
  if (newReviews[0]) {
    const item = newReviews[0];
    evidence.push({
      id: `evidence-review-new-${item.id}`,
      kind: "website_review_new",
      domain: "review",
      summary: `New website review submission: ${item.title}`,
      observedAt,
      sourceRef: `review:${item.id}`,
      payload: {
        reviewId: item.id,
        title: item.title,
        clientName: item.clientName,
        workspaceUrl: item.workspaceUrl,
        pageLocation: item.pageLocation,
        newCount: input.reviewInbox.newCount,
      },
    });
  }

  const activeNeedingAction = sortReviews(
    input.reviewInbox.items.filter(
      (item) => item.status === "triaged" || item.status === "in-progress",
    ),
  );
  if (activeNeedingAction[0]) {
    const item = activeNeedingAction[0];
    evidence.push({
      id: `evidence-review-active-${item.id}`,
      kind: "website_review_active",
      domain: "review",
      summary: `Active website review needing action: ${item.title}`,
      observedAt,
      sourceRef: `review:${item.id}`,
      payload: {
        reviewId: item.id,
        title: item.title,
        status: item.status,
        clientName: item.clientName,
        workspaceUrl: item.workspaceUrl,
        pageLocation: item.pageLocation,
      },
    });
  }

  const needsReply = [...input.communications.needsReply].sort((a, b) =>
    newestFirst(a.date, b.date),
  );
  if (needsReply[0]) {
    const item = needsReply[0];
    evidence.push({
      id: `evidence-comms-reply-${item.id}`,
      kind: "communication_needs_reply",
      domain: "relationship",
      summary: `Client communication needs reply: ${item.subject}`,
      observedAt,
      sourceRef: `communication:${item.id}`,
      payload: {
        communicationId: item.id,
        subject: item.subject,
        clientName: item.clientName,
        href: item.href,
        needsReplyCount: input.communications.needsReplyCount,
      },
    });
  }

  const overdue = [...openWork.filter(isOverdueWork)].sort((a, b) =>
    newestFirst(a.dueDate ?? a.updatedAt, b.dueDate ?? b.updatedAt),
  );
  if (overdue[0]) {
    const item = overdue[0];
    evidence.push({
      id: `evidence-work-overdue-${item.id}`,
      kind: "overdue_work",
      domain: "work",
      summary: `Overdue work: ${item.title}`,
      observedAt,
      sourceRef: `work:${item.id}`,
      payload: {
        workId: item.id,
        title: item.title,
        clientName: item.clientName,
        href: item.adminHref,
        dueDate: item.dueDate,
        estimatedEffortHours: item.estimatedEffort ?? null,
      },
    });
  }

  const highPriority = [...openWork.filter(
    (item) => item.priority === "high" || item.priority === "critical",
  )].sort((a, b) => newestFirst(a.updatedAt, b.updatedAt));
  if (highPriority[0]) {
    const item = highPriority[0];
    evidence.push({
      id: `evidence-work-priority-${item.id}`,
      kind: "high_priority_work",
      domain: "work",
      summary: `${item.priority} priority work: ${item.title}`,
      observedAt,
      sourceRef: `work:${item.id}`,
      payload: {
        workId: item.id,
        title: item.title,
        priority: item.priority,
        clientName: item.clientName,
        href: item.adminHref,
      },
    });
  }

  for (const item of openWork.filter((w) => w.status === "blocked")) {
    evidence.push({
      id: `evidence-work-blocked-${item.id}`,
      kind: "blocked_work",
      domain: "work",
      summary: `Blocked work: ${item.title}`,
      observedAt,
      sourceRef: `work:${item.id}`,
      payload: {
        workId: item.id,
        title: item.title,
        clientName: item.clientName,
        href: item.adminHref,
      },
    });
  }

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

  if (openRequests[0]) {
    const req = openRequests[0];
    evidence.push({
      id: `evidence-request-${req.id}`,
      kind: "client_request_open",
      domain: "client",
      summary: `Open client request: ${String(req.requestTitle ?? req.title ?? "Client request")}`,
      observedAt,
      sourceRef: `client-request:${req.id}`,
      payload: {
        requestId: req.id,
        title: String(req.requestTitle ?? req.title ?? "Client request"),
        status: String(req.status ?? ""),
        clientName: clientNameFromRequest(req.client, input.intelligence),
        href: `/admin/collections/client-requests/${req.id}`,
      },
    });
  }

  if (input.reviewInbox.newCount + input.reviewInbox.activeCount > 0) {
    evidence.push({
      id: "evidence-review-backlog",
      kind: "review_backlog",
      domain: "review",
      summary: `${input.reviewInbox.newCount + input.reviewInbox.activeCount} website reviews on the board`,
      observedAt,
      payload: {
        newCount: input.reviewInbox.newCount,
        activeCount: input.reviewInbox.activeCount,
      },
    });
  }

  return evidence;
}
