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

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value || !String(value).trim()) return null;
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
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
          </span>
        </div>
        <h1 className="kxd-lead-summary__title">{title}</h1>
        <p className="kxd-lead-summary__interest">
          {inquiry.programInterest?.trim() ||
            inquiry.messageSummary?.trim() ||
            "No interest or request summary stored for this inquiry."}
        </p>
        <dl className="kxd-lead-summary__grid">
          <div>
            <dt>Source</dt>
            <dd>{formatLeadSource(inquiry)}</dd>
          </div>
          <div>
            <dt>Contact</dt>
            <dd>
              {[inquiry.contactPhone, inquiry.contactEmail].filter(Boolean).join(" · ") ||
                "Not stored"}
            </dd>
          </div>
          <div>
            <dt>Owner</dt>
            <dd>{ownerLabel ?? "Unassigned"}</dd>
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

      <section className="kxd-lead-panel" aria-labelledby="lead-action-title">
        <div className="kxd-lead-panel__head">
          <h2 id="lead-action-title" className="kxd-lead-panel__title">
            Move this lead
          </h2>
          <p className="kxd-lead-panel__note">
            Updates use the existing lead operations fields — no separate CRM.
          </p>
        </div>
        <LeadLifecycleActions inquiry={inquiry} owners={owners} canManage={canManage} />
      </section>

      <details className="kxd-client-disclosure" open>
        <summary>Attribution</summary>
        {hasAttributionFacts(inquiry) ? (
          <dl className="kxd-lead-fact-grid">
            <Fact label="Originating page" value={inquiry.landingPage} />
            <Fact label="Source / medium" value={formatSourceMedium(inquiry)} />
            <Fact label="Campaign" value={inquiry.utmCampaign || inquiry.campaign} />
            <Fact label="UTM content" value={inquiry.utmContent} />
            <Fact label="UTM term" value={inquiry.utmTerm} />
            <Fact label="Keyword" value={inquiry.keyword} />
            <Fact label="Google click ID" value={inquiry.gclid} />
          </dl>
        ) : (
          <p className="kxd-lead-muted kxd-lead-attribution-empty">
            No attribution was captured with this inquiry.
          </p>
        )}
      </details>

      <details className="kxd-client-disclosure">
        <summary>Lead intelligence</summary>
        <dl className="kxd-lead-fact-grid">
          <Fact label="Inquiry ID" value={inquiry.inquiryKey} />
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
          <Fact label="Operational" value={labelizeLeadField(inquiry.operationalStatus)} />
          <Fact label="Disposition" value={labelizeLeadField(inquiry.disposition)} />
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
      </details>

      <section className="kxd-lead-panel" aria-labelledby="lead-history-title">
        <div className="kxd-lead-panel__head">
          <h2 id="lead-history-title" className="kxd-lead-panel__title">
            History
          </h2>
        </div>
        {activity.length === 0 ? (
          <CesEmptyState
            title="No history yet"
            lead="History appears from stored response timestamps and published lead activity when present."
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
