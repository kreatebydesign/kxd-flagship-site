import type {
  PortfolioFilterState,
  PortfolioSortId,
  PortfolioViewId,
} from "@/lib/client-portfolio/types";
import { DEFAULT_PORTFOLIO_FILTERS } from "@/lib/client-portfolio/types";
import type {
  ExecutivePriorityLevel,
  ExecutiveRelationshipStatus,
} from "@/lib/executive-client-profile";

const SORT_IDS: PortfolioSortId[] = ["priority", "name", "revenue", "next-due"];
const VIEW_IDS: PortfolioViewId[] = ["all", "attention"];

function pick<T extends string>(raw: string | null, allowed: readonly T[]): T | "" {
  if (!raw) return "";
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : "";
}

export function parsePortfolioSearchParams(
  params: Readonly<Record<string, string | undefined>>,
): PortfolioFilterState {
  return {
    query: params.q?.trim() ?? "",
    view: pick(params.view ?? null, VIEW_IDS) || "all",
    engagementStatus: pick(
      params.engagement ?? null,
      ["active", "paused", "archived", "prospect"] as const,
    ),
    executiveRelationship: pick(
      params.execRel ?? null,
      ["active", "paused", "at-risk", "archived"] as ExecutiveRelationshipStatus[],
    ),
    internalPriority: pick(
      params.priority ?? null,
      ["low", "medium", "high", "critical"] as ExecutivePriorityLevel[],
    ),
    tier: params.tier?.trim() ?? "",
    profileCoverage:
      pick(params.profile ?? null, ["any", "with-profile", "without-profile"] as const) ||
      "any",
    sort: pick(params.sort ?? null, SORT_IDS) || "priority",
  };
}

export function portfolioFiltersToSearchParams(
  state: PortfolioFilterState,
): URLSearchParams {
  const p = new URLSearchParams();
  if (state.query) p.set("q", state.query);
  if (state.view !== "all") p.set("view", state.view);
  if (state.engagementStatus) p.set("engagement", state.engagementStatus);
  if (state.executiveRelationship) p.set("execRel", state.executiveRelationship);
  if (state.internalPriority) p.set("priority", state.internalPriority);
  if (state.tier) p.set("tier", state.tier);
  if (state.profileCoverage !== "any") p.set("profile", state.profileCoverage);
  if (state.sort !== "priority") p.set("sort", state.sort);
  return p;
}

export function portfolioHref(state: PortfolioFilterState): string {
  const qs = portfolioFiltersToSearchParams(state).toString();
  return qs
    ? `/admin/operations/clients?${qs}`
    : "/admin/operations/clients";
}

export function filtersEqual(a: PortfolioFilterState, b: PortfolioFilterState): boolean {
  return (
    a.query === b.query &&
    a.view === b.view &&
    a.engagementStatus === b.engagementStatus &&
    a.executiveRelationship === b.executiveRelationship &&
    a.internalPriority === b.internalPriority &&
    a.tier === b.tier &&
    a.profileCoverage === b.profileCoverage &&
    a.sort === b.sort
  );
}

export function clearPortfolioFilters(
  keep?: Partial<Pick<PortfolioFilterState, "view" | "sort">>,
): PortfolioFilterState {
  return {
    ...DEFAULT_PORTFOLIO_FILTERS,
    view: keep?.view ?? "all",
    sort: keep?.sort ?? "priority",
  };
}