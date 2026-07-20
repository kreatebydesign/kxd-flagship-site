/**
 * Phase 32A.1 — Load Executive Client Briefing for portal.
 * Live ReportingFacts only when entitled + present. No prepared Ads figures as “current.”
 */

import "server-only";

import { buildExecutivePanelMetrics } from "@/lib/ces/executive-performance/panel-metrics";
import type { WebsiteReviewLandingData } from "@/lib/ces/modules/website-review/types";
import type { ResolvedExperienceProfile } from "@/lib/ces/types";
import { composeReportingIntelligence } from "@/lib/reporting/compose/intelligence";
import type { ReportingCapabilityId } from "@/lib/reporting/domain/capabilities";
import { defaultExecutiveReportingPeriod } from "@/lib/reporting/ingest/period";
import {
  loadReportingFacts,
  summarizeReportingFactProvenance,
} from "@/lib/reporting/persistence";
import { isExecutiveClientBriefingAvailable } from "./availability";
import { composeExecutiveClientBriefing } from "./compose";
import type {
  ExecutiveBriefingMetric,
  ExecutiveBriefingResults,
  ExecutiveBriefingWorkItem,
  ExecutiveClientBriefing,
  ExecutiveClientBriefingUnavailable,
} from "./types";

const PROVIDER_LABELS: Record<string, string> = {
  "google-search-console": "Google Search Console",
  "google-analytics-4": "Google Analytics 4",
  "google-ads": "Google Ads",
};

const PANEL_CAPABILITY: Record<"search" | "website" | "ads", ReportingCapabilityId> = {
  search: "seo",
  website: "website-analytics",
  ads: "google-ads",
};

const PANEL_SOURCE_LABEL: Record<"search" | "website" | "ads", string> = {
  search: "Google Search Console",
  website: "Google Analytics 4",
  ads: "Google Ads",
};

function providerLabel(id: string): string {
  return PROVIDER_LABELS[id] ?? id;
}

function awaitingFromWebsiteReview(
  websiteReview: WebsiteReviewLandingData | null | undefined,
): ExecutiveBriefingWorkItem[] {
  if (!websiteReview) return [];
  const awaiting = websiteReview.activeReviews.filter(
    (r) => r.status === "awaiting-your-input",
  );
  return awaiting.slice(0, 3).map((r) => ({
    id: `review-${r.id}`,
    label: r.title || "Website revision",
    statement: `A website revision is waiting for your review${
      r.title ? `: ${r.title}` : ""
    }.`,
    owner: "client" as const,
  }));
}

/**
 * Live metrics only from ReportingFacts for capabilities this client is entitled to.
 * Prepared monthly-report Ads figures are intentionally not attached here — they are
 * historical authored reports and must not appear as current Partnership performance.
 */
async function loadBriefingResults(
  profile: ResolvedExperienceProfile,
): Promise<ExecutiveBriefingResults> {
  const clientId = profile.identity.clientId;
  const period = defaultExecutiveReportingPeriod(new Date());
  const entitled = profile.reportingCapabilities;
  const facts = await loadReportingFacts({ clientId, period });
  const provenance = summarizeReportingFactProvenance(facts);

  const entitledProviderLabels = provenance.providerIds
    .map(providerLabel)
    .filter((label) => {
      if (label === "Google Search Console") return entitled.includes("seo");
      if (label === "Google Analytics 4") return entitled.includes("website-analytics");
      if (label === "Google Ads") return entitled.includes("google-ads");
      return false;
    });

  const bundle = composeReportingIntelligence({
    clientId,
    period,
    facts,
    enabledCapabilities: entitled,
    composedAt: new Date().toISOString(),
  });

  const liveMetrics: ExecutiveBriefingMetric[] = [];
  for (const panelId of ["search", "website", "ads"] as const) {
    if (!entitled.includes(PANEL_CAPABILITY[panelId])) continue;
    const panelMetrics = buildExecutivePanelMetrics(panelId, bundle.snapshot);
    for (const metric of panelMetrics) {
      /* Never display a live figure without an exact period. */
      if (!period.label) continue;
      liveMetrics.push({
        label: metric.label,
        value: metric.value,
        source: "live-reporting-facts",
        sourceLabel: PANEL_SOURCE_LABEL[panelId],
        periodLabel: period.label,
      });
    }
  }

  const hasLive = liveMetrics.length > 0;

  return {
    live: {
      periodLabel: hasLive ? (period.label ?? null) : null,
      providerLabels: entitledProviderLabels,
      metrics: liveMetrics,
      note: hasLive
        ? null
        : "Live performance numbers will appear here when Search, website analytics, or advertising reporting is connected for this period. Detailed partnership evidence is available in Executive Review.",
    },
    /* Do not surface prepared Ads monthly-report metrics on Partnership. */
    prepared: null,
  };
}

export async function loadExecutiveClientBriefing(input: {
  profile: ResolvedExperienceProfile;
  websiteReview?: WebsiteReviewLandingData | null;
}): Promise<ExecutiveClientBriefing | ExecutiveClientBriefingUnavailable> {
  const slug = input.profile.identity.clientSlug;
  const name = input.profile.identity.clientName;

  if (!slug) {
    return {
      available: false,
      clientSlug: null,
      clientName: name,
      reason: "no-client",
    };
  }

  if (!isExecutiveClientBriefingAvailable(slug)) {
    return {
      available: false,
      clientSlug: slug,
      clientName: name,
      reason: "briefing-disabled",
    };
  }

  const results = await loadBriefingResults(input.profile);
  const briefing = composeExecutiveClientBriefing({
    clientId: input.profile.identity.clientId,
    clientSlug: slug,
    clientName: name,
    results,
    awaitingFromReviews: awaitingFromWebsiteReview(input.websiteReview),
  });

  if (!briefing) {
    return {
      available: false,
      clientSlug: slug,
      clientName: name,
      reason: "no-memory",
    };
  }

  return briefing;
}
