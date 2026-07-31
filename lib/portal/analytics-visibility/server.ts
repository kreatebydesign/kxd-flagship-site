/**
 * Server entry — resolve Analytics Visibility after portal session authorization.
 * Uses session.clientId only. Never accepts browser clientId as authority.
 */
import "server-only";

import type { ResolvedExperienceProfile } from "@/lib/ces";
import { getReportingCapabilityIds } from "@/lib/ces/partnership/capabilities";
import type { PortalSession } from "@/lib/portal/session";
import {
  defaultWorkPerformancePeriod,
} from "@/lib/portal/work-performance/period";
import { getPortalReports } from "@/lib/reporting/engine";
import { monthLabel } from "@/lib/reporting/templates";
import {
  loadReportingFacts,
  summarizeReportingFactProvenance,
} from "@/lib/reporting/persistence";
import { loadClientReportingConnection } from "@/lib/reporting/providers/connection";
import { composeAnalyticsVisibilityModel } from "./compose";
import type { AnalyticsVisibilityModel, AnalyticsVisibilityReportItem } from "./types";

function mapPublishedReports(
  docs: Array<Record<string, unknown>>,
  authorizedClientId: number,
): AnalyticsVisibilityReportItem[] {
  const items: AnalyticsVisibilityReportItem[] = [];
  for (const doc of docs) {
    const id = Number(doc.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    const clientRaw = doc.client;
    const clientId =
      typeof clientRaw === "number"
        ? clientRaw
        : clientRaw && typeof clientRaw === "object" && "id" in clientRaw
          ? Number((clientRaw as { id: number }).id)
          : null;
    if (clientId !== authorizedClientId) continue;
    items.push({
      id,
      title: String(doc.title ?? "Executive Report"),
      periodLabel: monthLabel(
        Number(doc.reportingMonth),
        Number(doc.reportingYear),
      ),
      href: `/portal/reports/${id}`,
    });
  }
  return items;
}

/**
 * Resolve analytics, website performance, and lead visibility for the
 * authenticated portal session's active client.
 */
export async function resolvePortalAnalyticsVisibility(input: {
  session: PortalSession;
  experienceProfile: ResolvedExperienceProfile;
}): Promise<AnalyticsVisibilityModel> {
  const { session, experienceProfile } = input;

  if (experienceProfile.identity.clientId !== session.clientId) {
    throw new Error(
      "Analytics visibility refused: experience profile client does not match session client.",
    );
  }

  const reportingPeriod = defaultWorkPerformancePeriod();
  const reportingCapabilities = getReportingCapabilityIds(
    experienceProfile.reportingCapabilities,
  );
  const reportingEntitled = reportingCapabilities.length > 0;

  let facts: Awaited<ReturnType<typeof loadReportingFacts>> = [];
  let publishedReports: AnalyticsVisibilityReportItem[] = [];
  let ga4PropertyConfigured = false;
  let searchConsoleConfigured = false;
  let loadError: string | null = null;
  let freshnessNote: string | null = null;

  try {
    const [loadedFacts, connection, reports] = await Promise.all([
      reportingEntitled
        ? loadReportingFacts({ clientId: session.clientId, period: reportingPeriod })
        : Promise.resolve([]),
      loadClientReportingConnection(session.clientId),
      getPortalReports(session.clientId),
    ]);

    if (connection == null) {
      // Hard isolation failure — treat sources as unavailable, do not invent.
      ga4PropertyConfigured = false;
      searchConsoleConfigured = false;
    } else if (connection.clientId !== session.clientId) {
      throw new Error(
        "Analytics visibility refused: reporting connection client mismatch.",
      );
    } else {
      ga4PropertyConfigured = Boolean(connection.ga4PropertyId);
      searchConsoleConfigured = Boolean(connection.searchConsoleSiteUrl);
    }

    facts = loadedFacts.filter((fact) => fact.clientId === session.clientId);
    publishedReports = mapPublishedReports(
      reports as unknown as Array<Record<string, unknown>>,
      session.clientId,
    );

    if (facts.length > 0) {
      const provenance = summarizeReportingFactProvenance(facts);
      freshnessNote = provenance.fetchedAt
        ? `Facts refreshed ${provenance.fetchedAt.slice(0, 10)}`
        : null;
    }
  } catch (error) {
    loadError =
      error instanceof Error && error.message.startsWith("Analytics visibility refused")
        ? "Analytics could not be authorized for this account."
        : "Analytics data is temporarily unavailable for this account.";
    facts = [];
    publishedReports = [];
  }

  return composeAnalyticsVisibilityModel({
    authorizedClientId: session.clientId,
    clientName: session.clientName,
    clientSlug: experienceProfile.identity.clientSlug,
    sourceClientId: session.clientId,
    reportingPeriod,
    reportingFacts: facts,
    reportingEntitled,
    analyticsFreshnessNote: freshnessNote,
    ga4PropertyConfigured,
    searchConsoleConfigured,
    publishedReports,
    loadError,
  });
}
