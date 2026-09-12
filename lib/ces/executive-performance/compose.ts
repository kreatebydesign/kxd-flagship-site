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
import { factsForDomain } from "@/lib/reporting/domain/snapshot";
import type { BusinessDomain } from "@/lib/reporting/domain/types";
import { defaultExecutiveReportingPeriod } from "@/lib/reporting/ingest/period";
import {
  loadReportingFacts,
  summarizeReportingFactProvenance,
} from "@/lib/reporting/persistence";
import {
  confirmedLeadsUnavailable,
  resolveProviderFreshnessPresentation,
} from "@/lib/reporting/freshness/presentation";
import { getExecutiveEvolution } from "./evolution";
import { buildExecutivePanelMetrics } from "./panel-metrics";
import {
  getExecutivePartnershipValue,
  splitPartnershipPriority,
} from "./partnership-value";
import { getExecutivePresentation } from "./presentation";
import { resolvePrimaryLeadBreakdown } from "@/lib/reporting/leads/primary-leads";
import { fmtReportNumber } from "@/lib/reporting/performance-format";
import {
  isPrimalPostLaunchClient,
  PRIMAL_POST_LAUNCH_OPERATING,
} from "@/lib/ces/profile/primal-post-launch";
import type {
  ExecutiveImpactItem,
  ExecutivePerformanceBriefing,
  ExecutivePerformancePanel,
  ExecutivePrimaryLeadMetric,
  ExecutivePrimaryLeadsOverview,
  ExecutiveReportingProvenance,
  PerformanceConnectionState,
} from "./types";

function providerDisplayLabel(providerId: string): string {
  if (providerId === "google-search-console") return "Search Console";
  if (providerId === "google-analytics-4") return "Google Analytics 4";
  if (providerId === "google-ads") return "Google Ads";
  return providerId;
}

function buildReportingProvenance(input: {
  periodLabel: string;
  periodEnd: string;
  factsLength: number;
  providerIds: string[];
  hasAnyReportingCapability: boolean;
  seoEnabled: boolean;
  websiteAnalyticsEnabled: boolean;
  googleAdsEnabled: boolean;
  sourceFetchedAt: string | null;
  /** True when persisted facts exist but all numeric values are zero. */
  zeroActivity: boolean;
}): ExecutiveReportingProvenance {
  const confirmed = confirmedLeadsUnavailable();
  const providerLabels = input.providerIds.map(providerDisplayLabel);
  const freshness = resolveProviderFreshnessPresentation({
    entitled: input.hasAnyReportingCapability,
    connectedConfigured: input.hasAnyReportingCapability,
    sourceFetchedAt: input.sourceFetchedAt,
    dataThroughDate: input.periodEnd,
    factCount: input.factsLength,
  });

  const base = {
    dataThroughDate: freshness.dataThroughDate,
    lastSuccessfulSyncAt: freshness.lastSuccessfulSyncAt,
    freshnessLabel: freshness.label,
    freshnessState: freshness.state,
    confirmedLeadsLabel: confirmed.label,
    confirmedLeadsDetail: confirmed.detail,
  };

  if (!input.hasAnyReportingCapability) {
    return {
      periodLabel: input.periodLabel,
      providerLabels: [],
      factCount: 0,
      statusNote: "Reporting will appear here once the related capabilities are enabled.",
      ...base,
      freshnessLabel: "Not connected",
      freshnessState: "not_connected",
    };
  }
  if (input.factsLength === 0) {
    const awaiting: string[] = [];
    if (input.seoEnabled) awaiting.push("Search Console");
    if (input.websiteAnalyticsEnabled) awaiting.push("Google Analytics 4");
    if (input.googleAdsEnabled) awaiting.push("Google Ads");
    return {
      periodLabel: input.periodLabel,
      providerLabels: [],
      factCount: 0,
      statusNote:
        awaiting.length > 0
          ? `${awaiting.join(" and ")} ${awaiting.length === 1 ? "is" : "are"} entitled — no facts synced for this period yet.`
          : "Waiting on the first trustworthy reporting signal.",
      ...base,
      freshnessLabel: freshness.label,
      freshnessState: freshness.state,
    };
  }

  const notes: string[] = [];
  if (input.zeroActivity) {
    notes.push("Facts synced for this period — no measurable activity recorded yet.");
  }
  notes.push(
    "Website form leads, qualified call leads, Ads aggregate conversions, and confirmed leads are separate measurements.",
  );
  notes.push(confirmed.detail);

  return {
    periodLabel: input.periodLabel,
    providerLabels,
    factCount: input.factsLength,
    statusNote: notes.join(" "),
    ...base,
  };
}

const PANEL_CAPABILITIES: Array<{
  id: string;
  title: string;
  domainLabel: string;
  capability: ReportingCapabilityId;
}> = [
  { id: "website", title: "Website traffic", domainLabel: "Traffic", capability: "website-analytics" },
  { id: "search", title: "Search visibility", domainLabel: "Visibility", capability: "seo" },
  { id: "ads", title: "Paid acquisition", domainLabel: "Paid", capability: "google-ads" },
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

function formatPrimaryLeadMetric(
  metric: ReturnType<typeof resolvePrimaryLeadBreakdown>["websiteFormLeads"],
): ExecutivePrimaryLeadMetric {
  const deltaLabel =
    metric.available && metric.delta != null
      ? metric.delta === 0
        ? "Unchanged vs prior period"
        : `${metric.delta > 0 ? "+" : ""}${fmtReportNumber(metric.delta)} vs prior period`
      : null;
  return {
    key: metric.key,
    label: metric.label,
    value: metric.available && metric.value != null ? fmtReportNumber(metric.value) : "—",
    deltaLabel,
    definition: metric.definition,
    available: metric.available,
  };
}

function buildPrimaryLeadsOverview(
  facts: Parameters<typeof resolvePrimaryLeadBreakdown>[0]["facts"],
  period: Parameters<typeof resolvePrimaryLeadBreakdown>[0]["period"],
): ExecutivePrimaryLeadsOverview {
  const breakdown = resolvePrimaryLeadBreakdown({ facts, period });
  return {
    websiteFormLeads: formatPrimaryLeadMetric(breakdown.websiteFormLeads),
    paidQualifiedCallLeads: formatPrimaryLeadMetric(breakdown.paidQualifiedCallLeads),
    totalPrimaryLeads: formatPrimaryLeadMetric(breakdown.totalPrimaryLeads),
    excludedNote:
      "Primary leads never include Ads form conversions or GA4/Ads aggregate conversions — those can double-count the same website form.",
  };
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
      detail: "From prepared partnership reports.",
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
    periodEnd: period.end,
    factsLength: factProvenance.factCount,
    providerIds: factProvenance.providerIds,
    hasAnyReportingCapability,
    seoEnabled: enabledSet.has("seo"),
    websiteAnalyticsEnabled: enabledSet.has("website-analytics"),
    googleAdsEnabled: enabledSet.has("google-ads"),
    sourceFetchedAt: factProvenance.fetchedAt,
    zeroActivity,
  });

  const postLaunchEarly = isPrimalPostLaunchClient(slug);
  if (postLaunchEarly) {
    const monthlyLabel = period.label ?? `${period.start} – ${period.end}`;
    reportingProvenance.baselineLabel = `September 11, 2026 post-launch baseline established`;
    reportingProvenance.monthlyPeriodLabel = `Last complete monthly facts window: ${monthlyLabel}`;
    reportingProvenance.periodLabel = `September baseline established · monthly window ${monthlyLabel}`;
    reportingProvenance.statusNote = [
      reportingProvenance.statusNote,
      "September is not treated as a complete month. Live monthly figures use the last completed calendar month until current-month facts sync.",
      "Verified organic/Ads baselines for leadership are in the Leadership Report.",
    ]
      .filter(Boolean)
      .join(" ");
  }

  const performancePanels: ExecutivePerformancePanel[] = PANEL_CAPABILITIES.map((panel) => {
    const capabilityEnabled = enabledSet.has(panel.capability);
    const domainKey = (
      panel.capability === "website-analytics"
        ? "website"
        : panel.capability === "seo"
          ? "search"
          : "marketing"
    ) as BusinessDomain;
    /* Connected only when THIS domain has persisted facts — never from sibling providers. */
    const domainFacts = factsForDomain(bundle.snapshot, domainKey);
    const hasDomainSignal =
      capabilityEnabled &&
      domainFacts.length > 0 &&
      domainHealth.get(domainKey) !== undefined &&
      domainHealth.get(domainKey) !== "unknown";
    const state = panelState(capabilityEnabled, Boolean(hasDomainSignal));
    const freshnessBlocksInsight = [
      "stale",
      "sync_failed",
      "never_synchronized",
      "unavailable",
      "not_connected",
      "not_enough_data",
    ].includes(reportingProvenance.freshnessState ?? "");
    const observations =
      state === "connected" && !freshnessBlocksInsight
        ? bundle.observations
            .filter((o) => o.domain === domainKey)
            .slice(0, 1)
            .map((o) => o.statement)
        : [];
    const metrics =
      state === "connected"
        ? buildExecutivePanelMetrics(panel.id, bundle.snapshot)
        : [];

    return {
      id: panel.id,
      title: panel.title,
      domainLabel: panel.domainLabel,
      state,
      summary: freshnessBlocksInsight
        ? "Waiting on current provider data"
        : panelSummary(state, domainHealth.get(domainKey)),
      detail:
        freshnessBlocksInsight
          ? reportingProvenance.freshnessLabel
            ? `Insights paused — ${reportingProvenance.freshnessLabel.toLowerCase()}.`
            : "Insights paused until provider data is current."
          : state === "connected" && observations[0]
            ? observations[0]
            : null,
      evidenceLabels: observations,
      metrics,
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
    title: "Movement",
    domainLabel: "Overall",
    state: momentumConnection,
    summary:
      momentumConnection === "connected"
        ? (momentumLabel(momentumState) ?? "Coming into focus")
        : "",
    detail: null,
    evidenceLabels: [],
    metrics: [],
  });

  const primaryLeads = buildPrimaryLeadsOverview(facts, period);

  const postLaunch = isPrimalPostLaunchClient(slug);
  const primaryAction = postLaunch
    ? {
        label: PRIMAL_POST_LAUNCH_OPERATING.primaryActionLabel,
        href: PRIMAL_POST_LAUNCH_OPERATING.primaryActionHref,
      }
    : input.briefing.needsAttention.href
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

  const recentImprovements = input.briefing.recentProgress.slice(0, 6).map((item) => ({
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
  const secondaryAction = postLaunch
    ? {
        label: PRIMAL_POST_LAUNCH_OPERATING.secondaryActionLabel,
        href: PRIMAL_POST_LAUNCH_OPERATING.secondaryActionHref,
      }
    : input.websiteReview.websiteUrl
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

  const performancePanelsAdjusted = performancePanels.map((panel) => {
    if (!postLaunch) return panel;
    if (panel.id === "momentum" && panel.state === "awaiting-signal") {
      return {
        ...panel,
        summary: PRIMAL_POST_LAUNCH_OPERATING.momentumLabel,
        detail: PRIMAL_POST_LAUNCH_OPERATING.momentumDetail,
      };
    }
    if (panel.id === "website" && panel.state === "not-connected") {
      return {
        ...panel,
        summary: "Measurement active",
        detail: PRIMAL_POST_LAUNCH_OPERATING.websitePanelNote,
      };
    }
    if (panel.id === "ads" && panel.state === "not-connected") {
      return {
        ...panel,
        summary: "Performance reviewed",
        detail: PRIMAL_POST_LAUNCH_OPERATING.adsPanelNote,
      };
    }
    if (panel.id === "search" && panel.state === "awaiting-signal") {
      return {
        ...panel,
        summary: "Baseline established",
        detail: PRIMAL_POST_LAUNCH_OPERATING.searchPanelFallback,
      };
    }
    return panel;
  });

  return {
    clientId,
    clientName: input.profile.identity.clientName,
    clientSlug: slug,
    presentation: {
      ...presentation,
      logoSrc: input.profile.identity.logoUrl ?? presentation.logoSrc,
      logoAlt: input.profile.identity.logoAlt || presentation.logoAlt,
      introduction: postLaunch
        ? "Website live. Production verified. Measurement active. Focus: growth."
        : presentation.introduction,
    },
    greeting: input.greeting,
    summary: {
      currentPhase: input.briefing.overview.currentPhase,
      currentFocus: input.briefing.overview.currentFocus,
      nextMilestone: input.briefing.overview.nextMilestone,
      lastMajorMilestone: input.briefing.overview.lastMajorMilestone,
      labels: {
        phase: "Current priority",
        focus: "Biggest opportunity",
        next: "Watching",
        recent: "Recent win",
      },
    },
    recommendation: input.briefing.recommendation,
    primaryAction,
    performancePanels: performancePanelsAdjusted,
    primaryLeads,
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
      statusLabel: postLaunch
        ? "Website live · Production verified"
        : wr.statusLabel,
      explanation: postLaunch
        ? "Launch is complete. Website Review remains available for future notes — it is no longer blocking production."
        : wr.nextStep,
      primaryAction,
      secondaryAction,
      recentActivity: latestReviews,
    },
    evolution: getExecutiveEvolution(slug),
    account,
    momentumLabel: postLaunch
      ? PRIMAL_POST_LAUNCH_OPERATING.momentumLabel
      : momentumHasSignal
        ? momentumLabel(momentumState)
        : null,
    composedAt: bundle.composedAt,
  };
}
