/**
 * Phase 32A.1 — Load Executive Client Briefing for portal.
 * Live ReportingFacts + prepared monthly reports kept visibly separate.
 */

import "server-only";

import { buildExecutivePanelMetrics } from "@/lib/ces/executive-performance/panel-metrics";
import { loadPartnershipResults } from "@/lib/ces/partnership/outcomes";
import type { WebsiteReviewLandingData } from "@/lib/ces/modules/website-review/types";
import type { ResolvedExperienceProfile } from "@/lib/ces/types";
import {
  composeReportingIntelligence,
} from "@/lib/reporting/compose/intelligence";
import { getReportingCapabilityIds } from "@/lib/ces/partnership/capabilities";
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

async function loadBriefingResults(clientId: number): Promise<ExecutiveBriefingResults> {
  const period = defaultExecutiveReportingPeriod(new Date());
  const facts = await loadReportingFacts({ clientId, period });
  const provenance = summarizeReportingFactProvenance(facts);
  const providerLabels = provenance.providerIds.map(providerLabel);

  const bundle = composeReportingIntelligence({
    clientId,
    period,
    facts,
    enabledCapabilities: getReportingCapabilityIds(["seo", "website-analytics", "google-ads"]),
    composedAt: new Date().toISOString(),
  });

  const liveMetrics: ExecutiveBriefingMetric[] = [];
  for (const panelId of ["search", "website", "ads"] as const) {
    const panelMetrics = buildExecutivePanelMetrics(panelId, bundle.snapshot);
    for (const metric of panelMetrics) {
      const sourceProvider =
        panelId === "search"
          ? "Google Search Console"
          : panelId === "website"
            ? "Google Analytics 4"
            : "Google Ads";
      liveMetrics.push({
        label: metric.label,
        value: metric.value,
        source: "live-reporting-facts",
        sourceLabel: sourceProvider,
        periodLabel: period.label ?? null,
      });
    }
  }

  const preparedDoc = await loadPartnershipResults(clientId);
  const prepared = preparedDoc
    ? {
        title: "Prepared Google Ads partnership report",
        periodLabel: preparedDoc.periodLabel,
        sourceLabel: "Prepared monthly report (not live ReportingFacts)",
        outcomes: preparedDoc.outcomes,
        metrics: preparedDoc.metrics.map((m) => ({
          label: m.label,
          value: m.value,
          source: "prepared-report" as const,
          sourceLabel: "Prepared Google Ads report",
          periodLabel: preparedDoc.periodLabel,
        })),
        note: "These figures come from a prepared partnership report. They are not live Google Ads ReportingFacts.",
      }
    : null;

  return {
    live: {
      periodLabel: period.label ?? null,
      providerLabels,
      metrics: liveMetrics,
      note:
        liveMetrics.length > 0
          ? null
          : "No live ReportingFacts for this period yet. Search, website, and ads metrics appear here automatically when providers are connected and facts are ingested.",
    },
    prepared,
  };
}

export async function loadExecutiveClientBriefing(input: {
  profile: ResolvedExperienceProfile;
  websiteReview?: WebsiteReviewLandingData | null;
}): Promise<ExecutiveClientBriefing | ExecutiveClientBriefingUnavailable> {
  const slug = input.profile.identity.clientSlug;
  const name = input.profile.identity.clientName;
  const clientId = input.profile.identity.clientId;

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

  const results = await loadBriefingResults(clientId);
  const briefing = composeExecutiveClientBriefing({
    clientId,
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
