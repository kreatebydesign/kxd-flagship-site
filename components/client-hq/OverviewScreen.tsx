import { KxdBadge, KxdPage, KxdSection } from "@/components/os";
import { ClientHqPageHero } from "./ClientHqPageHero";
import {
  ClientHqActivityList,
  ClientHqMetricStrip,
  ClientHqQuickActions,
  ClientHqTimelineFeed,
  formatCurrency,
} from "./shared";
import type { PortalOverviewData } from "@/lib/portal/types";
import { fmtPortalDate } from "@/lib/portal/format";

export interface OverviewScreenProps {
  displayName: string;
  data: PortalOverviewData;
}

export function OverviewScreen({ displayName, data }: OverviewScreenProps) {
  return (
    <KxdPage className="kxd-os-page--ops">
      <ClientHqPageHero
        eyebrow="Client HQ"
        title={`Welcome back, ${displayName}`}
        lead="Your operating headquarters — calm, current, and built for the work ahead."
        presence
      />

      <section className="kxd-os-card" style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
          {data.logoUrl ? (
            <div
              style={{
                width: "4rem",
                height: "4rem",
                borderRadius: "0.75rem",
                overflow: "hidden",
                background: "var(--kxd-os-bg-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.logoUrl}
                alt={`${data.companyName} logo`}
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              />
            </div>
          ) : null}
          <div style={{ flex: 1, minWidth: "14rem" }}>
            <h2 className="kxd-os-headline">{data.companyName}</h2>
            <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
              {data.plan ? `${data.plan} plan` : "Client engagement"} · Since{" "}
              {fmtPortalDate(data.relationshipStart)}
            </p>
          </div>
          {data.healthScore != null ? (
            <div style={{ textAlign: "right" }}>
              <p className="kxd-os-metric__label">Client health</p>
              <p className="kxd-os-metric__value">{data.healthScore}</p>
              {data.healthLabel ? (
                <KxdBadge variant="health">{data.healthLabel}</KxdBadge>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <ClientHqMetricStrip
        metrics={[
          {
            label: "Monthly investment",
            value: formatCurrency(data.monthlyInvestment),
            sub: data.plan ?? undefined,
          },
          {
            label: "Open requests",
            value: String(data.openRequests),
          },
          {
            label: "Deliverables due",
            value: String(data.deliverablesDue),
          },
          {
            label: "Active projects",
            value: String(data.activeProjects),
          },
        ]}
      />

      <div
        className="kxd-os-operations-split"
        style={{ marginTop: "2rem", marginBottom: "2rem" }}
      >
        <KxdSection label="Account">
          <div className="kxd-os-card">
            <p className="kxd-os-metric__label">Account manager</p>
            <p className="kxd-os-card__title">{data.accountManager}</p>
            <p className="kxd-os-meta">{data.accountManagerEmail}</p>
            <p className="kxd-os-metric__label" style={{ marginTop: "1.25rem" }}>
              Next meeting
            </p>
            <p className="kxd-os-body">
              {data.nextMeeting
                ? `${data.nextMeeting.title} · ${fmtPortalDate(data.nextMeeting.date)}`
                : "No upcoming meetings scheduled"}
            </p>
            <p className="kxd-os-metric__label" style={{ marginTop: "1.25rem" }}>
              Current phase
            </p>
            <p className="kxd-os-body" style={{ textTransform: "capitalize" }}>
              {data.currentPhase ?? "—"}
            </p>
          </div>
        </KxdSection>

        <KxdSection label="Primary goals">
          <div className="kxd-os-card">
            <p className="kxd-os-body">
              {data.primaryGoals ??
                "Your primary goals will appear here once onboarding is complete."}
            </p>
          </div>
        </KxdSection>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <KxdSection label="Quick actions">
          <ClientHqQuickActions actions={data.quickActions} />
        </KxdSection>
      </div>

      <div className="kxd-os-operations-split" style={{ marginBottom: "2rem" }}>
        <ClientHqActivityList
          title="Open requests"
          items={data.recentRequests}
          field="requestTitle"
          href="/portal/requests"
          emptyMessage="No open requests."
        />
        <ClientHqActivityList
          title="Deliverables due"
          items={data.recentDeliverables.filter((d) => d.status !== "complete")}
          field="title"
          href="/portal/deliverables"
          emptyMessage="No deliverables due right now."
        />
      </div>

      <div className="kxd-os-operations-split" style={{ marginBottom: "2rem" }}>
        <ClientHqActivityList
          title="Recent completed work"
          items={data.recentCompleted}
          field="title"
          href="/portal/deliverables"
          emptyMessage="Completed work will appear here."
        />
        <KxdSection label="Latest timeline activity">
          <div className="kxd-os-card">
            <ClientHqTimelineFeed events={data.timelineActivity} />
          </div>
        </KxdSection>
      </div>
    </KxdPage>
  );
}
