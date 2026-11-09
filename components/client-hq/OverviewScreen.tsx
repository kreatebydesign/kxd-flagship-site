import type { CSSProperties } from "react";
import Link from "next/link";
import { KxdPage } from "@/components/os";
import { WorkspaceFocusStrip } from "@/components/portal/WorkspaceFocusStrip";
import { WorkPerformanceWorkspace } from "@/components/portal/WorkPerformanceWorkspace";
import { ClientHqActivityList, ClientHqQuickActions } from "./shared";
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

  const hasRecentRequests = data.recentRequests.length > 0;

  return (
    <KxdPage className="kxd-os-page--ops kxd-os-page--overview-tight">
      <div className="kxd-ws-personalization" style={identityStyle}>
        <header className="kxd-os-ops-hero kxd-ws-identity kxd-ws-identity--overview">
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
            <p className="kxd-os-meta kxd-ws-perf-footer-link">
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
          hasRecentRequests ? (
            <ClientHqActivityList
              title={personalization.terminology.requests ?? "Recent updates"}
              items={data.recentRequests}
              field="requestTitle"
              href="/portal/requests"
              emptyMessage={emptyRequests}
            />
          ) : null
        ) : (
          <div className="kxd-os-operations-split kxd-os-operations-split--tight">
            <ClientHqActivityList
              title={personalization.terminology.requests ?? "Recent updates"}
              items={data.recentRequests}
              field="requestTitle"
              href="/portal/requests"
              emptyMessage={emptyRequests}
            />
            <ClientHqActivityList
              title={personalization.terminology.deliverables ?? "Work in progress"}
              items={data.recentDeliverables.filter((d) => d.status !== "complete")}
              field="title"
              href="/portal/deliverables"
              emptyMessage={emptyDeliverables}
            />
          </div>
        )}

        {!workPerformance && quickActions.length > 0 ? (
          <section className="kxd-ws-shortcuts" aria-label="Shortcuts">
            <p className="kxd-os-section__label">Shortcuts</p>
            <ClientHqQuickActions actions={quickActions} />
          </section>
        ) : null}

        {!workPerformance && data.nextMeeting ? (
          <section className="kxd-os-card kxd-ws-next-meeting">
            <p className="kxd-os-metric__label">Up next</p>
            <p className="kxd-os-body">
              {data.nextMeeting.title} · {fmtPortalDate(data.nextMeeting.date)}
            </p>
          </section>
        ) : null}
      </div>
    </KxdPage>
  );
}
