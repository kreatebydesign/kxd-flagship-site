"use client";

/**
 * Phase 24A — Work Planning & Daily Execution workspace.
 * URL-driven views; client recompose from pool; Workspace Memory for filters.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { KxdShell } from "@/components/os";
import { ExecutiveWorkspaceShell } from "@/components/admin/executive-workspace";
import { WorkComposerHost, WorkComposerTrigger } from "@/components/admin/work/composer";
import { WorkPlanningFilters } from "@/components/admin/work/WorkPlanningFilters";
import { WorkPlanningRow } from "@/components/admin/work/WorkPlanningRow";
import {
  loadWorkspaceMemory,
  patchWorkspaceMemory,
} from "@/lib/executive-workspace/memory";
import type { WorkComposerUserOption } from "@/lib/work/composer";
import {
  composeWorkView,
  WORK_VIEW_IDS,
  WORK_VIEW_LABELS,
  workViewHref,
  type WorkFilterOptions,
  type WorkSortId,
  type WorkViewContextHints,
  type WorkViewFilters,
  type WorkViewId,
  type WorkViewResult,
} from "@/lib/work/planning/client";
import type { WorkListItem } from "@/lib/work/types";

function parseFiltersFromMemory(raw: Record<string, unknown>): WorkViewFilters {
  return {
    clientId:
      typeof raw.clientId === "number"
        ? raw.clientId
        : raw.clientId
          ? Number(raw.clientId)
          : null,
    status: (raw.status as WorkViewFilters["status"]) ?? null,
    priority: (raw.priority as WorkViewFilters["priority"]) ?? null,
    assignedToId:
      typeof raw.assignedToId === "number"
        ? raw.assignedToId
        : raw.assignedToId
          ? Number(raw.assignedToId)
          : null,
    dueRange: (raw.dueRange as WorkViewFilters["dueRange"]) ?? "any",
    tag: typeof raw.tag === "string" ? raw.tag : null,
  };
}

export function WorkPlanningClient({
  initialView,
  initialPool,
  contextHints,
  options,
  greeting,
  dateDisplay,
  currentUser,
}: {
  initialView: WorkViewResult;
  initialPool: WorkListItem[];
  contextHints: WorkViewContextHints;
  options: WorkFilterOptions;
  greeting: string;
  dateDisplay: string;
  currentUser?: WorkComposerUserOption | null;
}) {
  const router = useRouter();
  const [pool, setPool] = useState(initialPool);
  const [viewId, setViewId] = useState<WorkViewId>(initialView.view);
  const [sort, setSort] = useState<WorkSortId>(initialView.sort);
  const [filters, setFilters] = useState<WorkViewFilters>(initialView.filters);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const memory = loadWorkspaceMemory("work");
    const remembered = parseFiltersFromMemory(memory.filters ?? {});
    const rememberedSort =
      typeof memory.selectedTabs?.sort === "string"
        ? (memory.selectedTabs.sort as WorkSortId)
        : null;
    const rememberedOpen = memory.expandedPanels.includes("filters");

    const hasUrlFilters =
      initialView.filters.clientId != null ||
      initialView.filters.status ||
      initialView.filters.priority ||
      initialView.filters.assignedToId != null ||
      (initialView.filters.dueRange && initialView.filters.dueRange !== "any") ||
      initialView.filters.tag;

    if (!hasUrlFilters) {
      setFilters((prev) => ({ ...prev, ...remembered }));
    }
    if (initialView.sort === "recommended" && rememberedSort) {
      setSort(rememberedSort);
    }
    if (rememberedOpen) setFiltersOpen(true);
  }, [initialView.filters, initialView.sort]);

  const view = useMemo(
    () =>
      composeWorkView({
        pool,
        view: viewId,
        sort,
        filters,
        contextHints,
      }),
    [pool, viewId, sort, filters, contextHints],
  );

  const syncUrlAndMemory = useCallback(
    (next: {
      view: WorkViewId;
      sort: WorkSortId;
      filters: WorkViewFilters;
      filtersOpen: boolean;
    }) => {
      router.replace(workViewHref(next.view, next.filters, next.sort), {
        scroll: false,
      });
      patchWorkspaceMemory("work", {
        filters: { ...next.filters },
        selectedTabs: { sort: next.sort, view: next.view },
        expandedPanels: next.filtersOpen ? ["filters"] : [],
      });
    },
    [router],
  );

  const selectView = useCallback(
    (nextView: WorkViewId) => {
      setViewId(nextView);
      syncUrlAndMemory({
        view: nextView,
        sort,
        filters,
        filtersOpen,
      });
    },
    [filters, filtersOpen, sort, syncUrlAndMemory],
  );

  const onFilterChange = useCallback(
    (next: { filters: WorkViewFilters; sort: WorkSortId }) => {
      setFilters(next.filters);
      setSort(next.sort);
      syncUrlAndMemory({
        view: viewId,
        sort: next.sort,
        filters: next.filters,
        filtersOpen,
      });
    },
    [filtersOpen, syncUrlAndMemory, viewId],
  );

  const onWorkChange = useCallback((work: WorkListItem) => {
    setPool((prev) => {
      const exists = prev.some((item) => item.id === work.id);
      if (!exists) return [work, ...prev];
      return prev.map((item) => (item.id === work.id ? work : item));
    });
  }, []);

  const onCreated = useCallback((work: WorkListItem) => {
    setPool((prev) => [work, ...prev.filter((w) => w.id !== work.id)]);
  }, []);

  const statsLine = useMemo(() => {
    const c = view.counts;
    return `${c.today} today · ${c.overdue} overdue · ${c["waiting-on-client"]} waiting on client · ${c["waiting-on-kxd"]} waiting on KXD · ${c.blocked} blocked`;
  }, [view.counts]);

  return (
    <KxdShell className="kxd-os-shell--ritual">
      <ExecutiveWorkspaceShell workspaceId="work" includeWorkComposer={false}>
        <div className="kxd-os-work-engine kxd-os-work-engine--planning">
          <header className="kxd-os-work-engine__header kxd-os-work-engine__header--secondary">
            <nav className="kxd-os-work-engine__nav" aria-label="Work Engine">
              <span className="kxd-os-work-engine__nav-active">Work</span>
              <Link href="/admin/operations/today">Today</Link>
              <Link href="/admin/operations/review-inbox">Review Inbox</Link>
              <Link href="/admin/work/scheduling">Scheduling</Link>
            </nav>
            <Link href="/admin/operations/intelligence" className="kxd-os-work-engine__exit">
              Full workspace
            </Link>
          </header>

          <main className="kxd-os-work-engine__main kxd-os-work-engine__main--planning">
            <header className="kxd-os-work-engine__hero">
              <p className="kxd-os-work-engine__eyebrow">Work Engine</p>
              <h1 className="kxd-os-work-engine__headline">{greeting}</h1>
              <p className="kxd-os-work-engine__lede">
                {dateDisplay}. Plan the day. Move what matters. Leave the rest.
              </p>
              <p className="kxd-os-work-engine__stats">{statsLine}</p>
            </header>

            <nav className="kxd-os-work-engine__views" aria-label="Work views">
              {WORK_VIEW_IDS.map((id) => {
                const count = view.counts[id];
                const active = viewId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={
                      active
                        ? "kxd-os-work-engine__view kxd-os-work-engine__view--active"
                        : "kxd-os-work-engine__view"
                    }
                    aria-current={active ? "page" : undefined}
                    onClick={() => selectView(id)}
                  >
                    <span>{WORK_VIEW_LABELS[id]}</span>
                    <span className="kxd-os-work-engine__view-count">{count}</span>
                  </button>
                );
              })}
            </nav>

            <WorkPlanningFilters
              options={options}
              filters={filters}
              sort={sort}
              open={filtersOpen}
              onOpenChange={(open) => {
                setFiltersOpen(open);
                syncUrlAndMemory({
                  view: viewId,
                  sort,
                  filters,
                  filtersOpen: open,
                });
              }}
              onChange={onFilterChange}
            />

            {view.view === "today" && view.groups ? (
              view.groups.length === 0 ? (
                <p className="kxd-os-work-engine__empty">{view.emptyMessage}</p>
              ) : (
                view.groups.map((group) => (
                  <section
                    key={group.id}
                    className="kxd-os-work-engine__section"
                    aria-labelledby={`work-group-${group.id}`}
                  >
                    <h2
                      id={`work-group-${group.id}`}
                      className="kxd-os-work-engine__section-title"
                    >
                      {group.label}
                    </h2>
                    <ul className="kxd-os-work-engine__list">
                      {group.items.map((item) => (
                        <WorkPlanningRow
                          key={item.id}
                          item={item}
                          onWorkChange={onWorkChange}
                        />
                      ))}
                    </ul>
                  </section>
                ))
              )
            ) : view.items.length === 0 ? (
              <p className="kxd-os-work-engine__empty">{view.emptyMessage}</p>
            ) : (
              <section className="kxd-os-work-engine__section">
                <h2 className="kxd-os-work-engine__section-title">
                  {WORK_VIEW_LABELS[view.view]}
                </h2>
                <ul className="kxd-os-work-engine__list">
                  {view.items.map((item) => (
                    <WorkPlanningRow
                      key={item.id}
                      item={item}
                      onWorkChange={onWorkChange}
                    />
                  ))}
                </ul>
              </section>
            )}

            <p className="kxd-os-work-engine__footnote">
              <WorkComposerTrigger />
              {" · "}
              <Link href={workViewHref(viewId, filters, sort)}>Refresh</Link>
            </p>
          </main>
        </div>

        <WorkComposerHost
          currentUser={currentUser}
          onCreated={onCreated}
          onUpdated={onWorkChange}
        />
      </ExecutiveWorkspaceShell>
    </KxdShell>
  );
}
