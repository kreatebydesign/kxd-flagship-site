/**
 * Client-facing presentation overrides for branded reports.
 */

import { createBrandedReportPeriod, DEFAULT_REPORTING_TIMEZONE } from "./period";
import type { BrandedReportPeriod, BrandedReportPresentation, BrandedReportSnapshot } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export const GOOGLE_ADS_AUDIT_REPAIR_KIND = "google-ads-audit-repair";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function reportMonthLabelFromParts(
  year: number | null | undefined,
  month: number | null | undefined,
): string | null {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export function reportKindFromDoc(doc: AnyDoc): string | null {
  const provenance = doc.dataProvenance;
  if (!provenance || typeof provenance !== "object") return null;
  const kind = (provenance as Record<string, unknown>).reportKind;
  return typeof kind === "string" ? kind : null;
}

function provenanceString(
  provenance: Record<string, unknown> | null,
  key: string,
): string | null {
  if (!provenance) return null;
  const value = provenance[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function presentationForReportDoc(doc: AnyDoc): BrandedReportPresentation {
  const kind = reportKindFromDoc(doc);
  const title = typeof doc.title === "string" ? doc.title.trim() : "";
  const provenance =
    doc.dataProvenance && typeof doc.dataProvenance === "object"
      ? (doc.dataProvenance as Record<string, unknown>)
      : null;

  if (kind === GOOGLE_ADS_AUDIT_REPAIR_KIND) {
    return {
      kind: GOOGLE_ADS_AUDIT_REPAIR_KIND,
      documentTitle: "Google Ads Audit & Repair Report",
      coverTitle: "Google Ads Audit & Repair Report",
      coverEyebrow: "Audit & repair deliverable",
      performanceSnapshotLead:
        "These figures come from manually reconciled Google Ads exports for the audit period. They reflect export evidence, not a live platform connection.",
      hideDataFreshnessPanel: true,
      hideOutOfScope: true,
      hideWorkCompletedList: true,
      hideNarrativeProvenance: true,
      useAuditTheme: true,
      auditBrandAccent: "#A83424",
      hiddenNarrativeKeys: [
        "websitePerformance",
        "organicSearch",
      ],
      sectionTitles: {
        executiveSummary: "Executive summary",
        workCompleted: "Repairs completed",
        issuesOrRisks: "What KXD found",
        improvementsAndWins: "What was intentionally protected",
        augustPriorities: "Next measurement window",
        googleAds: "Next steps — Growth rebuild",
        closing: "Closing",
      },
    };
  }

  const reportMonthLabel =
    provenanceString(provenance, "reportMonth") ??
    reportMonthLabelFromParts(doc.reportingYear, doc.reportingMonth);

  const googlePerformancePeriodLabel =
    provenanceString(provenance, "googlePerformancePeriod") ??
    provenanceString(provenance, "analyticsPeriodLabel");

  const missingWebsiteAnalyticsNote = provenanceString(
    provenance,
    "missingWebsiteAnalyticsNote",
  );

  const includedCaps = Array.isArray(doc.includedCapabilities)
    ? doc.includedCapabilities.map(String)
    : [];
  const hideAds = !includedCaps.includes("google-ads");

  return {
    kind: "monthly",
    documentTitle:
      title ||
      (reportMonthLabel ? `${reportMonthLabel} Monthly Report` : "Monthly Performance Report"),
    coverTitle: reportMonthLabel || "Monthly Performance Report",
    coverEyebrow: "Kreate by Design",
    coverSubtitle: "Monthly Report",
    reportMonthLabel: reportMonthLabel ?? undefined,
    googlePerformancePeriodLabel,
    missingWebsiteAnalyticsNote,
    performanceSnapshotLead: googlePerformancePeriodLabel
      ? `Google performance — ${googlePerformancePeriodLabel}`
      : reportMonthLabel
        ? `Performance for ${reportMonthLabel}`
        : undefined,
    hideDataFreshnessPanel: true,
    hideOutOfScope: true,
    hideWorkCompletedList: false,
    hideNarrativeProvenance: true,
    useAuditTheme: false,
    hiddenNarrativeKeys: hideAds ? ["googleAds"] : [],
    sectionTitles: {
      workCompleted: "KXD work this month",
      augustPriorities: "What's next",
      websitePerformance: "Website performance",
      organicSearch: "Google Search performance",
    },
  };
}

export function narrativeTitleForSnapshot(
  snapshot: BrandedReportSnapshot,
  key: keyof BrandedReportSnapshot["narratives"],
): string {
  return snapshot.presentation?.sectionTitles?.[key] ?? snapshot.narratives[key].title;
}

export function isNarrativeHidden(
  snapshot: BrandedReportSnapshot,
  key: keyof BrandedReportSnapshot["narratives"],
): boolean {
  return snapshot.presentation?.hiddenNarrativeKeys?.includes(key) ?? false;
}

/**
 * Resolve branded period bounds from stored monthly-report dates.
 * Same-calendar-month ranges use day bounds; cross-month ranges keep ISO start/end.
 */
export function brandedReportPeriodFromDoc(input: {
  periodStart: string;
  periodEnd: string;
  reportingYear?: number | null;
  reportingMonth?: number | null;
  timezone?: string | null;
}): BrandedReportPeriod {
  const timezone =
    (input.timezone && input.timezone.trim()) || DEFAULT_REPORTING_TIMEZONE;
  const start = new Date(input.periodStart);
  const end = new Date(input.periodEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    throw new Error("Invalid reporting period dates.");
  }

  const startYear = start.getUTCFullYear();
  const startMonth = start.getUTCMonth() + 1;
  const startDay = start.getUTCDate();
  const endYear = end.getUTCFullYear();
  const endMonth = end.getUTCMonth() + 1;
  const endDay = end.getUTCDate();

  if (startYear === endYear && startMonth === endMonth) {
    return createBrandedReportPeriod({
      year: startYear,
      month: startMonth,
      startDay,
      endDay,
      timezone,
    });
  }

  const startStr = start.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  const endStr = end.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  const year =
    Number.isFinite(input.reportingYear) && Number(input.reportingYear) > 0
      ? Number(input.reportingYear)
      : endYear;
  const month =
    Number.isFinite(input.reportingMonth) &&
    Number(input.reportingMonth) >= 1 &&
    Number(input.reportingMonth) <= 12
      ? Number(input.reportingMonth)
      : endMonth;

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: `${startStr} – ${endStr}`,
    year,
    month,
    timezone,
    isControlledJuly2026: false,
    excludesFinalDayNote: null,
  };
}
