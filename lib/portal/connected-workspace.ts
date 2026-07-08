import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { ResolvedExperienceProfile } from "@/lib/ces/types";
import { isCesModuleEnabled } from "@/lib/ces";
import type { WebsiteReviewLandingData, WebsiteReviewItem } from "@/lib/ces/modules/website-review/types";
import {
  reviewStatusLabel,
  WEBSITE_REVIEW_STATUS_LABELS,
  type WebsiteReviewClientStatus,
} from "@/lib/ces/vocabulary/website-review";
import {
  clientDeliverableCategoryLabel,
  containsInternalLanguage,
  isCesFlagshipPortal,
  isCesLaunchDeliverablesPageReady,
  isClientSafeTimelineDoc,
  isPlaceholderDeliverableTitle,
} from "./ces-launch-safety";
import { isPortalNavEnabled } from "@/lib/editions/navigation";
import type { PortalSession } from "./session";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export type ConnectedWorkGroup = "awaiting-you" | "in-progress" | "recently-complete";

export interface ConnectedWorkItem {
  id: string;
  title: string;
  status: WebsiteReviewClientStatus;
  statusLabel: string;
  group: ConnectedWorkGroup;
  updatedAt: string;
  href: string;
}

export interface ConnectedActivityItem {
  id: string;
  label: string;
  detail?: string;
  at: string;
  href?: string;
}

export interface ConnectedDeliverableItem {
  id: number;
  title: string;
  status: string;
  statusLabel: string;
  categoryLabel: string | null;
  updatedAt: string;
}

export interface ConnectedQuickAction {
  id: "review-website" | "start-review" | "upload-assets" | "message-kxd";
  href?: string;
  enabled: boolean;
  hint?: "url-missing" | "coming-soon";
}

export interface ConnectedWebsitePanel {
  reviewEnabled: boolean;
  websiteUrl: string | null;
  activeRevisionCount: number;
  awaitingCount: number;
  latestStatus: WebsiteReviewClientStatus | null;
  latestStatusLabel: string | null;
  lastActivityAt: string | null;
}

export interface ConnectedWorkspaceData {
  website: ConnectedWebsitePanel;
  currentWork: ConnectedWorkItem[];
  recentActivity: ConnectedActivityItem[];
  deliverables: ConnectedDeliverableItem[];
  quickActions: ConnectedQuickAction[];
  latestRevisionHref: string | null;
  viewAllRevisionsHref: string | null;
  showDeliverablesLink: boolean;
}

const DELIVERABLE_STATUS_LABELS: Record<string, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  "waiting-on-client": "Waiting on you",
  complete: "Complete",
  blocked: "On hold",
};

const DELIVERABLE_CATEGORY_LABELS: Record<string, string> = {
  website: "Website",
  seo: "SEO",
  content: "Content",
  reporting: "Reporting",
  strategy: "Strategy",
  support: "Support",
  design: "Design",
  development: "Development",
};

function sortByUpdatedDesc<T extends { updatedAt: string }>(a: T, b: T): number {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

function resolveRelId(rel: unknown): number | null {
  if (typeof rel === "number") return rel;
  if (rel && typeof rel === "object" && "id" in rel) {
    return Number((rel as { id?: number }).id) || null;
  }
  return null;
}

function workGroupForStatus(status: WebsiteReviewClientStatus): ConnectedWorkGroup {
  if (status === "awaiting-your-input") return "awaiting-you";
  if (status === "completed" || status === "closed") return "recently-complete";
  return "in-progress";
}

function buildCurrentWork(websiteReview: WebsiteReviewLandingData): ConnectedWorkItem[] {
  const active = [...websiteReview.activeReviews].sort(sortByUpdatedDesc);
  const recentComplete = [...websiteReview.completedReviews]
    .sort(sortByUpdatedDesc)
    .slice(0, 2);

  const items: ConnectedWorkItem[] = [];

  for (const review of active) {
    items.push({
      id: review.id,
      title: review.title,
      status: review.status,
      statusLabel: reviewStatusLabel(review.status),
      group: workGroupForStatus(review.status),
      updatedAt: review.updatedAt,
      href: `/portal/website-review/${review.id}`,
    });
  }

  for (const review of recentComplete) {
    items.push({
      id: review.id,
      title: review.title,
      status: review.status,
      statusLabel: reviewStatusLabel(review.status),
      group: "recently-complete",
      updatedAt: review.updatedAt,
      href: `/portal/website-review/${review.id}`,
    });
  }

  return items;
}

function buildActivityFromReviews(reviews: WebsiteReviewItem[]): ConnectedActivityItem[] {
  const events: ConnectedActivityItem[] = [];

  for (const review of reviews) {
    for (const event of review.timeline) {
      events.push({
        id: `review-${review.id}-${event.id}`,
        label: event.label,
        detail: event.detail,
        at: event.at,
        href: `/portal/website-review/${review.id}`,
      });
    }
  }

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

async function loadClientTimelineActivity(clientId: number): Promise<ConnectedActivityItem[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "executive-timeline-events" as any,
    where: {
      and: [
        { client: { equals: clientId } },
        { internalOnly: { equals: false } },
      ],
    },
    sort: "-occurredAt",
    limit: 12,
    depth: 0,
    overrideAccess: true,
  });

  return (result.docs as AnyDoc[])
    .filter(isClientSafeTimelineDoc)
    .map((doc) => {
    const requestId = resolveRelId(doc.request);
    const deliverableId = resolveRelId(doc.deliverable);

    let href: string | undefined;
    if (requestId) href = `/portal/website-review/${requestId}`;
    else if (deliverableId && isCesLaunchDeliverablesPageReady()) href = "/portal/deliverables";

    const eventType = String(doc.eventType ?? "");
    const clientStatus = clientStatusFromEventType(eventType);
    const label = clientStatus
      ? reviewStatusLabel(clientStatus)
      : containsInternalLanguage(doc)
        ? "Website update"
        : String(doc.title ?? "Update");

    const detail = doc.summary ? String(doc.summary) : undefined;

    return {
      id: `timeline-${doc.id}`,
      label: containsInternalLanguage(doc) && clientStatus ? reviewStatusLabel(clientStatus) : label,
      detail: detail && !containsInternalLanguage(doc) ? detail : undefined,
      at: String(doc.occurredAt ?? doc.createdAt),
      href,
    };
  });
}

async function loadDeliverables(clientId: number): Promise<ConnectedDeliverableItem[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "monthly-deliverables" as any,
    where: { client: { equals: clientId } },
    sort: "-updatedAt",
    limit: 20,
    depth: 0,
    overrideAccess: true,
  });

  const docs = result.docs as AnyDoc[];
  const open = docs
    .filter((doc) => String(doc.status) !== "complete")
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const complete = docs
    .filter((doc) => String(doc.status) === "complete")
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

  return [...open, ...complete]
    .filter((doc) => !isPlaceholderDeliverableTitle(String(doc.title ?? "")))
    .slice(0, 3)
    .map((doc) => {
    const status = String(doc.status ?? "not-started");
    const category = doc.category ? String(doc.category) : null;
    const categoryLabel = category
      ? clientDeliverableCategoryLabel(
          DELIVERABLE_CATEGORY_LABELS[category] ?? category,
        )
      : null;
    return {
      id: doc.id as number,
      title: String(doc.title ?? "Deliverable"),
      status,
      statusLabel: DELIVERABLE_STATUS_LABELS[status] ?? status,
      categoryLabel,
      updatedAt: String(doc.updatedAt ?? doc.createdAt ?? new Date().toISOString()),
    };
  });
}

function clientStatusFromEventType(eventType: string): WebsiteReviewClientStatus | null {
  if (!eventType.startsWith("website-review.")) return null;
  const status = eventType.replace("website-review.", "");
  if (status in WEBSITE_REVIEW_STATUS_LABELS) {
    return status as WebsiteReviewClientStatus;
  }
  return null;
}

function buildQuickActions(
  profile: ResolvedExperienceProfile,
  websiteUrl: string | null,
): ConnectedQuickAction[] {
  const websiteReviewEnabled = isCesModuleEnabled(profile, "website-review");
  const cesLaunch = isCesFlagshipPortal(profile);
  const reviewWebsiteEnabled = Boolean(websiteUrl && websiteReviewEnabled);
  const startReviewEnabled = websiteReviewEnabled;
  const uploadEnabled = cesLaunch ? false : isPortalNavEnabled("assets");
  const messageEnabled = cesLaunch ? false : isPortalNavEnabled("requests");

  return [
    {
      id: "review-website",
      href: "/portal/website-review/session/new",
      enabled: reviewWebsiteEnabled,
      hint: reviewWebsiteEnabled ? undefined : "url-missing",
    },
    {
      id: "start-review",
      href: "/portal/website-review/request",
      enabled: startReviewEnabled,
    },
    {
      id: "upload-assets",
      href: "/portal/assets",
      enabled: uploadEnabled,
      hint: uploadEnabled ? undefined : "coming-soon",
    },
    {
      id: "message-kxd",
      href: "/portal/requests",
      enabled: messageEnabled,
      hint: messageEnabled ? undefined : "coming-soon",
    },
  ];
}

function mergeActivity(
  timeline: ConnectedActivityItem[],
  fromReviews: ConnectedActivityItem[],
): ConnectedActivityItem[] {
  const merged = [...timeline, ...fromReviews].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );

  const seen = new Set<string>();
  const unique: ConnectedActivityItem[] = [];
  for (const item of merged) {
    const key = `${item.label}|${item.at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  return unique.slice(0, 6);
}

export async function getConnectedWorkspaceData(
  session: PortalSession,
  profile: ResolvedExperienceProfile,
  websiteReview: WebsiteReviewLandingData,
): Promise<ConnectedWorkspaceData> {
  const allReviews = [...websiteReview.activeReviews, ...websiteReview.completedReviews].sort(
    sortByUpdatedDesc,
  );
  const latestRevision = allReviews[0] ?? null;
  const awaitingCount = websiteReview.activeReviews.filter(
    (r) => r.status === "awaiting-your-input",
  ).length;

  const [timelineActivity, deliverables] = await Promise.all([
    loadClientTimelineActivity(session.clientId),
    loadDeliverables(session.clientId),
  ]);

  const reviewActivity = buildActivityFromReviews(allReviews.slice(0, 8));

  const websiteReviewEnabled = isCesModuleEnabled(profile, "website-review");

  return {
    website: {
      reviewEnabled: websiteReviewEnabled,
      websiteUrl: websiteReview.websiteUrl,
      activeRevisionCount: websiteReview.activeReviews.length,
      awaitingCount,
      latestStatus: latestRevision?.status ?? null,
      latestStatusLabel: latestRevision ? reviewStatusLabel(latestRevision.status) : null,
      lastActivityAt: latestRevision?.updatedAt ?? null,
    },
    currentWork: buildCurrentWork(websiteReview),
    recentActivity: mergeActivity(timelineActivity, reviewActivity),
    deliverables,
    quickActions: buildQuickActions(profile, websiteReview.websiteUrl),
    latestRevisionHref: latestRevision ? `/portal/website-review/${latestRevision.id}` : null,
    viewAllRevisionsHref: websiteReviewEnabled ? "/portal/website-review" : null,
    showDeliverablesLink:
      isCesLaunchDeliverablesPageReady(profile) && deliverables.length > 0,
  };
}
