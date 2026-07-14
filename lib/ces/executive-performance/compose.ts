/**
 * Phase 31A.2 / 31C — Compose Executive Performance workspace (6 zones).
 * No Google provider calls from portal compose. No invented metrics.
 * Reporting: load persisted ReportingFacts only → Reporting Engine compose.
 * Entitlements: Client Experience Profile.enabledModules → getReportingCapabilityIds only.
 */

import "server-only";

import type { ResolvedExperienceProfile } from "@/lib/ces/types";
import type { PartnershipBriefing } from "@/lib/ces/partnership/types";
import { getPartnershipStoryTimeline } from "@/lib/ces/partnership/milestones";
import type { WebsiteReviewLandingData } from "@/lib/ces/modules/website-review/types";
import { getReportingCapabilityIds } from "@/lib/ces/partnership/capabilities";
import type { ReportingCapabilityId } from "@/lib/reporting/domain/capabilities";
import { composeReportingIntelligence } from "@/lib/reporting/compose/intelligence";
import { defaultExecutiveReportingPeriod } from "@/lib/reporting/ingest/period";
import {
  loadReportingFacts,
  summarizeReportingFactProvenance,
} from "@/lib/reporting/persistence";
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
  ExecutiveReportingProvenance,
  PerformanceConnectionState,
} from "./types";

function providerDisplayLabel(providerId: string): string {
  if (providerId === "google-search-console") return "Search Console";
  if (providerId === "google-analytics-4") return "Google Analytics 4";
  return providerId;
}

function buildReportingProvenance(input: {
  periodLabel: string;
  factsLength: number;
  providerIds: string[];
  hasAnyReportingCapability: boolean;
  seoEnabled: boolean;
  websiteAnalyticsEnabled: boolean;
  /** True when persisted facts exist but all numeric values are zero. */
  zeroActivity: boolean;
}): ExecutiveReportingProvenance {
  const providerLabels = input.providerIds.map(providerDisplayLabel);
  if (!input.hasAnyReportingCapability) {
    return {
      periodLabel: input.periodLabel,
      providerLabels: [],
      factCount: 0,
      statusNote: "Reporting will appear here once the related capabilities are enabled.",
    };
  }
  if (input.factsLength === 0) {
    const awaiting: string[] = [];
    if (input.seoEnabled) awaiting.push("Search Console");
    if (input.websiteAnalyticsEnabled) awaiting.push("Google Analytics 4");
    return {
      periodLabel: input.periodLabel,
      providerLabels: [],
      factCount: 0,
      statusNote:
        awaiting.length > 0
          ? `${awaiting.join(" and ")} ${awaiting.length === 1 ? "is" : "are"} entitled — no facts synced for this period yet.`
          : "Waiting on the first trustworthy reporting signal.",
    };
  }
  return {
    periodLabel: input.periodLabel,
    providerLabels,
    factCount: input.factsLength,
    statusNote: input.zeroActivity
      ? "Facts synced for this period — no measurable activity recorded yet."
      : null,
  };
}

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
      return "Building";
    case "improving":
      return "Improving";
    case "stable":
      return "Steady";
    case "slowing":
      return "Worth a closer look";
    case "declining":
      return "Needs closer attention";
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
  if (state === "awaiting-signal") return "Waiting on the first trustworthy signal";
  if (domainState === "improving" || domainState === "healthy") return "Looking healthy";
  if (domainState === "attention" || domainState === "critical") return "Worth a closer look";
  return "Still coming into focus";
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
      detail: "From prepared partnership reports — factual summary language only.",
      hasEvidence: true,
    });
  }
  if (input.hasReview && items.length < 3) {
    items.push({
      id: "collaboration",
      label: "Clear collaboration",
      detail: "Website Review keeps revision notes organized in one private place.",
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
  const period = defaultExecutiveReportingPeriod(new Date());

  const enabledCapabilities =
    input.reportingCapabilities ??
    getReportingCapabilityIds(input.profile.reportingCapabilities);

  // Portal compose never calls Google — Shared Core ReportingFacts only.
  const facts = await loadReportingFacts({ clientId, period });
  const factProvenance = summarizeReportingFactProvenance(facts);
  const zeroActivity =
    facts.length > 0 && facts.every((f) => Number(f.value) === 0);

  const bundle = composeReportingIntelligence({
    clientId,
    period,
    facts,
    enabledCapabilities,
    composedAt: new Date().toISOString(),
  });

  const enabledSet = new Set(enabledCapabilities);
  const domainHealth = new Map(bundle.health.domains.map((d) => [d.domain, d.state]));
  const hasAnyFact = bundle.snapshot.facts.length > 0;
  const hasAnyReportingCapability = enabledCapabilities.length > 0;
  const reportingProvenance = buildReportingProvenance({
    periodLabel: period.label ?? `${period.start} – ${period.end}`,
    factsLength: factProvenance.factCount,
    providerIds: factProvenance.providerIds,
    hasAnyReportingCapability,
    seoEnabled: enabledSet.has("seo"),
    websiteAnalyticsEnabled: enabledSet.has("website-analytics"),
    zeroActivity,
  });


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
    ? { label: "Review the website", href: input.briefing.needsAttention.href }
    : input.websiteReview.websiteUrl
      ? { label: "Review the website", href: "/portal/website-review/session/new" }
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
    ? { label: "Leave written notes", href: "/portal/website-review/request" }
    : { label: "Leave written notes", href: "/portal/website-review/request" };

  const billing = input.briefing.billingPreview;
  const account = {
    engagementStatus: input.briefing.overview.relationshipStatus,
    billingAvailability: billing.retainerOnFile
      ? "Retainer on file"
      : "Handled personally with your KXD partner",
    note: billing.retainerOnFile
      ? billing.previewNote
      : "You're not alone in this — whenever something needs attention, your KXD partner is close.",
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
    reportingProvenance,
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
