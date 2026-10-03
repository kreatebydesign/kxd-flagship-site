import Link from "next/link";
import { CesPage, CesEmptyState, CesTimeline } from "@/components/ces/primitives";
import { formatResponseTime } from "@/lib/managed-client-leads/response-time";
import type { ClientInquiryRecord } from "@/lib/managed-client-leads/types";
import type { LeadActivityItem, LeadOwnerOption } from "@/lib/client-command/leads/types";
import {
  formatLeadRelative,
  formatLeadSource,
  formatLeadWhen,
  labelizeLeadField,
  leadPresentationStageLabel,
  leadStageStatusClass,
  resolveLeadPresentationStage,
} from "@/lib/client-command/leads/presentation";
import { LeadLifecycleActions } from "./LeadLifecycleActions";

function Fact({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string | null | undefined;
  emphasize?: boolean;
}) {
  if (!value || !String(value).trim()) return null;
  return (
    <div className={emphasize ? "kxd-lead-fact kxd-lead-fact--em" : "kxd-lead-fact"}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatSourceMedium(inquiry: ClientInquiryRecord): string | null {
  const source = inquiry.utmSource?.trim();
  const medium = inquiry.utmMedium?.trim();
  if (source && medium) return `${source} / ${medium}`;
  if (source) return source;
  if (medium) return medium;
  const legacy = inquiry.sourceMedium?.trim();
  return legacy || null;
}

function pagePathFromUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    const path = `${url.pathname}${url.search}` || "/";
    return path.length > 64 ? `${path.slice(0, 61)}…` : path;
  } catch {
    return value.length > 64 ? `${value.slice(0, 61)}…` : value;
  }
}

function hasAttributionFacts(inquiry: ClientInquiryRecord): boolean {
  return Boolean(
    inquiry.landingPage?.trim() ||
      inquiry.campaign?.trim() ||
      inquiry.utmCampaign?.trim() ||
      inquiry.utmSource?.trim() ||
      inquiry.utmMedium?.trim() ||
      inquiry.utmContent?.trim() ||
      inquiry.utmTerm?.trim() ||
      inquiry.sourceMedium?.trim() ||
      inquiry.gclid?.trim() ||
      inquiry.keyword?.trim(),
  );
}

function nextActionHint(inquiry: ClientInquiryRecord): string {
  const stage = resolveLeadPresentationStage(inquiry);
  if (stage === "WON") return "Closed — won. Review revenue and program details below.";
  if (stage === "LOST") return "Closed — lost. Reason is recorded for audit.";
  if (!inquiry.assignedPortalOwnerId) return "Assign an owner, then make first contact.";
  if (!inquiry.firstRespondedAt) return "Make first contact and log the response.";
  if (inquiry.nextFollowUpAt) {
    return `Follow up by ${formatLeadWhen(inquiry.nextFollowUpAt)}.`;
  }
  if (stage === "NEW" || stage === "CONTACTED") {
    return "Qualify interest or set the next follow-up.";
  }
  return "Advance the stage or close when ready.";
}

export function LeadDetailScreen({
  clientName,
  inquiry,
  ownerLabel,
  locationLabel,
  owners,
  activity,
  canManage,
}: {
  clientName: string;
  inquiry: ClientInquiryRecord;
  ownerLabel: string | null;
  locationLabel: string | null;
  owners: LeadOwnerOption[];
  activity: LeadActivityItem[];
  canManage: boolean;
}) {
  const title = inquiry.contactName?.trim() || "Lead";
  const stage = resolveLeadPresentationStage(inquiry);
  const interest =
    inquiry.programInterest?.trim() ||
    inquiry.messageSummary?.trim() ||
    "No interest or request summary stored for this inquiry.";
  const originatingPath = pagePathFromUrl(inquiry.landingPage);
  const keyword = inquiry.keyword?.trim() || inquiry.utmTerm?.trim() || null;

  return (
    <CesPage className="kxd-lead-command">
      <p className="kxd-lead-crumb">
        <Link href="/portal/leads" className="kxd-os-link-quiet">
          ← Leads
        </Link>
        <span aria-hidden> · </span>
        <span>{clientName}</span>
      </p>

      <header className="kxd-lead-summary">
        <div className="kxd-lead-summary__top">
          <span className={`kxd-ces-status ${leadStageStatusClass(stage)}`}>
            {leadPresentationStageLabel(stage)}
          </span>
          <span className="kxd-lead-summary__when">
            Received {formatLeadRelative(inquiry.receivedAt)}
            <span className="kxd-lead-summary__when-abs">
              {" "}
              · {formatLeadWhen(inquiry.receivedAt)}
            </span>
          </span>
        </div>
        <h1 className="kxd-lead-summary__title">{title}</h1>
        <p className="kxd-lead-summary__interest">{interest}</p>
        <p className="kxd-lead-summary__next" role="status">
          <span className="kxd-lead-summary__next-label">Next</span>
          {nextActionHint(inquiry)}
        </p>
        <dl className="kxd-lead-summary__grid">
          <div>
            <dt>Source</dt>
            <dd>{formatLeadSource(inquiry)}</dd>
          </div>
          <div>
            <dt>Owner</dt>
            <dd>{ownerLabel ?? "Unassigned"}</dd>
          </div>
          <div>
            <dt>Contact</dt>
            <dd>
              {[inquiry.contactPhone, inquiry.contactEmail].filter(Boolean).join(" · ") ||
                "Not stored"}
            </dd>
          </div>
          {locationLabel ? (
            <div>
              <dt>Location</dt>
              <dd>{locationLabel}</dd>
            </div>
          ) : null}
          {inquiry.nextFollowUpAt ? (
            <div>
              <dt>Next follow-up</dt>
              <dd>{formatLeadWhen(inquiry.nextFollowUpAt)}</dd>
            </div>
          ) : null}
        </dl>
      </header>

      <section className="kxd-lead-panel kxd-lead-panel--actions" aria-labelledby="lead-action-title">
        <div className="kxd-lead-panel__head">
          <h2 id="lead-action-title" className="kxd-lead-panel__title">
            Take action
          </h2>
          <p className="kxd-lead-panel__note">
            Stage, owner, follow-up, and notes — primary workflow first.
          </p>
        </div>
        <LeadLifecycleActions inquiry={inquiry} owners={owners} canManage={canManage} />
      </section>

      <section className="kxd-lead-panel" aria-labelledby="lead-attr-title">
        <div className="kxd-lead-panel__head">
          <h2 id="lead-attr-title" className="kxd-lead-panel__title">
            Attribution
          </h2>
          <p className="kxd-lead-panel__note">How this inquiry arrived.</p>
        </div>
        {hasAttributionFacts(inquiry) ? (
          <dl className="kxd-lead-attr">
            <Fact
              label="Source / medium"
              value={formatSourceMedium(inquiry)}
              emphasize
            />
            <Fact
              label="Campaign"
              value={inquiry.utmCampaign || inquiry.campaign}
              emphasize
            />
            <Fact label="Originating page" value={originatingPath} emphasize />
            <Fact label="Keyword / term" value={keyword} />
            {inquiry.gclid?.trim() ? (
              <Fact label="Google click" value="Paid click attributed (gclid on file)" />
            ) : null}
            {inquiry.landingPage?.trim() && originatingPath !== inquiry.landingPage.trim() ? (
              <div className="kxd-lead-fact kxd-lead-fact--full">
                <dt>Full landing URL</dt>
                <dd>
                  <code className="kxd-lead-url" title={inquiry.landingPage}>
                    {inquiry.landingPage}
                  </code>
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="kxd-lead-muted kxd-lead-attribution-empty">
            No attribution was captured with this inquiry.
          </p>
        )}
      </section>

      <section className="kxd-lead-panel" aria-labelledby="lead-intel-title">
        <div className="kxd-lead-panel__head">
          <h2 id="lead-intel-title" className="kxd-lead-panel__title">
            Lead details
          </h2>
          <p className="kxd-lead-panel__note">What the team needs to act with confidence.</p>
        </div>
        <dl className="kxd-lead-fact-grid">
          <Fact label="Channel" value={labelizeLeadField(inquiry.channel)} />
          <Fact label="Received" value={formatLeadWhen(inquiry.receivedAt)} />
          <Fact label="First response" value={formatLeadWhen(inquiry.firstRespondedAt)} />
          <Fact
            label="Response time"
            value={
              inquiry.responseTimeSeconds != null
                ? formatResponseTime(inquiry.responseTimeSeconds)
                : null
            }
          />
          <Fact label="Status" value={labelizeLeadField(inquiry.operationalStatus)} />
          <Fact label="Qualification" value={labelizeLeadField(inquiry.qualificationState)} />
          <Fact label="Outcome" value={labelizeLeadField(inquiry.outcomeState)} />
          <Fact
            label="Lost reason"
            value={inquiry.lostReason ? labelizeLeadField(inquiry.lostReason) : null}
          />
          <Fact
            label="Won revenue"
            value={
              inquiry.wonRevenueCents != null
                ? `$${(inquiry.wonRevenueCents / 100).toFixed(2)}`
                : null
            }
          />
          <Fact label="Booked program" value={inquiry.bookedProgram} />
        </dl>
        <details className="kxd-lead-audit">
          <summary>Support identifiers</summary>
          <dl className="kxd-lead-fact-grid">
            <Fact label="Inquiry ID" value={inquiry.inquiryKey} />
            <Fact label="Disposition" value={labelizeLeadField(inquiry.disposition)} />
          </dl>
        </details>
      </section>

      <section className="kxd-lead-panel" aria-labelledby="lead-history-title">
        <div className="kxd-lead-panel__head">
          <h2 id="lead-history-title" className="kxd-lead-panel__title">
            Activity
          </h2>
          <p className="kxd-lead-panel__note">The story of this lead — stored events only.</p>
        </div>
        {activity.length === 0 ? (
          <CesEmptyState
            title="No activity yet"
            lead="Activity appears from response timestamps and published lead events when present."
          />
        ) : (
          <CesTimeline
            events={activity.map((item) => ({
              id: item.id,
              label: item.title,
              at: item.occurredAt ?? inquiry.receivedAt,
              detail: item.summary ?? undefined,
            }))}
          />
        )}
      </section>
    </CesPage>
  );
}
