/**
 * Compose client-safe partnership briefing for portal overview.
 * Reuses Website Review + Connected Workspace loaders — no parallel intelligence stack.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { ResolvedExperienceProfile } from "@/lib/ces/types";
import type {
  WebsiteReviewLandingData,
  WebsiteReviewItem,
} from "@/lib/ces/modules/website-review/types";
import { reviewStatusLabel } from "@/lib/ces/vocabulary/website-review";
import type { ConnectedWorkspaceData } from "@/lib/portal/connected-workspace";
import type { PortalSession } from "@/lib/portal/session";
import { loadResolvedServiceScope } from "@/lib/service-capabilities/assignments";
import { getBoardFutureModules } from "./capabilities";
import { getPartnershipMilestones } from "./milestones";
import { loadPartnershipResults } from "./outcomes";
import { decideClientRecommendation } from "./recommend";
import { composePartnershipServiceSummary } from "./service-value";
import type {
  PartnershipBriefing,
  PartnershipDeliveredItem,
  PartnershipProgressItem,
  PartnershipWebsiteReviewSnapshot,
} from "./types";

function latestRevision(websiteReview: WebsiteReviewLandingData): WebsiteReviewItem | null {
  const all = [...websiteReview.activeReviews, ...websiteReview.completedReviews].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  return all[0] ?? null;
}

function latestTimelineLabel(item: WebsiteReviewItem | null): string | null {
  if (!item || item.timeline.length === 0) return null;
  const sorted = [...item.timeline].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
  return sorted[0]?.label ?? sorted[0]?.detail ?? null;
}

function buildWebsiteReviewSnapshot(
  websiteReview: WebsiteReviewLandingData,
): PartnershipWebsiteReviewSnapshot {
  const latest = latestRevision(websiteReview);
  const awaiting = websiteReview.activeReviews.filter((r) => r.status === "awaiting-your-input");
  const hasRevisions =
    websiteReview.activeReviews.length + websiteReview.completedReviews.length > 0;

  let nextStep = "Website notes will be organized here when you share them.";
  if (awaiting.length > 0) {
    nextStep =
      "One open revision is waiting for your eye. A short response is all we need to continue.";
  } else if (websiteReview.activeReviews.length > 0) {
    nextStep = "Our team is advancing the open revisions.";
  } else if (hasRevisions) {
    nextStep = "No open revision is waiting on you.";
  }

  return {
    statusLabel: latest
      ? reviewStatusLabel(latest.status)
      : hasRevisions
        ? "Organized and in good hands"
        : "No website reviews yet",
    timelineLabel: hasRevisions
      ? `${websiteReview.activeReviews.length} active · ${websiteReview.completedReviews.length} complete`
      : "No website reviews recorded yet",
    latestRevisionTitle: latest?.title ?? null,
    latestRevisionHref: latest ? `/portal/website-review/${latest.id}` : null,
    latestKxdResponse: latestTimelineLabel(latest),
    nextStep,
    attachmentCount: latest?.attachments.length ?? 0,
    websiteUrl: websiteReview.websiteUrl,
    hasRevisions,
  };
}

function buildDelivered(input: {
  websiteReview: WebsiteReviewLandingData;
  reportCount: number;
  retainerOnFile: boolean;
  services: ReturnType<typeof composePartnershipServiceSummary>;
}): PartnershipDeliveredItem[] {
  const completedReviews = input.websiteReview.completedReviews.length;
  const activeReviews = input.websiteReview.activeReviews.length;
  const items: PartnershipDeliveredItem[] = [];

  if (completedReviews > 0) {
    items.push({
      id: "revisions-complete",
      label: "Website revisions completed",
      value: completedReviews,
      detail:
        completedReviews === 1 ? "1 revision resolved" : `${completedReviews} revisions resolved`,
      evidence: "computed",
    });
  }

  if (activeReviews > 0) {
    items.push({
      id: "revisions-active",
      label: "Revisions in progress",
      value: activeReviews,
      detail:
        activeReviews === 1
          ? "1 revision currently active"
          : `${activeReviews} revisions currently active`,
      evidence: "computed",
    });
  }

  for (const service of input.services.items) {
    items.push({
      id: `service-${service.id}`,
      label: service.label,
      value: null,
      detail: service.value,
      evidence: "computed",
    });
  }

  if (input.reportCount > 0) {
    items.push({
      id: "performance-reports",
      label: "Performance reports prepared",
      value: input.reportCount,
      detail:
        input.reportCount === 1
          ? "1 performance report on file"
          : `${input.reportCount} performance reports on file`,
      evidence: "computed",
    });
  }

  if (input.retainerOnFile) {
    items.push({
      id: "retainer",
      label: "Ongoing partnership",
      value: null,
      detail: "Active monthly engagement continues",
      evidence: "computed",
    });
  }

  return items;
}

function buildProgress(
  connected: ConnectedWorkspaceData,
  websiteReview: WebsiteReviewLandingData,
  resultsPeriod: string | null,
): PartnershipProgressItem[] {
  const items: PartnershipProgressItem[] = [];

  for (const activity of connected.recentActivity.slice(0, 5)) {
    items.push({
      id: activity.id,
      label: activity.label,
      detail: activity.detail,
      at: activity.at,
    });
  }

  if (items.length === 0) {
    for (const review of [...websiteReview.completedReviews, ...websiteReview.activeReviews]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 4)) {
      items.push({
        id: `review-${review.id}`,
        label: review.title,
        detail: reviewStatusLabel(review.status),
        at: review.updatedAt,
      });
    }
  }

  if (resultsPeriod) {
    items.push({
      id: "reporting-period",
      label: "A performance review was prepared",
      detail: resultsPeriod,
      at: null,
    });
  }

  if (items.length === 0) {
    items.push({
      id: "portal-live",
      label: "Your KXD workspace is available",
      detail: "Recorded activity will appear here as work is captured",
      at: null,
    });
  }

  return items.slice(0, 7);
}

async function loadSupportCounts(clientId: number): Promise<{
  reportCount: number;
  retainerOnFile: boolean;
}> {
  const payload = await getPayload({ config });
  const [reports, retainers] = await Promise.all([
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "monthly-reports" as any,
      where: {
        and: [{ client: { equals: clientId } }, { status: { in: ["ready", "published"] } }],
      },
      limit: 20,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: "retainers",
      where: {
        and: [{ client: { equals: clientId } }, { billingStatus: { equals: "active" } }],
      },
      limit: 5,
      depth: 0,
      overrideAccess: true,
    }),
  ]);

  return {
    reportCount: reports.totalDocs,
    retainerOnFile: retainers.totalDocs > 0,
  };
}

export async function composePartnershipBriefing(input: {
  session: PortalSession;
  profile: ResolvedExperienceProfile;
  websiteReview: WebsiteReviewLandingData;
  connected: ConnectedWorkspaceData;
}): Promise<PartnershipBriefing> {
  const { session, profile, websiteReview, connected } = input;
  const slug = profile.identity.clientSlug;
  const clientName = profile.identity.clientName || session.clientName || "Partnership";

  const [results, counts, serviceScope] = await Promise.all([
    loadPartnershipResults(session.clientId),
    loadSupportCounts(session.clientId),
    loadResolvedServiceScope(session.clientId),
  ]);
  const services = composePartnershipServiceSummary(serviceScope);

  const hasAwaitingClient = websiteReview.activeReviews.some(
    (r) => r.status === "awaiting-your-input",
  );
  const hasActiveReviews = websiteReview.activeReviews.length > 0;
  const recommendation = decideClientRecommendation({
    websiteReview,
    hasAwaitingClient,
    hasActiveReviews,
    results,
    websiteUrl: websiteReview.websiteUrl,
  });

  const websiteSnapshot = buildWebsiteReviewSnapshot(websiteReview);

  let attentionAction: string | null = null;
  let attentionHref: string | null = null;
  if (hasAwaitingClient) {
    const awaiting = websiteReview.activeReviews.find((r) => r.status === "awaiting-your-input");
    attentionAction = awaiting
      ? `Leave a note on “${awaiting.title}”`
      : "Leave a short note on the open revision";
    attentionHref = awaiting ? `/portal/website-review/${awaiting.id}` : "/portal/website-review";
  }

  const activeWork = connected.currentWork.find((item) => item.group === "in-progress");
  const latestProgress = connected.recentActivity[0];
  const primaryService = services.items[0];
  const overview = {
    relationshipStatus: "Your KXD workspace is available",
    currentPhase: serviceScope.relationshipLabel ?? "No phase is recorded yet",
    currentFocus:
      activeWork?.title ?? primaryService?.value ?? "No current focus is recorded",
    lastMajorMilestone: latestProgress?.label ?? "No milestone is recorded yet",
    nextMilestone:
      attentionAction ??
      (hasActiveReviews
        ? "Complete the current website review"
        : "KXD will continue managing the current partnership work"),
    recommendationLine: recommendation.headline,
  };

  // Connected workspace activity is already client-filtered upstream.
  const safeConnected = connected;

  return {
    clientSlug: slug,
    clientName,
    overview,
    services,
    sincePartnering: getPartnershipMilestones(slug),
    delivered: buildDelivered({
      websiteReview,
      reportCount: counts.reportCount,
      retainerOnFile: counts.retainerOnFile,
      services,
    }),
    currentState: {
      initiative: activeWork?.title ?? primaryService?.label ?? "No current initiative is recorded",
      websiteStage: websiteReview.websiteUrl
        ? "Website on file"
        : "Website details are being confirmed",
      reviewState: websiteSnapshot.statusLabel,
      outstandingClientAction: attentionAction,
      outstandingKxdAction: hasActiveReviews
        ? "Advancing the open website revisions with care"
        : primaryService
          ? primaryService.value
          : "No KXD action is recorded right now",
      partnershipHealth: hasAwaitingClient
        ? "Moving forward with one item waiting on you"
        : "No current action is required",
    },
    needsAttention: {
      action: attentionAction,
      href: attentionHref,
      emptyMessage: "No current action is required.",
    },
    websiteReview: websiteSnapshot,
    recentProgress: buildProgress(safeConnected, websiteReview, results?.periodLabel ?? null),
    results,
    recommendation,
    futureModules: getBoardFutureModules([
      ...profile.enabledModules,
      ...profile.reportingCapabilities,
      ...serviceScope.grantedModules,
      ...serviceScope.grantedReporting,
    ]),
    billingPreview: {
      title: "Account & Billing",
      lead: "Invoices and payments will live here as the partnership expands — quiet, clear, and secure.",
      capabilities: [
        "Monthly invoices",
        "Project invoices",
        "Receipts",
        "Payment history",
        "Secure checkout",
        "Saved payment methods",
      ],
      previewNote: "Coming soon — billing stays outside this workspace for now, handled with care.",
      retainerOnFile: counts.retainerOnFile,
    },
  };
}
