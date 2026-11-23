import Link from "next/link";
import { CesPage, CesHero, CesEmptyState } from "@/components/ces/primitives";
import type {
  LeadListFilters,
  LeadListItem,
  LeadListView,
  LeadOwnerOption,
} from "@/lib/client-command/leads/types";
import {
  formatLeadRelative,
  formatLeadSource,
  leadPresentationStageLabel,
  leadStageStatusClass,
} from "@/lib/client-command/leads/presentation";
import { leadAttentionLabel } from "@/lib/client-command/leads/attention";
import { SELECTABLE_LEAD_STAGES } from "@/lib/client-command/leads/apply-stage";
import {
  formatLeadRegistrationPaymentLabel,
  leadHasRegistrationPayment,
  registrationPaymentStatusClass,
} from "@/lib/client-command/leads/registration-presentation";

const INBOX_VIEW_TABS: { id: LeadListView; label: string }[] = [
  { id: "all", label: "All" },
  { id: "leads", label: "Inquiries" },
  { id: "registrations", label: "Registrations" },
];

function inboxHero(filters: LeadListFilters): { title: string; lead: string } {
  const view = filters.leadView ?? "all";
  if (view === "registrations") {
    return {
      title: "Registrations",
      lead: "Paid registrations with verified checkout metadata — same detail view, scoped to program enrollment.",
    };
  }
  if (view === "leads") {
    return {
      title: "Inquiries",
      lead: "Form and contact interest without a paid registration on file.",
    };
  }
  return {
    title: "Leads",
    lead: "Every inquiry in one calm inbox — scan who arrived, what they need, and what's waiting on you.",
  };
}

function buildViewHref(view: LeadListView, filters: LeadListFilters): string {
  const params = new URLSearchParams();
  if (view !== "all") params.set("view", view);
  if (filters.q) params.set("q", filters.q);
  if (filters.stage && filters.stage !== "all") params.set("stage", filters.stage);
  if (filters.ownerPortalUserId != null && filters.ownerPortalUserId !== "all") {
    params.set("owner", String(filters.ownerPortalUserId));
  }
  if (filters.needsAttention) params.set("attention", "1");
  const qs = params.toString();
  return qs ? `/portal/leads?${qs}` : "/portal/leads";
}

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
  const hero = inboxHero(filters);
  const activeView = filters.leadView ?? "all";

  return (
    <CesPage className="kxd-lead-command">
      <CesHero eyebrow={clientName} title={hero.title} lead={hero.lead} />

      <nav className="kxd-lead-view-tabs" aria-label="Inbox view">
        {INBOX_VIEW_TABS.map((tab) => (
          <Link
            key={tab.id}
            href={buildViewHref(tab.id, filters)}
            className={`kxd-lead-view-tabs__tab${activeView === tab.id ? " is-active" : ""}`}
            aria-current={activeView === tab.id ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="kxd-lead-summary-row">
        <span className="kxd-lead-summary-row__count">
          {totalBeforeFilter === 0
            ? "No leads received yet"
            : `${items.length} shown · ${totalBeforeFilter} total`}
        </span>
      </div>

      <form className="kxd-lead-filters" method="get">
        <input type="hidden" name="view" value={activeView} />
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
                      {leadHasRegistrationPayment(item.inquiry) && item.inquiry.paymentStatus ? (
                        <span
                          className={`kxd-lead-pay kxd-lead-pay--compact kxd-ces-status ${registrationPaymentStatusClass(item.inquiry.paymentStatus)}`}
                        >
                          {formatLeadRegistrationPaymentLabel(item.inquiry)}
                        </span>
                      ) : null}
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
