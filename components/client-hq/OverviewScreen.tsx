import { KxdPage, KxdSection } from "@/components/os";
import { ClientHqPageHero } from "./ClientHqPageHero";
import {
  ClientHqActivityList,
  ClientHqQuickActions,
  ClientHqTimelineFeed,
} from "./shared";
import type { PortalOverviewData } from "@/lib/portal/types";
import { fmtPortalDate } from "@/lib/portal/format";

export interface OverviewScreenProps {
  displayName: string;
  data: PortalOverviewData;
}

/** Legacy Client HQ overview — softened copy, reduced dashboard density */
export function OverviewScreen({ displayName, data }: OverviewScreenProps) {
  const firstName = displayName.split(" ")[0] ?? displayName;

  return (
    <KxdPage className="kxd-os-page--ops">
      <ClientHqPageHero
        eyebrow="Your workspace"
        title={`Welcome back, ${firstName}`}
        lead="A calm view of what's in progress and what needs you next."
        presence
      />

      <KxdSection label="What to do next">
        <ClientHqQuickActions actions={data.quickActions} />
      </KxdSection>

      <div className="kxd-os-operations-split" style={{ marginTop: "1.5rem" }}>
        <ClientHqActivityList
          title="Recent updates"
          items={data.recentRequests}
          field="requestTitle"
          href="/portal/requests"
          emptyMessage="No recent updates."
        />
        <ClientHqActivityList
          title="In progress"
          items={data.recentDeliverables.filter((d) => d.status !== "complete")}
          field="title"
          href="/portal/deliverables"
          emptyMessage="Nothing in progress right now."
        />
      </div>

      {data.nextMeeting ? (
        <section className="kxd-os-card" style={{ marginTop: "1.5rem" }}>
          <p className="kxd-os-metric__label">Up next</p>
          <p className="kxd-os-body">
            {data.nextMeeting.title} · {fmtPortalDate(data.nextMeeting.date)}
          </p>
        </section>
      ) : null}

      <KxdSection label="Recent activity">
        <div className="kxd-os-card">
          <ClientHqTimelineFeed events={data.timelineActivity.slice(0, 5)} />
        </div>
      </KxdSection>
    </KxdPage>
  );
}
