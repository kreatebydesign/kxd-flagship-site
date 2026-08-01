/**
 * Server entry — resolve Work & Performance after portal session authorization.
 * Uses session.clientId only. Never accepts browser clientId as authority.
 *
 * Phase 5 Batch 5A: monthly completed summary uses schema completion dates only
 * (deliverables.completedDate; Website Review completedDate via item.completedAt).
 */
import "server-only";

import type { ResolvedExperienceProfile } from "@/lib/ces";
import { isCesModuleEnabled } from "@/lib/ces";
import type { WebsiteReviewLandingData } from "@/lib/ces/modules/website-review/types";
import { getReportingCapabilityIds } from "@/lib/ces/partnership/capabilities";
import { getPortalDeliverables, getPortalProjects } from "@/lib/portal/data";
import { isClientHqModuleEnabled } from "@/lib/portal/modules";
import type { PortalSession } from "@/lib/portal/session";
import {
  loadReportingFacts,
  summarizeReportingFactProvenance,
} from "@/lib/reporting/persistence";
import type { PeriodWindow } from "@/lib/reporting/domain/types";
import { composeWorkPerformanceModel } from "./compose";
import {
  dedupeMonthlySummaryItems,
  mapDeliverableToMonthlySummaryItem,
  mapWebsiteReviewToMonthlySummaryItem,
  projectMonthlySummaryForPeriod,
} from "./monthly-summary";
import { buildWorkPerformanceNextMoves } from "./next-moves";
import {
  comparisonPeriodFor,
  defaultWorkPerformancePeriod,
} from "./period";
import type {
  WorkPerformanceActiveItem,
  WorkPerformanceModel,
  WorkPerformanceWorkItem,
} from "./types";

function deliverableStatusLabel(status: string): string {
  if (status === "in-progress") return "In progress";
  if (status === "waiting-on-client") return "Waiting on you";
  if (status === "not-started") return "Queued";
  if (status === "blocked") return "Blocked";
  if (status === "complete") return "Complete";
  return status.replace(/-/g, " ");
}

function mapCompletedDeliverables(
  docs: Array<Record<string, unknown>>,
): WorkPerformanceWorkItem[] {
  const out: WorkPerformanceWorkItem[] = [];
  for (const doc of docs) {
    if (doc.id == null) continue;
    const item = mapDeliverableToMonthlySummaryItem({
      id: doc.id as string | number,
      title: doc.title,
      status: doc.status,
      completedDate: doc.completedDate,
      updatedAt: doc.updatedAt,
      createdAt: doc.createdAt,
      category: doc.category,
    });
    if (item) out.push(item);
  }
  return out;
}

function mapActiveDeliverables(
  docs: Array<Record<string, unknown>>,
): WorkPerformanceActiveItem[] {
  return docs
    .filter((doc) => String(doc.status) !== "complete")
    .map((doc) => {
      const status = String(doc.status ?? "not-started");
      return {
        id: `deliverable-${doc.id}`,
        title: String(doc.title ?? "Deliverable"),
        statusLabel: deliverableStatusLabel(status),
        owner:
          status === "waiting-on-client" ? ("client" as const) : ("kxd" as const),
        updatedAt: String(doc.updatedAt ?? doc.createdAt ?? ""),
        href: "/portal/deliverables",
        source: "deliverable" as const,
      };
    });
}

function mapReviewItems(
  websiteReview: WebsiteReviewLandingData | null,
  reportingPeriod: PeriodWindow,
): {
  active: WorkPerformanceActiveItem[];
  completedThisMonth: WorkPerformanceWorkItem[];
  openCount: number;
  awaitingClientCount: number;
  inProgressCount: number;
  completedThisMonthCount: number;
} {
  if (!websiteReview) {
    return {
      active: [],
      completedThisMonth: [],
      openCount: 0,
      awaitingClientCount: 0,
      inProgressCount: 0,
      completedThisMonthCount: 0,
    };
  }

  const active = websiteReview.activeReviews.map((r) => ({
    id: `review-${r.id}`,
    title: r.title,
    statusLabel:
      r.status === "awaiting-your-input"
        ? "Waiting on you"
        : r.status === "in-review"
          ? "In review"
          : "In progress",
    owner:
      r.status === "awaiting-your-input" ? ("client" as const) : ("kxd" as const),
    updatedAt: r.updatedAt,
    href: "/portal/website-review",
    source: "website-review" as const,
  }));

  const completedCandidates = websiteReview.completedReviews
    .map((r) => mapWebsiteReviewToMonthlySummaryItem(r))
    .filter((item): item is WorkPerformanceWorkItem => item != null);

  const completedThisMonth = projectMonthlySummaryForPeriod(
    completedCandidates,
    reportingPeriod,
  );

  const awaitingClientCount = websiteReview.activeReviews.filter(
    (r) => r.status === "awaiting-your-input",
  ).length;
  const inProgressCount = websiteReview.activeReviews.filter(
    (r) => r.status !== "awaiting-your-input",
  ).length;

  return {
    active,
    completedThisMonth,
    openCount: websiteReview.activeReviews.length,
    awaitingClientCount,
    inProgressCount,
    completedThisMonthCount: completedThisMonth.length,
  };
}

function mapActiveProjects(
  docs: Array<Record<string, unknown>>,
): WorkPerformanceActiveItem[] {
  return docs
    .filter((doc) => !["archived", "launched", "complete"].includes(String(doc.status)))
    .slice(0, 5)
    .map((doc) => ({
      id: `project-${doc.id}`,
      title: String(doc.title ?? doc.name ?? "Project"),
      statusLabel: String(doc.status ?? "active").replace(/-/g, " "),
      owner: "kxd" as const,
      updatedAt: String(doc.updatedAt ?? doc.createdAt ?? ""),
      href: "/portal/projects",
      source: "project" as const,
    }));
}

function dedupeByTitleId(items: WorkPerformanceActiveItem[]): WorkPerformanceActiveItem[] {
  const seen = new Set<string>();
  const out: WorkPerformanceActiveItem[] = [];
  for (const item of items) {
    const key = `${item.source}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/**
 * Resolve Work & Performance for the authenticated portal session's active client.
 */
export async function resolvePortalWorkPerformance(input: {
  session: PortalSession;
  experienceProfile: ResolvedExperienceProfile;
  /** Optional — when already loaded on the home path (CES). */
  websiteReview?: WebsiteReviewLandingData | null;
}): Promise<WorkPerformanceModel> {
  const { session, experienceProfile } = input;

  if (experienceProfile.identity.clientId !== session.clientId) {
    throw new Error(
      "Work & performance refused: experience profile client does not match session client.",
    );
  }

  const reportingPeriod = defaultWorkPerformancePeriod();
  const comparisonPeriod = comparisonPeriodFor(reportingPeriod);
  const websiteReviewEntitled = isCesModuleEnabled(experienceProfile, "website-review");
  const reportingCapabilities = getReportingCapabilityIds(
    experienceProfile.reportingCapabilities,
  );
  const reportingEntitled = reportingCapabilities.length > 0;

  const [deliverableDocs, projectDocs, facts] = await Promise.all([
    getPortalDeliverables(session),
    getPortalProjects(session),
    reportingEntitled
      ? loadReportingFacts({ clientId: session.clientId, period: reportingPeriod })
      : Promise.resolve([]),
  ]);

  const docs = deliverableDocs as unknown as Array<Record<string, unknown>>;
  const projects = projectDocs as unknown as Array<Record<string, unknown>>;

  const reviewBundle = mapReviewItems(
    websiteReviewEntitled ? (input.websiteReview ?? null) : null,
    reportingPeriod,
  );

  const completed = dedupeMonthlySummaryItems([
    ...mapCompletedDeliverables(docs),
    ...reviewBundle.completedThisMonth,
  ]);

  const active = dedupeByTitleId([
    ...reviewBundle.active,
    ...mapActiveDeliverables(docs),
    ...mapActiveProjects(projects),
  ]);

  let freshnessNote: string | null = null;
  if (facts.length > 0) {
    const provenance = summarizeReportingFactProvenance(facts);
    freshnessNote = provenance.fetchedAt
      ? `Facts refreshed ${provenance.fetchedAt.slice(0, 10)}`
      : null;
  }

  const requestsEntitled =
    websiteReviewEntitled || isClientHqModuleEnabled("requests");

  const nextMoves = buildWorkPerformanceNextMoves({
    profile: experienceProfile,
    awaitingClientCount: reviewBundle.awaitingClientCount,
    activeReviewCount: reviewBundle.inProgressCount,
    hasAnalytics: reportingEntitled && facts.length > 0,
    completedThisMonth: projectMonthlySummaryForPeriod(completed, reportingPeriod)
      .length,
  });

  return composeWorkPerformanceModel({
    authorizedClientId: session.clientId,
    clientName: session.clientName,
    clientSlug: experienceProfile.identity.clientSlug,
    sourceClientId: session.clientId,
    reportingPeriod,
    comparisonPeriod,
    completedItems: completed,
    activeItems: active,
    updateRequests: {
      entitled: requestsEntitled,
      openCount: reviewBundle.openCount,
      awaitingClientCount: reviewBundle.awaitingClientCount,
      inProgressCount: reviewBundle.inProgressCount,
      completedThisMonthCount: reviewBundle.completedThisMonthCount,
      priority: reviewBundle.active.slice(0, 4),
      primaryActionHref: websiteReviewEntitled
        ? "/portal/website-review"
        : "/portal/requests",
    },
    reportingFacts: facts,
    reportingEntitled,
    analyticsFreshnessNote: freshnessNote,
    nextMoveCandidates: nextMoves,
  });
}

export { periodLabel } from "./period";
