/**
 * Phase 31A / 31A.1 — Compose Executive Performance from Shared Core + Reporting Engine.
 * No Google provider calls. No invented metrics.
 * Entitlements: Client Experience Profile.enabledModules → getReportingCapabilityIds only.
 */

import "server-only";

import type { ResolvedExperienceProfile } from "@/lib/ces/types";
import type { PartnershipBriefing } from "@/lib/ces/partnership/types";
import type { WebsiteReviewLandingData } from "@/lib/ces/modules/website-review/types";
import { getReportingCapabilityIds } from "@/lib/ces/partnership/capabilities";
import { createMonthPeriod } from "@/lib/reporting/domain/period";
import type { ReportingCapabilityId } from "@/lib/reporting/domain/capabilities";
import { composeReportingIntelligence } from "@/lib/reporting/compose/intelligence";
import { getExecutiveEvolution } from "./evolution";
import { getExecutivePartnershipValue } from "./partnership-value";
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
  {
    id: "website",
    title: "Website Performance",
    domainLabel: "Website",
    capability: "website-analytics",
  },
  {
    id: "search",
    title: "Search Visibility",
    domainLabel: "Search",
    capability: "seo",
  },
  {
    id: "ads",
    title: "Google Ads",
    domainLabel: "Marketing",
    capability: "google-ads",
  },
];

function momentumLabel(state: string): string | null {
  switch (state) {
    case "accelerating":
      return "Momentum accelerating";
    case "improving":
      return "Momentum improving";
    case "stable":
      return "Momentum steady";
    case "slowing":
      return "Momentum slowing";
    case "declining":
      return "Momentum needs attention";
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
  if (state === "not-connected") {
    return "Not connected to this partnership workspace yet.";
  }
  if (state === "awaiting-signal") {
    return "Capability is enabled — awaiting the first trustworthy reporting signal.";
  }
  if (domainState === "improving" || domainState === "healthy") {
    return "Signals indicate a healthy, improving picture.";
  }
  if (domainState === "attention" || domainState === "critical") {
    return "Signals suggest this area deserves leadership attention.";
  }
  return "Signals are present and under review.";
}

/**
 * Business impact — evidence first; restrained narratives only when operationally grounded.
 * Never invent performance percentages or connectivity claims.
 */
function buildImpact(input: {
  resultsOutcomes: string[];
  hasReview: boolean;
  hasReviewUrl: boolean;
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

  if (input.hasReview || input.hasReviewUrl) {
    items.push({
      id: "collaboration",
      label: "Centralized collaboration",
      detail: "Website Review keeps revision notes in one private channel.",
      hasEvidence: input.hasReview,
    });
  }

  if (input.hasReview) {
    items.push({
      id: "review-cycles",
      label: "Clearer review cycles",
      detail: "Precise feedback replaces scattered email threads.",
      hasEvidence: true,
    });
  }

  // Soft narrative only when no evidence-backed rows yet — no implied analytics wins.
  if (items.length === 0) {
    items.push({
      id: "operating-clarity",
      label: "Shared operating clarity",
      detail: "Leadership and delivery share one private partnership workspace.",
      hasEvidence: false,
    });
  }

  return items.slice(0, 5);
}

export async function composeExecutivePerformance(input: {
  profile: ResolvedExperienceProfile;
  briefing: PartnershipBriefing;
  websiteReview: WebsiteReviewLandingData;
  greeting: string;
  /** Optional explicit reporting capability overrides (tests only). */
  reportingCapabilities?: readonly ReportingCapabilityId[];
}): Promise<ExecutivePerformanceBriefing | null> {
  const slug = input.profile.identity.clientSlug;
  const presentation = getExecutivePresentation(slug);
  if (!presentation?.enabled) return null;

  const clientId = input.profile.identity.clientId;
  const now = new Date();
  const period = createMonthPeriod(now.getUTCFullYear(), now.getUTCMonth() + 1);

  // Canonical entitlement path only — presentation never grants capabilities.
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
  const domainHealth = new Map(
    bundle.health.domains.map((d) => [d.domain, d.state]),
  );
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
            .slice(0, 2)
            .map((o) => o.statement)
        : [];

    return {
      id: panel.id,
      title: panel.title,
      domainLabel: panel.domainLabel,
      state,
      summary: panelSummary(state, domainHealth.get(domainKey)),
      // Avoid repeating identical not-connected detail across every panel.
      detail:
        state === "connected" && observations[0]
          ? observations[0]
          : state === "awaiting-signal"
            ? "No reporting facts have been recorded for this period."
            : null,
      evidenceLabels: observations,
    };
  });

  // Momentum never claims movement without facts; not entitled when no reporting caps.
  const momentumState = bundle.momentum.overall.state;
  const momentumHasSignal = hasAnyFact && momentumState !== "unknown";
  const momentumConnection: PerformanceConnectionState = !hasAnyReportingCapability
    ? "not-connected"
    : momentumHasSignal
      ? "connected"
      : "awaiting-signal";

  performancePanels.push({
    id: "momentum",
    title: "Business Momentum",
    domainLabel: "Overall",
    state: momentumConnection,
    summary:
      momentumConnection === "connected"
        ? (momentumLabel(momentumState) ?? "Momentum under review.")
        : momentumConnection === "awaiting-signal"
          ? "Momentum will clarify after connected reporting accumulates trustworthy history."
          : "Business momentum reporting is not connected yet.",
    detail:
      momentumConnection === "connected"
        ? `Observed across ${bundle.momentum.overall.periodsObserved} period(s).`
        : momentumConnection === "not-connected"
          ? "Enable reporting capabilities when the partnership is ready for live signal."
          : null,
    evidenceLabels: [],
  });

  const primaryAction = input.briefing.needsAttention.href
    ? {
        label: "Review Website",
        href: input.briefing.needsAttention.href,
      }
    : input.websiteReview.websiteUrl
      ? {
          label: "Review Website",
          href: "/portal/website-review/session/new",
        }
      : {
          label: "Open Website Review",
          href: "/portal/website-review",
        };

  const resultsOutcomes = input.briefing.results?.outcomes ?? [];
  const reviewCount =
    input.websiteReview.activeReviews.length + input.websiteReview.completedReviews.length;

  const recentImprovements = input.briefing.recentProgress.slice(0, 5).map((item) => ({
    id: item.id,
    label: item.label,
    detail: item.detail ?? null,
    at: item.at,
  }));

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
    recommendation: input.briefing.recommendation,
    primaryAction,
    performancePanels,
    partnership: getExecutivePartnershipValue(slug),
    impact: buildImpact({
      resultsOutcomes,
      hasReview: reviewCount > 0,
      hasReviewUrl: Boolean(input.websiteReview.websiteUrl),
    }),
    evolution: getExecutiveEvolution(slug),
    currentFocus: input.briefing.overview.currentFocus,
    recentImprovements,
    momentumLabel: momentumHasSignal ? momentumLabel(momentumState) : null,
    composedAt: bundle.composedAt,
  };
}
