/**
 * Phase 31A.2 — Compose Executive Performance workspace (6 zones).
 * No Google provider calls. No invented metrics.
 * Entitlements: Client Experience Profile.enabledModules → getReportingCapabilityIds only.
 */

import "server-only";

import type { ResolvedExperienceProfile } from "@/lib/ces/types";
import type { PartnershipBriefing } from "@/lib/ces/partnership/types";
import { getPartnershipStoryTimeline } from "@/lib/ces/partnership/milestones";
import type { WebsiteReviewLandingData } from "@/lib/ces/modules/website-review/types";
import { getReportingCapabilityIds } from "@/lib/ces/partnership/capabilities";
import { createMonthPeriod } from "@/lib/reporting/domain/period";
import type { ReportingCapabilityId } from "@/lib/reporting/domain/capabilities";
import { composeReportingIntelligence } from "@/lib/reporting/compose/intelligence";
import { getExecutiveEvolution } from "./evolution";
import {
  getExecutivePartnershipValue,
  splitPartnershipPriority,
} from "./partnership-value";
import { getExecutivePresentation } from "./presentation";
import type {
  ExecutiveImpactItem,
  ExecutivePerformanceBriefing,
  ExecutivePerformancePanel,
  PerformanceConnectionState,
} from "./types";

const PANEL_CAPABILITIES: Array<{
  id: string;
  title: string;
  domainLabel: string;
  capability: ReportingCapabilityId;
}> = [
  { id: "website", title: "Website", domainLabel: "Website", capability: "website-analytics" },
  { id: "search", title: "Search", domainLabel: "Search", capability: "seo" },
  { id: "ads", title: "Google Ads", domainLabel: "Marketing", capability: "google-ads" },
];

function momentumLabel(state: string): string | null {
  switch (state) {
    case "accelerating":
      return "Accelerating";
    case "improving":
      return "Improving";
    case "stable":
      return "Steady";
    case "slowing":
      return "Slowing";
    case "declining":
      return "Needs attention";
    default:
      return null;
  }
}

function panelState(
  capabilityEnabled: boolean,
  hasDomainSignal: boolean,
): PerformanceConnectionState {
  if (!capabilityEnabled) return "not-connected";
  if (!hasDomainSignal) return "awaiting-signal";
  return "connected";
}

function panelSummary(
  state: PerformanceConnectionState,
  domainState: string | undefined,
): string {
  if (state === "not-connected") return "";
  if (state === "awaiting-signal") return "Awaiting first trustworthy signal";
  if (domainState === "improving" || domainState === "healthy") return "Healthy signal";
  if (domainState === "attention" || domainState === "critical") return "Needs attention";
  return "Under review";
}

function buildWorkingSignals(input: {
  resultsOutcomes: string[];
  hasReview: boolean;
}): ExecutiveImpactItem[] {
  const items: ExecutiveImpactItem[] = [];
  for (const outcome of input.resultsOutcomes.slice(0, 3)) {
    items.push({
      id: `outcome-${items.length}`,
      label: outcome,
      detail: "From prepared partnership reports — not live portal metrics.",
      hasEvidence: true,
    });
  }
  if (input.hasReview && items.length < 3) {
    items.push({
      id: "collaboration",
      label: "Centralized collaboration",
      detail: "Website Review keeps revision notes in one private channel.",
      hasEvidence: true,
    });
  }
  return items.slice(0, 3);
}

export async function composeExecutivePerformance(input: {
  profile: ResolvedExperienceProfile;
  briefing: PartnershipBriefing;
  websiteReview: WebsiteReviewLandingData;
  greeting: string;
  reportingCapabilities?: readonly ReportingCapabilityId[];
}): Promise<ExecutivePerformanceBriefing | null> {
  const slug = input.profile.identity.clientSlug;
  const presentation = getExecutivePresentation(slug);
  if (!presentation?.enabled) return null;

  const clientId = input.profile.identity.clientId;
  const now = new Date();
  const period = createMonthPeriod(now.getUTCFullYear(), now.getUTCMonth() + 1);

  const enabledCapabilities =
    input.reportingCapabilities ??
    getReportingCapabilityIds(input.profile.reportingCapabilities);

  const bundle = composeReportingIntelligence({
    clientId,
    period,
    facts: [],
    enabledCapabilities,
    composedAt: new Date().toISOString(),
  });

  const enabledSet = new Set(enabledCapabilities);
  const domainHealth = new Map(bundle.health.domains.map((d) => [d.domain, d.state]));
  const hasAnyFact = bundle.snapshot.facts.length > 0;
  const hasAnyReportingCapability = enabledCapabilities.length > 0;

  const performancePanels: ExecutivePerformancePanel[] = PANEL_CAPABILITIES.map((panel) => {
    const capabilityEnabled = enabledSet.has(panel.capability);
    const domainKey =
      panel.capability === "website-analytics"
        ? "website"
        : panel.capability === "seo"
          ? "search"
          : "marketing";
    const hasDomainSignal =
      capabilityEnabled &&
      hasAnyFact &&
      domainHealth.get(domainKey) !== undefined &&
      domainHealth.get(domainKey) !== "unknown";
    const state = panelState(capabilityEnabled, Boolean(hasDomainSignal));
    const observations =
      state === "connected"
        ? bundle.observations
            .filter((o) => o.domain === domainKey)
            .slice(0, 1)
            .map((o) => o.statement)
        : [];

    return {
      id: panel.id,
      title: panel.title,
      domainLabel: panel.domainLabel,
      state,
      summary: panelSummary(state, domainHealth.get(domainKey)),
      detail: state === "connected" && observations[0] ? observations[0] : null,
      evidenceLabels: observations,
    };
  });

  const momentumState = bundle.momentum.overall.state;
  const momentumHasSignal = hasAnyFact && momentumState !== "unknown";
  const momentumConnection: PerformanceConnectionState = !hasAnyReportingCapability
    ? "not-connected"
    : momentumHasSignal
      ? "connected"
      : "awaiting-signal";

  performancePanels.push({
    id: "momentum",
    title: "Momentum",
    domainLabel: "Overall",
    state: momentumConnection,
    summary:
      momentumConnection === "connected"
        ? (momentumLabel(momentumState) ?? "Under review")
        : "",
    detail: null,
    evidenceLabels: [],
  });

  const primaryAction = input.briefing.needsAttention.href
    ? { label: "Review Website", href: input.briefing.needsAttention.href }
    : input.websiteReview.websiteUrl
      ? { label: "Review Website", href: "/portal/website-review/session/new" }
      : { label: "Open Website Review", href: "/portal/website-review" };

  const reviewCount =
    input.websiteReview.activeReviews.length + input.websiteReview.completedReviews.length;

  const allPartnership = getExecutivePartnershipValue(slug);
  const { primary: partnershipPrimary, secondary: partnershipSecondary } =
    splitPartnershipPriority(allPartnership);

  const progressBeats = getPartnershipStoryTimeline(slug)
    .slice(0, 6)
    .map((beat) => ({
      id: beat.id,
      label: beat.label,
      complete: beat.complete,
    }));

  const recentImprovements = input.briefing.recentProgress.slice(0, 3).map((item) => ({
    id: item.id,
    label: item.label,
    detail: item.detail ?? null,
    at: item.at,
  }));

  const latestReviews = [
    ...input.websiteReview.activeReviews,
    ...input.websiteReview.completedReviews,
  ]
    .slice(0, 3)
    .map((r) => ({
      id: r.id,
      label: r.title,
      at: r.updatedAt || r.submittedAt || null,
    }));

  const wr = input.briefing.websiteReview;
  const secondaryAction = input.websiteReview.websiteUrl
    ? { label: "Share written notes", href: "/portal/website-review/request" }
    : { label: "Share written notes", href: "/portal/website-review/request" };

  const billing = input.briefing.billingPreview;
  const account = {
    engagementStatus: input.briefing.overview.relationshipStatus,
    billingAvailability: billing.retainerOnFile
      ? "Retainer on file"
      : "Billing not active in this workspace",
    note: billing.retainerOnFile
      ? billing.previewNote
      : "Account details stay quiet here — discuss engagement with your KXD partner when needed.",
  };

  return {
    clientId,
    clientName: input.profile.identity.clientName,
    clientSlug: slug,
    presentation: {
      ...presentation,
      logoSrc: input.profile.identity.logoUrl ?? presentation.logoSrc,
      logoAlt: input.profile.identity.logoAlt || presentation.logoAlt,
    },
    greeting: input.greeting,
    summary: {
      currentPhase: input.briefing.overview.currentPhase,
      currentFocus: input.briefing.overview.currentFocus,
      nextMilestone: input.briefing.overview.nextMilestone,
      lastMajorMilestone: input.briefing.overview.lastMajorMilestone,
    },
    recommendation: input.briefing.recommendation,
    primaryAction,
    performancePanels,
    partnershipPrimary,
    partnershipSecondary,
    progressBeats,
    workingSignals: buildWorkingSignals({
      resultsOutcomes: input.briefing.results?.outcomes ?? [],
      hasReview: reviewCount > 0,
    }),
    recentImprovements,
    collaboration: {
      statusLabel: wr.statusLabel,
      explanation: wr.nextStep,
      primaryAction,
      secondaryAction,
      recentActivity: latestReviews,
    },
    evolution: getExecutiveEvolution(slug),
    account,
    momentumLabel: momentumHasSignal ? momentumLabel(momentumState) : null,
    composedAt: bundle.composedAt,
  };
}
