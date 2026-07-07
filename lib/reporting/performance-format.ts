import { monthLabel } from "./templates";
import type { PerformanceReportType } from "./performance-types";
import { REPORT_TYPE_LABELS } from "./performance-types";
import type { ReportDoc } from "./types";

export function reportTypeLabel(type: string | null | undefined): string {
  if (!type) return "Monthly Report";
  return REPORT_TYPE_LABELS[type as PerformanceReportType] ?? type.replace(/_/g, " ");
}

export function formatReportPeriod(doc: ReportDoc): string {
  const start = doc.periodStart ? String(doc.periodStart) : null;
  const end = doc.periodEnd ? String(doc.periodEnd) : null;

  if (start && end) {
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      const startStr = startDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      });
      const endStr = endDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      return `${startStr} – ${endStr}`;
    } catch {
      /* fall through */
    }
  }

  return monthLabel(Number(doc.reportingMonth), Number(doc.reportingYear));
}

export function fmtReportNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

export function fmtReportCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function fmtReportPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(2)}%`;
}

export function fmtHealthScore(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)} / 10`;
}

export function statusDisplayLabel(status: string | null | undefined): string {
  if (!status) return "Draft";
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/-/g, " ");
}
