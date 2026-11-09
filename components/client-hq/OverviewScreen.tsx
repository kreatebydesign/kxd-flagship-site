import type { CSSProperties } from "react";
import Link from "next/link";
import { KxdPage, KxdSection } from "@/components/os";
import { WorkspaceFocusStrip } from "@/components/portal/WorkspaceFocusStrip";
import { WorkPerformanceWorkspace } from "@/components/portal/WorkPerformanceWorkspace";
import {
  ClientHqActivityList,
  ClientHqQuickActions,
  ClientHqTimelineFeed,
} from "./shared";
import { AccountBalanceCard } from "./AccountBalanceCard";
import type { PortalOverviewData } from "@/lib/portal/types";
import type { WorkspacePersonalizationModel } from "@/lib/portal/workspace-personalization";
import { formatWorkspaceWelcomeTitle } from "@/lib/portal/workspace-personalization";
import type { WorkPerformanceModel } from "@/lib/portal/work-performance";
import type { PortalBillingOverviewCardModel } from "@/lib/portal/billing";
import { fmtPortalDate } from "@/lib/portal/format";

export interface OverviewScreenProps {
  displayName: string;
  data: PortalOverviewData;
  personalization: WorkspacePersonalizationModel;
  workPerformance?: WorkPerformanceModel | null;
  billingOverview?: PortalBillingOverviewCardModel | null;
}

/** Client overview — welcome, work summary, and recent activity. */
export function OverviewScreen({
  displayName,
  data,
  personalization,
  workPerformance = null,
  billingOverview = null,
}: OverviewScreenProps) {
  const title = formatWorkspaceWelcomeTitle(personalization, displayName);
  const emptyRequests =
    personalization.emptyStates.requests?.lead ?? "No recent updates.";
  const emptyDeliverables =
    personalization.emptyStates.deliverables?.lead ??
    "Nothing in progress right now.";
  const emptyActivity =
    personalization.emptyStates.overview?.lead ??
    "Relationship history will appear here as milestones are logged.";

  const quickActions =
    personalization.primaryActions.length > 0
      ? personalization.primaryActions.map((a) => ({
          label: a.label,
          href: a.href,
          description: a.description,
        }))
      : data.quickActions;

  const identityStyle: CSSProperties | undefined =
    personalization.identity.accentColor != null
      ? ({
          ["--kxd-ws-accent" as string]: personalization.identity.accentColor,
        } as CSSProperties)
      : undefined;

  return (
    <KxdPage className="kxd-os-page--ops">
      <div className="kxd-ws-personalization" style={identityStyle}>
        <header className="kxd-os-ops-hero kxd-ws-identity">
          <div className="kxd-ws-identity__row">
            {personalization.identity.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={personalization.identity.logoUrl}
                alt={personalization.identity.logoAlt}
                className="kxd-ws-identity__logo"
              />
            ) : (
              <span className="kxd-ws-identity__mark" aria-hidden>
                {personalization.identity.clientName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="kxd-ws-identity__copy">
              <p className="kxd-os-eyebrow">{personalization.welcome.eyebrow}</p>
              <h1 className="kxd-os-headline kxd-os-ops-hero__title kxd-os-headline--presence">
                {title}
              </h1>
              <p className="kxd-os-ops-hero__lead">{personalization.welcome.lead}</p>
            </div>
          </div>
        </header>

        {workPerformance ? (
          <div className="kxd-ws-perf-wrap">
            <WorkPerformanceWorkspace model={workPerformance} />
            <p className="kxd-os-meta" style={{ marginTop: "1rem" }}>
              <Link href="/portal/deliverables" className="kxd-os-link-quiet">
                Open KXD Work for work by month
              </Link>
            </p>
          </div>
        ) : (
          <WorkspaceFocusStrip personalization={personalization} />
        )}

        {billingOverview ? (
          <div className="kxd-os-billing-overview-slot">
            <AccountBalanceCard model={billingOverview} />
          </div>
        ) : null}

        {workPerformance ? (
          <ClientHqActivityList
            title={personalization.terminology.requests ?? "Recent requests"}
            items={data.recentRequests}
            field="requestTitle"
            href="/portal/requests"
            emptyMessage={emptyRequests}
          />
        ) : (
          <div className="kxd-os-operations-split" style={{ marginTop: "1.5rem" }}>
            <ClientHqActivityList
              title={personalization.terminology.requests ?? "Recent requests"}
              items={data.recentRequests}
              field="requestTitle"
              href="/portal/requests"
              emptyMessage={emptyRequests}
            />
            <ClientHqActivityList
              title={personalization.terminology.deliverables ?? "In progress"}
              items={data.recentDeliverables.filter((d) => d.status !== "complete")}
              field="title"
              href="/portal/deliverables"
              emptyMessage={emptyDeliverables}
            />
          </div>
        )}

        <KxdSection label="Shortcuts">
          <ClientHqQuickActions actions={quickActions} />
        </KxdSection>

        {data.nextMeeting ? (
          <section className="kxd-os-card" style={{ marginTop: "1.5rem" }}>
            <p className="kxd-os-metric__label">Up next</p>
            <p className="kxd-os-body">
              {data.nextMeeting.title} · {fmtPortalDate(data.nextMeeting.date)}
            </p>
          </section>
        ) : null}

        <KxdSection label={personalization.terminology.activity ?? "Recent activity"}>
          <div className="kxd-os-card">
            <ClientHqTimelineFeed
              events={data.timelineActivity.slice(0, 5)}
              emptyMessage={emptyActivity}
            />
          </div>
        </KxdSection>
      </div>
    </KxdPage>
  );
}
