/**
 * Phase 5 Batch 5A — Monthly Work Summary inclusion policy (pure).
 *
 * Trusted completed-work sources for the portal monthly summary only:
 * 1. monthly-deliverables with status `complete` + schema `completedDate`
 * 2. Website Review items with client status `completed` + schema-backed completion day
 *
 * Declined Website Review (`closed`) is excluded from the summary.
 * Never use `updatedAt` as proof of completion month.
 */

import type { WebsiteReviewClientStatus } from "@/lib/ces/vocabulary/website-review";
import type { PeriodWindow } from "@/lib/reporting/domain/types";
import { isIsoDateInPeriod } from "./period";
import type { WorkPerformanceWorkItem } from "./types";

/** Deliverable statuses that may enter the monthly completed summary. */
export const MONTHLY_SUMMARY_DELIVERABLE_INCLUDED_STATUSES = ["complete"] as const;

/** Deliverable statuses that must never enter the monthly completed summary. */
export const MONTHLY_SUMMARY_DELIVERABLE_EXCLUDED_STATUSES = [
  "not-started",
  "in-progress",
  "waiting-on-client",
  "blocked",
] as const;

/**
 * Website Review client statuses included in the monthly completed summary.
 * `completed` maps from client-requests.status `complete`.
 * `closed` maps from `declined` and is excluded as declined/rejected work.
 */
export const MONTHLY_SUMMARY_WEBSITE_REVIEW_INCLUDED_STATUSES = [
  "completed",
] as const satisfies readonly WebsiteReviewClientStatus[];

export const MONTHLY_SUMMARY_WEBSITE_REVIEW_EXCLUDED_STATUSES = [
  "review-received",
  "in-review",
  "revision-in-progress",
  "awaiting-your-input",
  "closed",
] as const satisfies readonly WebsiteReviewClientStatus[];

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeCompletionDay(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const day = trimmed.slice(0, 10);
  if (!DAY_RE.test(day)) return null;
  // Reject clearly invalid calendar components without inventing a date.
  const year = Number(day.slice(0, 4));
  const month = Number(day.slice(5, 7));
  const dom = Number(day.slice(8, 10));
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(dom) ||
    month < 1 ||
    month > 12 ||
    dom < 1 ||
    dom > 31
  ) {
    return null;
  }
  const utc = new Date(Date.UTC(year, month - 1, dom));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== dom
  ) {
    return null;
  }
  return day;
}

export function isPlaceholderDeliverableTitle(title: string): boolean {
  const normalized = title.trim().toLowerCase();
  return (
    !normalized ||
    normalized === "deliverable" ||
    normalized === "untitled" ||
    normalized === "new deliverable" ||
    normalized === "monthly deliverable"
  );
}

export function isClientVisibleDeliverableCategory(
  category: string | null | undefined,
): boolean {
  if (category == null || !String(category).trim()) return true;
  return String(category).trim().toLowerCase() !== "admin";
}

export function isMonthlySummaryDeliverableStatus(
  status: string | null | undefined,
): boolean {
  return String(status ?? "") === "complete";
}

export function isMonthlySummaryWebsiteReviewStatus(
  status: string | null | undefined,
): boolean {
  return String(status ?? "") === "completed";
}

export type DeliverableSummarySource = {
  id: string | number;
  title?: unknown;
  status?: unknown;
  completedDate?: unknown;
  /** Must not be used for month bucketing. */
  updatedAt?: unknown;
  createdAt?: unknown;
  category?: unknown;
};

/**
 * Map a monthly-deliverable doc into a summary item, or null when excluded.
 * Uses schema `completedDate` only — never `updatedAt` / `createdAt` for completion.
 */
export function mapDeliverableToMonthlySummaryItem(
  doc: DeliverableSummarySource,
): WorkPerformanceWorkItem | null {
  if (!isMonthlySummaryDeliverableStatus(String(doc.status ?? ""))) return null;

  const title = String(doc.title ?? "").trim() || "Deliverable";
  if (isPlaceholderDeliverableTitle(title)) return null;

  const category =
    doc.category != null && String(doc.category).trim()
      ? String(doc.category)
      : null;
  if (!isClientVisibleDeliverableCategory(category)) return null;

  const completionDay = normalizeCompletionDay(
    doc.completedDate != null ? String(doc.completedDate) : null,
  );
  if (!completionDay) return null;

  return {
    id: `deliverable-${doc.id}`,
    title,
    completedAt: completionDay,
    updatedAt: String(doc.updatedAt ?? doc.createdAt ?? ""),
    categoryLabel: category ? category.replace(/-/g, " ") : null,
    href: "/portal/deliverables",
    source: "deliverable",
  };
}

export type WebsiteReviewSummarySource = {
  id: string;
  title: string;
  status: WebsiteReviewClientStatus | string;
  /** Schema-backed completion day only (from client-requests.completedDate). */
  completedAt?: string | null;
  updatedAt: string;
};

/**
 * Map a Website Review item into a summary item, or null when excluded.
 * Requires client status `completed` and a reliable completion day.
 * Does not treat `updatedAt` as completion proof.
 */
export function mapWebsiteReviewToMonthlySummaryItem(
  review: WebsiteReviewSummarySource,
): WorkPerformanceWorkItem | null {
  if (!isMonthlySummaryWebsiteReviewStatus(String(review.status))) return null;

  const title = String(review.title ?? "").trim();
  if (!title) return null;

  const completionDay = normalizeCompletionDay(review.completedAt);
  if (!completionDay) return null;

  return {
    id: `review-complete-${review.id}`,
    title,
    completedAt: completionDay,
    updatedAt: review.updatedAt,
    categoryLabel: "Website Review",
    href: "/portal/website-review",
    source: "website-review",
  };
}

/** Keep items whose reliable completion day falls in the reporting period. */
export function filterMonthlySummaryItemsForPeriod(
  items: WorkPerformanceWorkItem[],
  period: PeriodWindow,
): WorkPerformanceWorkItem[] {
  return items.filter((item) => isIsoDateInPeriod(item.completedAt, period));
}

export function dedupeMonthlySummaryItems(
  items: WorkPerformanceWorkItem[],
): WorkPerformanceWorkItem[] {
  const seen = new Set<string>();
  const out: WorkPerformanceWorkItem[] = [];
  for (const item of items) {
    const key = `${item.source}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Stable order: completion day ascending, then title, then id. */
export function sortMonthlySummaryItems(
  items: WorkPerformanceWorkItem[],
): WorkPerformanceWorkItem[] {
  return [...items].sort((a, b) => {
    const dayA = a.completedAt ?? "";
    const dayB = b.completedAt ?? "";
    if (dayA !== dayB) return dayA.localeCompare(dayB);
    const titleCmp = a.title.localeCompare(b.title);
    if (titleCmp !== 0) return titleCmp;
    return a.id.localeCompare(b.id);
  });
}

export function projectMonthlySummaryForPeriod(
  items: WorkPerformanceWorkItem[],
  period: PeriodWindow,
): WorkPerformanceWorkItem[] {
  return sortMonthlySummaryItems(
    filterMonthlySummaryItemsForPeriod(dedupeMonthlySummaryItems(items), period),
  );
}

export const MONTHLY_SUMMARY_SCOPE_NOTE =
  "This summary highlights completed deliverables and Website Review work recorded for the reporting month. It is not a complete work ledger, invoice breakdown, or billable-hours report.";
