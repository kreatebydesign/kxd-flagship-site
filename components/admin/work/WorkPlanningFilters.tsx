"use client";

/**
 * Phase 24A — Collapsible Work filters + sort.
 * Persists via Executive Workspace Memory; syncs URL.
 */

import { useEffect, useState } from "react";
import type {
  WorkDueRange,
  WorkFilterOptions,
  WorkSortId,
  WorkViewFilters,
} from "@/lib/work/planning/client";
import type { WorkPriority, WorkStatus } from "@/lib/work/types";

export function WorkPlanningFilters({
  options,
  filters,
  sort,
  open,
  onOpenChange,
  onChange,
}: {
  options: WorkFilterOptions;
  filters: WorkViewFilters;
  sort: WorkSortId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (next: { filters: WorkViewFilters; sort: WorkSortId }) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function patchFilters(partial: Partial<WorkViewFilters>) {
    onChange({ filters: { ...filters, ...partial }, sort });
  }

  if (!mounted) return null;

  return (
    <div className="kxd-os-work-engine__filters">
      <div className="kxd-os-work-engine__filters-bar">
        <button
          type="button"
          className="kxd-os-work-engine__filters-toggle"
          aria-expanded={open}
          onClick={() => onOpenChange(!open)}
        >
          {open ? "Hide filters" : "Filters"}
        </button>
        <label className="kxd-os-work-engine__filter-inline">
          <span className="kxd-os-work-engine__filter-label">Sort</span>
          <select
            value={sort}
            onChange={(e) =>
              onChange({ filters, sort: e.target.value as WorkSortId })
            }
            className="kxd-os-work-engine__select"
          >
            {options.sorts.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {open ? (
        <div className="kxd-os-work-engine__filters-panel">
          <label className="kxd-os-work-engine__filter-field">
            <span className="kxd-os-work-engine__filter-label">Client</span>
            <select
              value={filters.clientId != null ? String(filters.clientId) : ""}
              onChange={(e) =>
                patchFilters({
                  clientId: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="kxd-os-work-engine__select"
            >
              <option value="">All clients</option>
              {options.clients.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="kxd-os-work-engine__filter-field">
            <span className="kxd-os-work-engine__filter-label">Status</span>
            <select
              value={filters.status ?? ""}
              onChange={(e) =>
                patchFilters({
                  status: e.target.value ? (e.target.value as WorkStatus) : null,
                })
              }
              className="kxd-os-work-engine__select"
            >
              <option value="">Any status</option>
              {options.statuses.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="kxd-os-work-engine__filter-field">
            <span className="kxd-os-work-engine__filter-label">Priority</span>
            <select
              value={filters.priority ?? ""}
              onChange={(e) =>
                patchFilters({
                  priority: e.target.value
                    ? (e.target.value as WorkPriority)
                    : null,
                })
              }
              className="kxd-os-work-engine__select"
            >
              <option value="">Any priority</option>
              {options.priorities.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="kxd-os-work-engine__filter-field">
            <span className="kxd-os-work-engine__filter-label">Assigned</span>
            <select
              value={
                filters.assignedToId != null ? String(filters.assignedToId) : ""
              }
              onChange={(e) =>
                patchFilters({
                  assignedToId: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="kxd-os-work-engine__select"
            >
              <option value="">Anyone</option>
              {options.assignees.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="kxd-os-work-engine__filter-field">
            <span className="kxd-os-work-engine__filter-label">Due</span>
            <select
              value={filters.dueRange ?? "any"}
              onChange={(e) =>
                patchFilters({
                  dueRange: (e.target.value || "any") as WorkDueRange,
                })
              }
              className="kxd-os-work-engine__select"
            >
              {options.dueRanges.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="kxd-os-work-engine__filter-field">
            <span className="kxd-os-work-engine__filter-label">Tag</span>
            <select
              value={filters.tag ?? ""}
              onChange={(e) =>
                patchFilters({ tag: e.target.value || null })
              }
              className="kxd-os-work-engine__select"
            >
              <option value="">Any tag</option>
              {options.tags.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </div>
  );
}
