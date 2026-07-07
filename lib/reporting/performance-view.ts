import {
  formatReportPeriod,
  reportTypeLabel,
} from "./performance-format";
import type {
  CampaignPerformanceRow,
  GeographicPerformanceRow,
  NextMonthStrategyRow,
  OptimizationWorkRow,
  PerformanceReportViewModel,
  TopSearchTermRow,
} from "./performance-types";
import type { ReportDoc } from "./types";

function resolveClientName(doc: ReportDoc): string {
  const client = doc.client;
  if (client && typeof client === "object") {
    return String((client as ReportDoc).name ?? "Client");
  }
  return "Client";
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function mapLegacyOptimization(workCompleted: string | null | undefined): OptimizationWorkRow[] {
  if (!workCompleted?.trim()) return [];
  return workCompleted
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .map((title) => ({ title }));
}

function mapLegacyStrategy(priorities: unknown): NextMonthStrategyRow[] {
  if (!Array.isArray(priorities)) return [];
  const rows: NextMonthStrategyRow[] = [];
  for (const item of priorities) {
    if (typeof item === "string" && item.trim()) {
      rows.push({ title: item, priority: "medium" });
      continue;
    }
    if (item && typeof item === "object" && "title" in item) {
      const title = String((item as { title?: string }).title ?? "").trim();
      if (!title) continue;
      rows.push({
        title,
        priority: ((item as { priority?: string }).priority as NextMonthStrategyRow["priority"]) ?? "medium",
        description: (item as { description?: string }).description ?? null,
      });
    }
  }
  return rows;
}

function hasPerformanceContent(doc: ReportDoc): boolean {
  if (doc.reportType && doc.reportType !== "monthly_marketing") return true;
  return (
    asArray(doc.campaignPerformance).length > 0 ||
    asArray(doc.geographicPerformance).length > 0 ||
    asArray(doc.topSearchTerms).length > 0 ||
    asArray(doc.optimizationWorkCompleted).length > 0 ||
    asArray(doc.nextMonthStrategy).length > 0 ||
    doc.accountHealthScore != null
  );
}

export function buildPerformanceReportView(doc: ReportDoc): PerformanceReportViewModel {
  const reportType = String(doc.reportType ?? "monthly_marketing");
  const optimizationRows = asArray<OptimizationWorkRow>(doc.optimizationWorkCompleted);
  const strategyRows = asArray<NextMonthStrategyRow>(doc.nextMonthStrategy);

  return {
    id: Number(doc.id),
    clientName: resolveClientName(doc),
    title: String(doc.title ?? "Performance Report"),
    reportType,
    reportTypeLabel: reportTypeLabel(reportType),
    periodLabel: formatReportPeriod(doc),
    preparedBy: String(doc.preparedBy ?? "Kreate by Design"),
    status: String(doc.status ?? "draft"),
    executiveSummary: String(doc.executiveSummary ?? ""),
    campaignPerformance: asArray<CampaignPerformanceRow>(doc.campaignPerformance),
    geographicPerformance: asArray<GeographicPerformanceRow>(doc.geographicPerformance),
    topSearchTerms: asArray<TopSearchTermRow>(doc.topSearchTerms),
    optimizationWorkCompleted:
      optimizationRows.length > 0
        ? optimizationRows
        : mapLegacyOptimization(doc.workCompleted as string | undefined),
    nextMonthStrategy:
      strategyRows.length > 0 ? strategyRows : mapLegacyStrategy(doc.nextMonthPriorities),
    accountHealthScore:
      doc.accountHealthScore != null ? Number(doc.accountHealthScore) : null,
    clientFacingNotes: doc.clientFacingNotes ? String(doc.clientFacingNotes) : null,
    isPerformanceReport: hasPerformanceContent(doc),
  };
}
