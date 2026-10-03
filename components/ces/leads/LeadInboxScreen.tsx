import Link from "next/link";
import { CesPage, CesHero, CesEmptyState } from "@/components/ces/primitives";
import type { LeadListFilters, LeadListItem, LeadOwnerOption } from "@/lib/client-command/leads/types";
import {
  formatLeadRelative,
  formatLeadSource,
  leadPresentationStageLabel,
  leadStageStatusClass,
} from "@/lib/client-command/leads/presentation";
import { leadAttentionLabel } from "@/lib/client-command/leads/attention";
import { SELECTABLE_LEAD_STAGES } from "@/lib/client-command/leads/apply-stage";

export function LeadInboxScreen({
  clientName,
  items,
  totalBeforeFilter,
  filters,
  owners,
  errorMessage,
}: {
  clientName: string;
  items: LeadListItem[];
  totalBeforeFilter: number;
  filters: LeadListFilters;
  owners: LeadOwnerOption[];
  errorMessage?: string | null;
}) {
  return (
    <CesPage className="kxd-lead-command">
      <CesHero
        eyebrow={clientName}
        title="Leads"
        lead="Every inquiry in one calm inbox — scan who arrived, what they need, and what's waiting on you."
      />

      <div className="kxd-lead-summary-row">
        <span className="kxd-lead-summary-row__count">
          {totalBeforeFilter === 0
            ? "No leads received yet"
            : `${items.length} shown · ${totalBeforeFilter} total`}
        </span>
      </div>

      <form className="kxd-lead-filters" method="get">
        <div className="kxd-lead-filters__field kxd-lead-filters__field--grow">
          <label className="kxd-lead-filters__label" htmlFor="lead-q">
            Search
          </label>
          <input
            id="lead-q"
            className="kxd-lead-filters__input"
            type="search"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Name, email, phone, program…"
          />
        </div>
        <div className="kxd-lead-filters__field">
          <label className="kxd-lead-filters__label" htmlFor="lead-stage">
            Stage
          </label>
          <select
            id="lead-stage"
            className="kxd-lead-filters__select"
            name="stage"
            defaultValue={filters.stage ?? "all"}
          >
            <option value="all">All</option>
            {SELECTABLE_LEAD_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {leadPresentationStageLabel(stage)}
              </option>
            ))}
          </select>
        </div>
        <div className="kxd-lead-filters__field">
          <label className="kxd-lead-filters__label" htmlFor="lead-owner">
            Owner
          </label>
          <select
            id="lead-owner"
            className="kxd-lead-filters__select"
            name="owner"
            defaultValue={
              filters.ownerPortalUserId != null ? String(filters.ownerPortalUserId) : "all"
            }
          >
            <option value="all">All</option>
            <option value="unassigned">Unassigned</option>
            {owners.map((owner) => (
              <option key={owner.portalUserId} value={owner.portalUserId}>
                {owner.label}
              </option>
            ))}
          </select>
        </div>
        <label className="kxd-lead-filters__pill">
          <input
            type="checkbox"
            name="attention"
            value="1"
            defaultChecked={Boolean(filters.needsAttention)}
          />
          Needs attention
        </label>
        <button type="submit" className="kxd-ces-btn kxd-ces-btn--ghost">
          Apply
        </button>
      </form>

      {errorMessage ? (
        <CesEmptyState title="Leads could not load" lead={errorMessage} />
      ) : items.length === 0 ? (
        <CesEmptyState
          title={totalBeforeFilter === 0 ? "Waiting for the first inquiry" : "No matches"}
          lead={
            totalBeforeFilter === 0
              ? "When someone reaches out, they will appear here — newest first."
              : "Try clearing a filter or searching a different detail."
          }
        />
      ) : (
        <ul className="kxd-lead-list">
          {items.map((item) => {
            const hasAttention = item.attention !== "NONE";
            return (
              <li key={item.inquiry.id}>
                <Link
                  href={item.href}
                  className={`kxd-lead-row${hasAttention ? " kxd-lead-row--attention" : ""}`}
                >
                  <div className="kxd-lead-row__main">
                    <div className="kxd-lead-row__topline">
                      <span className={`kxd-ces-status ${leadStageStatusClass(item.stage)}`}>
                        {leadPresentationStageLabel(item.stage)}
                      </span>
                      <span className="kxd-lead-row__when">
                        {formatLeadRelative(item.inquiry.receivedAt)}
                      </span>
                    </div>
                    <p className="kxd-lead-row__name">
                      {item.inquiry.contactName?.trim() || "Unnamed contact"}
                    </p>
                    {item.inquiry.programInterest || item.inquiry.messageSummary ? (
                      <p className="kxd-lead-row__interest">
                        {item.inquiry.programInterest?.trim() ||
                          item.inquiry.messageSummary?.trim()}
                      </p>
                    ) : null}
                    <p className="kxd-lead-row__context">
                      {[
                        formatLeadSource(item.inquiry),
                        item.locationLabel,
                        item.ownerLabel ? `Owner · ${item.ownerLabel}` : "Unassigned",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="kxd-lead-row__side">
                    {hasAttention ? (
                      <span className="kxd-lead-row__attention-flag">
                        {leadAttentionLabel(item.attention)}
                      </span>
                    ) : null}
                    <span className="kxd-lead-row__open" aria-hidden>
                      Open →
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </CesPage>
  );
}
