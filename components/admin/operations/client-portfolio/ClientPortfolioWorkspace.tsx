"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClientPortfolioFilters } from "@/components/admin/operations/client-portfolio/ClientPortfolioFilters";
import { ClientPortfolioRoster } from "@/components/admin/operations/client-portfolio/ClientPortfolioRoster";
import { filterPortfolioRows } from "@/lib/client-portfolio/filter-rows";
import type { PortfolioFilterState, PortfolioRow } from "@/lib/client-portfolio/types";
import { parsePortfolioSearchParams, portfolioHref } from "@/lib/client-portfolio/url-state";
import { EXECUTIVE_TIER_LABEL, fmtExecutiveMoney } from "@/lib/executive-client-profile";

function tierOptionsFromRows(rows: PortfolioRow[]) {
  const seen = new Map<string, string>();
  for (const row of rows) {
    if (row.tier) {
      const key = `exec:${row.tier}`;
      seen.set(key, EXECUTIVE_TIER_LABEL[row.tier]);
    } else if (row.brandTier) {
      const key = `brand:${row.brandTier}`;
      seen.set(key, row.brandTier.replace(/-/g, " "));
    }
  }
  return [...seen.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function ClientPortfolioWorkspace({
  dateDisplay: _dateDisplay,
  allRows,
  duplicateWarnings,
  withProfiles,
  activeCount,
  totalMRR,
  totalPotential,
  criticalCount,
  duplicateCount,
}: {
  dateDisplay: string;
  allRows: PortfolioRow[];
  duplicateWarnings: Record<number, string>;
  withProfiles: number;
  activeCount: number;
  totalMRR: number;
  totalPotential: number;
  criticalCount: number;
  duplicateCount: number;
}) {
  const searchParams = useSearchParams();
  const [state, setState] = useState<PortfolioFilterState>(() =>
    parsePortfolioSearchParams(Object.fromEntries(searchParams.entries())),
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const urlSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onPopState = () => {
      const fromUrl = parsePortfolioSearchParams(
        Object.fromEntries(new URLSearchParams(window.location.search).entries()),
      );
      setState(fromUrl);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const writeHistoryUrl = useCallback(
    (next: PortfolioFilterState, method: "replace" | "push") => {
      const path = portfolioHref(next);
      if (method === "push") {
        window.history.pushState({ kxdPortfolio: 1 }, "", path);
      } else {
        window.history.replaceState({ kxdPortfolio: 1 }, "", path);
      }
    },
    [],
  );

  const scheduleUrlSync = useCallback(
    (next: PortfolioFilterState, historyMode: "replace" | "push" | "none" = "replace") => {
      if (historyMode === "none") return;
      if (urlSyncTimer.current) clearTimeout(urlSyncTimer.current);
      urlSyncTimer.current = setTimeout(() => {
        writeHistoryUrl(next, historyMode);
      }, 280);
    },
    [writeHistoryUrl],
  );

  const updateState = useCallback(
    (
      next: PortfolioFilterState,
      opts?: { history?: "replace" | "push" | "none" },
    ) => {
      setState(next);
      scheduleUrlSync(next, opts?.history ?? "replace");
    },
    [scheduleUrlSync],
  );

  const { rows: visibleRows, attentionCount } = useMemo(
    () => filterPortfolioRows(allRows, state, duplicateWarnings),
    [allRows, state, duplicateWarnings],
  );

  const tierOptions = useMemo(() => tierOptionsFromRows(allRows), [allRows]);

  const overviewNotes = [
    criticalCount > 0 ? `${criticalCount} critical priority` : null,
    duplicateCount > 0
      ? `${duplicateCount} possible duplicate${duplicateCount === 1 ? "" : "s"} flagged`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const portfolioNote = overviewNotes
    ? `${allRows.length} in portfolio. ${overviewNotes}.`
    : `${allRows.length} in portfolio — revenue, health, and what matters next.`;

  const visibleSummary =
    visibleRows.length === allRows.length
      ? `Showing all ${allRows.length} relationships`
      : `Showing ${visibleRows.length} of ${allRows.length} relationships`;

  const showAttentionReasons =
    state.view === "attention" || attentionCount > 0;

  return (
    <div className="kxd-founder-page kxd-founder-clients">
      <header className="kxd-founder-clients__header">
        <p className="kxd-founder-today__eyebrow">Clients</p>
        <h1 className="kxd-founder-clients__title">Portfolio</h1>
        <p className="kxd-founder-clients__lede">
          Active relationships, revenue, health, and what matters next.
        </p>
      </header>

      <div
        className="kxd-founder-today__metrics kxd-founder-clients__metrics"
        aria-label="Portfolio summary"
      >
        {[
          {
            label: "Portfolio coverage",
            value: `${withProfiles} / ${activeCount}`,
            sub: "Executive profiles among active clients",
          },
          {
            label: "Active relationships",
            value: String(activeCount),
            sub: `${allRows.length} total in roster`,
          },
          {
            label: "Portfolio MRR",
            value: fmtExecutiveMoney(totalMRR),
            sub: "Tracked monthly revenue",
          },
          {
            label: "Growth potential",
            value: fmtExecutiveMoney(totalPotential),
            sub: "Estimated pipeline value",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="kxd-founder-metric">
            <p className="kxd-founder-metric__label">{kpi.label}</p>
            <p className="kxd-founder-metric__value">{kpi.value}</p>
            {kpi.sub ? <p className="kxd-founder-metric__detail">{kpi.sub}</p> : null}
          </div>
        ))}
      </div>

      <div className="kxd-founder-clients__controls">
        <div className="kxd-founder-clients__search-wrap">
          <label className="kxd-founder-clients__search-label" htmlFor="kxd-portfolio-search">
            Search clients
          </label>
          <input
            id="kxd-portfolio-search"
            type="search"
            className="kxd-founder-clients__search"
            placeholder="Name, slug, website, or contact"
            value={state.query}
            onChange={(e) =>
              updateState({ ...state, query: e.target.value }, { history: "replace" })
            }
            autoComplete="off"
          />
        </div>

        <div
          className="kxd-founder-clients__views"
          role="tablist"
          aria-label="Portfolio views"
        >
          <button
            type="button"
            role="tab"
            className={
              state.view === "all"
                ? "kxd-founder-clients__view kxd-founder-clients__view--active"
                : "kxd-founder-clients__view"
            }
            aria-selected={state.view === "all"}
            onClick={() => updateState({ ...state, view: "all" }, { history: "push" })}
          >
            All clients
          </button>
          <button
            type="button"
            role="tab"
            className={
              state.view === "attention"
                ? "kxd-founder-clients__view kxd-founder-clients__view--active"
                : "kxd-founder-clients__view"
            }
            aria-selected={state.view === "attention"}
            onClick={() =>
              updateState({ ...state, view: "attention" }, { history: "push" })
            }
          >
            Needs attention
            <span className="kxd-founder-clients__view-count">{attentionCount}</span>
          </button>
        </div>
      </div>

      <ClientPortfolioFilters
        state={state}
        tierOptions={tierOptions}
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        onChange={updateState}
      />

      <div className="kxd-founder-clients__toolbar">
        <div className="kxd-founder-clients__toolbar-copy">
          <h2 className="kxd-founder-panel__title">Relationships</h2>
          <p className="kxd-founder-clients__toolbar-lede">{portfolioNote}</p>
          <p className="kxd-founder-clients__result-count">{visibleSummary}</p>
        </div>
        <div className="kxd-founder-clients__actions">
          <Link
            href="/admin/operations/client-launch"
            className="kxd-founder-btn kxd-founder-btn--primary"
          >
            Launch client
          </Link>
          <Link href="/admin/operations/client-import" className="kxd-founder-btn">
            Import client
          </Link>
          <Link href="/admin/operations/events" className="kxd-founder-btn">
            Events
          </Link>
          <Link
            href="/admin/collections/executive-client-profiles"
            className="kxd-founder-clients__quiet-link"
          >
            Edit profiles
          </Link>
        </div>
      </div>

      <ClientPortfolioRoster
        rows={visibleRows}
        duplicateWarnings={duplicateWarnings}
        showAttentionReasons={showAttentionReasons && state.view === "attention"}
        portfolioTotal={allRows.length}
      />
    </div>
  );
}