"use client";

import Link from "next/link";
import { KxdPage, KxdSection } from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsKpiStrip,
  OpsListRow,
  OpsSectionHead,
} from "@/components/admin/operations/shared/OpsBriefing";
import type {
  ClientSuccessDashboardData,
  ClientSuccessListItem,
  CheckInListItem,
} from "@/lib/client-success/types";

function ClientRows({
  items,
  empty,
}: {
  items: ClientSuccessListItem[];
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="kxd-os-meta">{empty}</p>;
  }
  return (
    <div className="kxd-os-list-stack">
      {items.map((item) => (
        <OpsListRow key={item.clientId} href={item.href}>
          <p className="kxd-os-body">{item.clientName}</p>
          <p className="kxd-os-meta">
            Health {item.healthScore}
            {item.daysUntilReview != null ? ` · Review in ${item.daysUntilReview}d` : ""}
            {item.daysUntilRenewal != null ? ` · Renewal in ${item.daysUntilRenewal}d` : ""}
            {item.daysSinceMeeting != null ? ` · Last meeting ${item.daysSinceMeeting}d ago` : ""}
          </p>
        </OpsListRow>
      ))}
    </div>
  );
}

function WinRows({ items }: { items: CheckInListItem[] }) {
  if (items.length === 0) {
    return <p className="kxd-os-meta">No recent wins logged.</p>;
  }
  return (
    <div className="kxd-os-list-stack">
      {items.map((win) => (
        <OpsListRow key={win.id} href={win.href}>
          <p className="kxd-os-body">{win.clientName}</p>
          <p className="kxd-os-meta">{win.wins ?? win.summary}</p>
        </OpsListRow>
      ))}
    </div>
  );
}

export function ClientSuccessScreen({ data }: { data: ClientSuccessDashboardData }) {
  return (
    <OperationsShell activeId="client-success">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Client Success"
          title="Client Success Engine"
          lead="Proactive relationship strategy — retain clients longer, spot expansion, and prevent relationships from going cold."
        />

        <OpsKpiStrip
          items={[
            { label: "Active Clients", value: String(data.stats.activeClients) },
            { label: "Success Plans", value: String(data.stats.plansCount) },
            {
              label: "Reviews Due",
              value: String(data.stats.reviewsDue),
              alert: data.stats.reviewsDue > 0,
            },
            {
              label: "Stale Meetings",
              value: String(data.stats.staleMeetingCount),
              alert: data.stats.staleMeetingCount > 0,
            },
            { label: "Check-ins (month)", value: String(data.stats.checkInsThisMonth) },
          ]}
        />

        <div className="kxd-os-operations-columns">
          <KxdSection label="Clients Needing Attention" className="kxd-os-operations-section">
            <OpsSectionHead label="At-risk & needs attention" count={data.needingAttention.length} />
            <ClientRows items={data.needingAttention} empty="No clients flagged for attention." />
          </KxdSection>

          <KxdSection label="Upcoming Quarterly Reviews" className="kxd-os-operations-section">
            <OpsSectionHead label="Next 30 days" count={data.upcomingReviews.length} />
            <ClientRows items={data.upcomingReviews} empty="No quarterly reviews due soon." />
          </KxdSection>
        </div>

        <div className="kxd-os-operations-columns">
          <KxdSection label="Renewals" className="kxd-os-operations-section">
            <OpsSectionHead label="Next 60 days" count={data.renewals.length} />
            <ClientRows items={data.renewals} empty="No renewals in the window." />
          </KxdSection>

          <KxdSection label="No Meeting in 30 Days" className="kxd-os-operations-section">
            <OpsSectionHead label="Relationship cooling" count={data.staleMeetings.length} />
            <ClientRows items={data.staleMeetings} empty="All active clients have recent check-ins." />
          </KxdSection>
        </div>

        <div className="kxd-os-operations-columns">
          <KxdSection label="Declining Health" className="kxd-os-operations-section">
            <OpsSectionHead label="Momentum risk" count={data.decliningHealth.length} />
            <ClientRows items={data.decliningHealth} empty="No declining health signals." />
          </KxdSection>

          <KxdSection label="Expansion Opportunities" className="kxd-os-operations-section">
            <OpsSectionHead label="Upsell & growth" count={data.expansionOpportunities.length} />
            <ClientRows items={data.expansionOpportunities} empty="No expansion opportunities documented." />
          </KxdSection>
        </div>

        <div className="kxd-os-operations-columns">
          <KxdSection label="Satisfied Clients" className="kxd-os-operations-section">
            <OpsSectionHead label="High satisfaction" count={data.satisfiedClients.length} />
            <ClientRows items={data.satisfiedClients} empty="No high-satisfaction signals yet." />
          </KxdSection>

          <KxdSection label="Newest Wins" className="kxd-os-operations-section">
            <OpsSectionHead label="Recent success moments" count={data.newestWins.length} />
            <WinRows items={data.newestWins} />
          </KxdSection>
        </div>

        <p className="kxd-os-meta" style={{ marginTop: "1rem" }}>
          Edit plans in{" "}
          <Link href="/admin/collections/client-success-plans" className="kxd-os-link-quiet">
            Payload → Client Success Plans
          </Link>
        </p>
      </KxdPage>
    </OperationsShell>
  );
}
