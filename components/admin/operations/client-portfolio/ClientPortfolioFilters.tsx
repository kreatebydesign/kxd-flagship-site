"use client";

import type { PortfolioFilterState } from "@/lib/client-portfolio/types";

export interface TierOption {
  value: string;
  label: string;
}

export function ClientPortfolioFilters({
  state,
  tierOptions,
  open,
  onOpenChange,
  onChange,
}: {
  state: PortfolioFilterState;
  tierOptions: TierOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (next: PortfolioFilterState) => void;
}) {
  function patch(partial: Partial<PortfolioFilterState>) {
    onChange({ ...state, ...partial });
  }

  return (
    <div className="kxd-founder-clients__filters">
      <div className="kxd-founder-clients__filters-bar">
        <button
          type="button"
          className="kxd-founder-clients__filters-toggle"
          aria-expanded={open}
          onClick={() => onOpenChange(!open)}
        >
          {open ? "Hide filters" : "Filters"}
        </button>
        <label className="kxd-founder-clients__filter-inline">
          <span className="kxd-founder-clients__filter-label">Sort</span>
          <select
            className="kxd-founder-clients__select"
            value={state.sort}
            onChange={(e) =>
              patch({ sort: e.target.value as PortfolioFilterState["sort"] })
            }
          >
            <option value="priority">Priority</option>
            <option value="name">Name</option>
            <option value="revenue">Monthly revenue</option>
            <option value="next-due">Next action due</option>
          </select>
        </label>
      </div>

      {open ? (
        <div className="kxd-founder-clients__filters-panel">
          <label className="kxd-founder-clients__filter-field">
            <span className="kxd-founder-clients__filter-label">Engagement status</span>
            <select
              className="kxd-founder-clients__select"
              value={state.engagementStatus}
              onChange={(e) =>
                patch({
                  engagementStatus: e.target
                    .value as PortfolioFilterState["engagementStatus"],
                })
              }
            >
              <option value="">Any</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
              <option value="prospect">Prospect</option>
            </select>
          </label>

          <label className="kxd-founder-clients__filter-field">
            <span className="kxd-founder-clients__filter-label">Executive relationship</span>
            <select
              className="kxd-founder-clients__select"
              value={state.executiveRelationship}
              onChange={(e) =>
                patch({
                  executiveRelationship: e.target
                    .value as PortfolioFilterState["executiveRelationship"],
                })
              }
            >
              <option value="">Any</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="at-risk">At risk</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <label className="kxd-founder-clients__filter-field">
            <span className="kxd-founder-clients__filter-label">Internal priority</span>
            <select
              className="kxd-founder-clients__select"
              value={state.internalPriority}
              onChange={(e) =>
                patch({
                  internalPriority: e.target
                    .value as PortfolioFilterState["internalPriority"],
                })
              }
            >
              <option value="">Any</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>

          <label className="kxd-founder-clients__filter-field">
            <span className="kxd-founder-clients__filter-label">Tier</span>
            <select
              className="kxd-founder-clients__select"
              value={state.tier}
              onChange={(e) => patch({ tier: e.target.value })}
            >
              <option value="">Any</option>
              {tierOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="kxd-founder-clients__filter-field">
            <span className="kxd-founder-clients__filter-label">Executive profile</span>
            <select
              className="kxd-founder-clients__select"
              value={state.profileCoverage}
              onChange={(e) =>
                patch({
                  profileCoverage: e.target
                    .value as PortfolioFilterState["profileCoverage"],
                })
              }
            >
              <option value="any">Any</option>
              <option value="with-profile">Profile on file</option>
              <option value="without-profile">Profile pending</option>
            </select>
          </label>

          <button
            type="button"
            className="kxd-founder-clients__clear-filters"
            onClick={() =>
              onChange({
                ...state,
                query: "",
                engagementStatus: "",
                executiveRelationship: "",
                internalPriority: "",
                tier: "",
                profileCoverage: "any",
              })
            }
          >
            Clear filters
          </button>
        </div>
      ) : null}
    </div>
  );
}