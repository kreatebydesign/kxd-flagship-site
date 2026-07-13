/**
 * Compose client-safe partnership briefing for portal overview.
 * Reuses Website Review + Connected Workspace loaders — no parallel intelligence stack.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { ResolvedExperienceProfile } from "@/lib/ces/types";
import type { WebsiteReviewLandingData, WebsiteReviewItem } from "@/lib/ces/modules/website-review/types";
import { reviewStatusLabel } from "@/lib/ces/vocabulary/website-review";
import type { ConnectedWorkspaceData } from "@/lib/portal/connected-workspace";
import type { PortalSession } from "@/lib/portal/session";
import { getBoardFutureModules } from "./capabilities";
import { getPartnershipMilestones } from "./milestones";
import { loadPartnershipResults } from "./outcomes";
import { decideClientRecommendation } from "./recommend";
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

  let nextStep = "When you are ready, share the next round of website feedback.";
  if (awaiting.length > 0) {
    nextStep = "A short response will keep the current revision moving.";
  } else if (websiteReview.activeReviews.length > 0) {
    nextStep = "Kreate by Design is advancing the open revisions.";
  } else if (websiteReview.websiteUrl) {
    nextStep = "Review the website and share anything that still needs attention.";
  }

  return {
    statusLabel: latest
      ? reviewStatusLabel(latest.status)
      : hasRevisions
        ? "Organized"
        : "Ready for your eye",
    timelineLabel: hasRevisions
      ? `${websiteReview.activeReviews.length} active · ${websiteReview.completedReviews.length} complete`
      : "Awaiting the first round of feedback",
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
  portalLive: boolean;
}): PartnershipDeliveredItem[] {
  const completedReviews = input.websiteReview.completedReviews.length;
  const activeReviews = input.websiteReview.activeReviews.length;
  const items: PartnershipDeliveredItem[] = [];

  items.push({
    id: "website-rebuild",
    label: "Website rebuild",
    value: null,
    detail: "Flagship site rebuilt and refining toward launch",
    evidence: "curated",
  });

  if (completedReviews > 0) {
    items.push({
      id: "revisions-complete",
      label: "Website revisions completed",
      value: completedReviews,
      detail: completedReviews === 1 ? "1 revision resolved" : `${completedReviews} revisions resolved`,
      evidence: "computed",
    });
  }

  if (activeReviews > 0) {
    items.push({
      id: "revisions-active",
      label: "Revisions in progress",
      value: activeReviews,
      detail:
        activeReviews === 1 ? "1 revision currently active" : `${activeReviews} revisions currently active`,
      evidence: "computed",
    });
  }

  items.push({
    id: "google-ads",
    label: "Growth advertising",
    value: null,
    detail: "Visibility and qualified traffic under continuous care",
    evidence: "curated",
  });

  items.push({
    id: "conversion-tracking",
    label: "Conversion tracking",
    value: null,
    detail: "Lead tracking verified and working",
    evidence: "report",
  });

  if (input.portalLive) {
    items.push({
      id: "portal",
      label: "Private partnership workspace",
      value: null,
      detail: "A calm place for leadership to follow the work",
      evidence: "curated",
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
      id: "ads-period",
      label: "Growth optimization cycle completed",
      detail: resultsPeriod,
      at: null,
    });
  }

  if (items.length === 0) {
    items.push(
      {
        id: "portal-live",
        label: "Private partnership workspace opened",
        detail: "Leadership now has a calm place to follow the work",
        at: null,
      },
      {
        id: "review-ready",
        label: "Website review process introduced",
        detail: "Feedback and revisions stay organized in one place",
        at: null,
      },
      {
        id: "ads-active",
        label: "Growth advertising continues",
        detail: "Visibility and qualified traffic remain under continuous care",
        at: null,
      },
    );
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
        and: [
          { client: { equals: clientId } },
          { status: { in: ["ready", "published"] } },
        ],
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

  const [results, counts] = await Promise.all([
    loadPartnershipResults(session.clientId),
    loadSupportCounts(session.clientId),
  ]);

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
      ? `Respond to “${awaiting.title}”`
      : "Respond to the open revision";
    attentionHref = awaiting
      ? `/portal/website-review/${awaiting.id}`
      : "/portal/website-review";
  } else if (!hasActiveReviews && websiteReview.websiteUrl) {
    attentionAction = "Review the website and share any remaining notes";
    attentionHref = "/portal/website-review/session/new";
  }

  const overview = {
    relationshipStatus: "Active partnership",
    currentPhase: "Website refinement toward launch",
    currentFocus: "Complete remaining website revisions while keeping growth steady",
    lastMajorMilestone: "Private partnership workspace opened",
    nextMilestone: "Website launch",
    recommendationLine: recommendation.headline,
  };

  // Connected workspace activity is already client-filtered upstream.
  const safeConnected = connected;

  return {
    clientSlug: slug,
    clientName,
    overview,
    sincePartnering: getPartnershipMilestones(slug),
    delivered: buildDelivered({
      websiteReview,
      reportCount: counts.reportCount,
      retainerOnFile: counts.retainerOnFile,
      portalLive: true,
    }),
    currentState: {
      initiative: "Bringing the website to launch",
      websiteStage: websiteReview.websiteUrl
        ? "Review Website in refinement"
        : "Website address still being confirmed",
      reviewState: websiteSnapshot.statusLabel,
      outstandingClientAction: attentionAction,
      outstandingKxdAction: hasActiveReviews
        ? "Advancing the open website revisions"
        : "Refining the website and sustaining growth",
      partnershipHealth: "Strong, organized, and moving forward",
    },
    needsAttention: {
      action: attentionAction,
      href: attentionHref,
      emptyMessage: "Nothing is needed from you right now. Everything is in good hands.",
    },
    websiteReview: websiteSnapshot,
    recentProgress: buildProgress(safeConnected, websiteReview, results?.periodLabel ?? null),
    results,
    recommendation,
    futureModules: getBoardFutureModules(),
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
      previewNote: "Coming next — payments are not processed in this workspace yet.",
      retainerOnFile: counts.retainerOnFile,
    },
  };
}
