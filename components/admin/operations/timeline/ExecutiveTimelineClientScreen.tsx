import Link from "next/link";
import {
  KxdBadge,
  KxdEmptyState,
  KxdMetric,
  KxdPage,
  KxdSection,
  type KxdBadgeVariant,
} from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { ClientOpsNav } from "@/components/admin/operations/client-command/ClientOpsNav";
import { formatTimelineDate } from "@/lib/executive-timeline/format";
import type { ExecutiveTimelineClientData, ExecutiveTimelineDoc } from "@/lib/executive-timeline/types";

function importanceVariant(importance: string): KxdBadgeVariant {
  switch (importance) {
    case "critical":
      return "critical";
    case "high":
      return "warning";
    case "low":
      return "default";
    default:
      return "status";
  }
}

function TimelineEventRow({ event, showDate = true }: { event: ExecutiveTimelineDoc; showDate?: boolean }) {
  const importance = String(event.importance ?? "normal");
  const category = String(event.category ?? "relationship");

  return (
    <article className="kxd-os-card kxd-os-timeline-event">
      <div className="kxd-os-timeline-event__row">
        <div className="kxd-os-timeline-event__body kxd-os-ops-flex-main--timeline">
          {showDate ? (
            <p className="kxd-os-meta">
              {formatTimelineDate(event.occurredAt as string)} · {String(event.sourceModule ?? "Manual")}
            </p>
          ) : null}
          <p
            className={`kxd-os-card__title kxd-os-timeline-event__title${showDate ? "" : " kxd-os-timeline-event__title--flush"}`}
          >
            {event.pinned ? "Pinned · " : ""}
            {String(event.title)}
          </p>
          {event.summary ? (
            <p className="kxd-os-body kxd-os-timeline-event__summary">
              {String(event.summary)}
            </p>
          ) : null}
          {event.description ? (
            <p className="kxd-os-meta kxd-os-timeline-event__meta">
              {String(event.description)}
            </p>
          ) : null}
          <p className="kxd-os-meta kxd-os-timeline-event__meta">
            {category}
            {event.eventType ? ` · ${String(event.eventType)}` : ""}
            {event.createdBy ? ` · ${String(event.createdBy)}` : ""}
          </p>
        </div>
        <KxdBadge variant={importanceVariant(importance)}>{importance}</KxdBadge>
      </div>
    </article>
  );
}

export function ExecutiveTimelineClientScreen({
  clientId,
  data,
}: {
  clientId: number;
  data: ExecutiveTimelineClientData;
}) {
  const { client, summary, pinnedEvents, milestones, monthGroups, upcomingRelated } = data;
  const clientName = String(client.name ?? "Client");

  return (
    <OperationsShell activeId="timeline" clientId={clientId}>
      <KxdPage className="kxd-os-page--ops">
        <div className="kxd-os-ops-section-head">
          <OperationsPageHero
            eyebrow="Executive Timeline"
            title={clientName}
            lead="The complete relationship record for this partnership — every milestone, decision, and turning point."
            presence
          />
          <Link href="/admin/operations/timeline" className="kxd-os-link-quiet">
            ← All clients
          </Link>
        </div>

        <ClientOpsNav clientId={clientId} active="timeline" />

        <div className="kxd-os-ops-kpi-grid">
          <KxdMetric label="Total events" value={String(summary.totalEvents)} />
          <KxdMetric label="Pinned" value={String(summary.pinnedCount)} />
          <KxdMetric label="Milestones" value={String(summary.milestoneCount)} />
          <KxdMetric
            label="Relationship since"
            value={formatTimelineDate(summary.relationshipStart)}
          />
          <KxdMetric label="Last activity" value={formatTimelineDate(summary.lastEventAt)} />
        </div>

        <div className="kxd-os-operations-split">
          <section className="kxd-os-card kxd-os-ops-card-padding">
            <p className="kxd-os-section__label">Relationship summary</p>
            <p className="kxd-os-body kxd-os-mt-3">
              {summary.totalEvents === 0
                ? "No executive timeline events recorded yet. Events from launches, infrastructure, and onboarding will accumulate here."
                : `${summary.totalEvents} events across the partnership. Most active in ${summary.topCategories[0]?.category ?? "relationship"}.`}
            </p>
            {summary.topCategories.length > 0 ? (
              <div className="kxd-os-timeline-categories">
                {summary.topCategories.map((row) => (
                  <KxdBadge key={row.category} variant="default">
                    {row.category} ({row.count})
                  </KxdBadge>
                ))}
              </div>
            ) : null}
            <p className="kxd-os-meta kxd-os-mt-4">
              <Link href={`/admin/operations/clients/${clientId}`} className="kxd-os-link-quiet">
                Client workspace →
              </Link>
              {" · "}
              <Link
                href={`/admin/collections/executive-timeline-events/create?client=${clientId}`}
                className="kxd-os-link-quiet"
              >
                Add event →
              </Link>
            </p>
          </section>

          <section>
            <KxdSection label="Pinned events" />
            {pinnedEvents.length === 0 ? (
              <p className="kxd-os-meta">No pinned events for this client.</p>
            ) : (
              pinnedEvents.map((event) => (
                <TimelineEventRow key={event.id as number} event={event} showDate={false} />
              ))
            )}
          </section>
        </div>

        <KxdSection label="Major milestones" />
        {milestones.length === 0 ? (
          <p className="kxd-os-meta kxd-os-mb-8">
            High-importance and pinned events will surface here.
          </p>
        ) : (
          <div className="kxd-os-mb-8">
            {milestones.map((event) => (
              <TimelineEventRow key={`milestone-${event.id as number}`} event={event} />
            ))}
          </div>
        )}

        <div className="kxd-os-operations-split kxd-os-operations-split--weighted">
          <section>
            <KxdSection label="Timeline by month" />
            {monthGroups.length === 0 ? (
              <KxdEmptyState
                title="Empty timeline"
                description="This client's relationship history will build as KXD Core modules write executive events."
              />
            ) : (
              monthGroups.map((group) => (
                <div key={group.monthKey} className="kxd-os-timeline-month">
                  <p className="kxd-os-section__label kxd-os-timeline-month__label">
                    {group.monthLabel}
                  </p>
                  {group.events.map((event) => (
                    <TimelineEventRow key={event.id as number} event={event} />
                  ))}
                </div>
              ))
            )}
          </section>

          <section>
            <KxdSection label="Upcoming related" />
            {upcomingRelated.length === 0 ? (
              <p className="kxd-os-meta">No future-dated events on record.</p>
            ) : (
              upcomingRelated.map((event) => (
                <TimelineEventRow key={`upcoming-${event.id as number}`} event={event} />
              ))
            )}

            <KxdSection label="Activity stream" />
            {monthGroups[0]?.events.slice(0, 6).map((event) => (
              <div key={`stream-${event.id as number}`} className="kxd-os-ops-list__row">
                <p className="kxd-os-card__title">{String(event.title)}</p>
                <p className="kxd-os-meta">
                  {formatTimelineDate(event.occurredAt as string)} · {String(event.category)}
                </p>
              </div>
            )) ?? <p className="kxd-os-meta">No recent activity.</p>}
          </section>
        </div>
      </KxdPage>
    </OperationsShell>
  );
}
