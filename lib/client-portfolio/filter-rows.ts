import {
  countAttentionRows,
  resolveAttentionReasons,
  rowNeedsAttention,
} from "@/lib/client-portfolio/attention";
import type {
  PortfolioFilterResult,
  PortfolioFilterState,
  PortfolioRow,
  PortfolioSortId,
} from "@/lib/client-portfolio/types";

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

function matchesSearch(row: PortfolioRow, query: string): boolean {
  if (!query) return true;
  const haystacks = [
    row.name,
    row.slug,
    row.companyWebsite,
    row.primaryContactName,
    row.primaryContactEmail,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
  return haystacks.some((h) => h.includes(query));
}

function tierKey(row: PortfolioRow): string {
  if (row.tier) return `exec:${row.tier}`;
  if (row.brandTier) return `brand:${row.brandTier}`;
  return "";
}

function priorityRank(p: string | null | undefined): number {
  if (p === "critical") return 0;
  if (p === "high") return 1;
  if (p === "medium") return 2;
  if (p === "low") return 3;
  return 4;
}

function parseDueForSort(raw: string | null): number {
  if (!raw) return Number.POSITIVE_INFINITY;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return Number.POSITIVE_INFINITY;
  return d.getTime();
}

export function sortPortfolioRows(
  rows: PortfolioRow[],
  sort: PortfolioSortId,
): PortfolioRow[] {
  const next = [...rows];
  next.sort((a, b) => {
    if (sort === "name") {
      return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
    }
    if (sort === "revenue") {
      const diff = (b.monthlyRevenue ?? 0) - (a.monthlyRevenue ?? 0);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
    }
    if (sort === "next-due") {
      const da = parseDueForSort(a.nextActionDueDate);
      const db = parseDueForSort(b.nextActionDueDate);
      if (da !== db) return da - db;
      return priorityRank(a.internalPriority) - priorityRank(b.internalPriority);
    }
    const pr = priorityRank(a.internalPriority) - priorityRank(b.internalPriority);
    if (pr !== 0) return pr;
    const rev = (b.monthlyRevenue ?? 0) - (a.monthlyRevenue ?? 0);
    if (rev !== 0) return rev;
    return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
  });
  return next;
}

function passesFilters(
  row: PortfolioRow,
  state: PortfolioFilterState,
  duplicateWarnings: Readonly<Record<number, string>>,
): boolean {
  const q = normalizeQuery(state.query);
  if (!matchesSearch(row, q)) return false;

  if (state.view === "attention" && !rowNeedsAttention(row, duplicateWarnings)) {
    return false;
  }

  if (state.engagementStatus && row.clientStatus !== state.engagementStatus) {
    return false;
  }

  if (
    state.executiveRelationship &&
    row.relationshipStatus !== state.executiveRelationship
  ) {
    return false;
  }

  if (state.internalPriority && row.internalPriority !== state.internalPriority) {
    return false;
  }

  if (state.tier && tierKey(row) !== state.tier) return false;

  if (state.profileCoverage === "with-profile" && !row.hasExecutiveProfile) {
    return false;
  }
  if (state.profileCoverage === "without-profile" && row.hasExecutiveProfile) {
    return false;
  }

  return true;
}

export function filterPortfolioRows(
  allRows: PortfolioRow[],
  state: PortfolioFilterState,
  duplicateWarnings: Readonly<Record<number, string>>,
): PortfolioFilterResult {
  const attentionCount = countAttentionRows(allRows, duplicateWarnings);
  const filtered = allRows.filter((row) => passesFilters(row, state, duplicateWarnings));
  const rows = sortPortfolioRows(filtered, state.sort);
  return { rows, attentionCount };
}

export function getAttentionReasonsForRow(
  row: PortfolioRow,
  duplicateWarnings: Readonly<Record<number, string>>,
): ReturnType<typeof resolveAttentionReasons> {
  return resolveAttentionReasons(row, duplicateWarnings[row.clientId]);
}