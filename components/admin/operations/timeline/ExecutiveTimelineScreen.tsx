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
import { formatTimelineDate } from "@/lib/executive-timeline/format";
import type {
  ExecutiveTimelineCategory,
  ExecutiveTimelineDashboardData,
  ExecutiveTimelineDoc,
  ExecutiveTimelineImportance,
} from "@/lib/executive-timeline/types";

const CATEGORIES: Array<{ id: ExecutiveTimelineCategory | "all"; label: string }> = [
  { id: "all", label: "All categories" },
  { id: "relationship", label: "Relationship" },
  { id: "project", label: "Project" },
  { id: "creative", label: "Creative" },
  { id: "infrastructure", label: "Infrastructure" },
  { id: "website", label: "Website" },
  { id: "seo", label: "SEO" },
  { id: "onboarding", label: "Onboarding" },
  { id: "launch", label: "Launch" },
  { id: "meeting", label: "Meeting" },
  { id: "finance", label: "Finance" },
  { id: "system", label: "System" },
];

const IMPORTANCE: Array<{ id: ExecutiveTimelineImportance | "all"; label: string }> = [
  { id: "all", label: "All importance" },
  { id: "critical", label: "Critical" },
  { id: "high", label: "High" },
  { id: "normal", label: "Normal" },
  { id: "low", label: "Low" },
];

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

function buildFilterHref(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && value !== "all") q.set(key, value);
  }
  const qs = q.toString();
  return qs ? `/admin/operations/timeline?${qs}` : "/admin/operations/timeline";
}

function TimelineEventCard({ event }: { event: ExecutiveTimelineDoc }) {
  const clientId = event.clientId as number | undefined;
  const clientName = String(event.clientName ?? "Client");
  const importance = String(event.importance ?? "normal");
  const category = String(event.category ?? "relationship");

  return (
    <article className="kxd-os-card kxd-os-timeline-event">
      <div className="kxd-os-timeline-event__row">
        <div className="kxd-os-timeline-event__body">
          <p className="kxd-os-meta">
            {formatTimelineDate(event.occurredAt as string)} · {String(event.sourceModule ?? "Manual")}
            {event.pinned ? " · Pinned" : ""}
          </p>
          <p className="kxd-os-card__title kxd-os-timeline-event__title">
            {String(event.title)}
          </p>
          {event.summary ? (
            <p className="kxd-os-body kxd-os-timeline-event__summary">
              {String(event.summary)}
            </p>
          ) : null}
          <p className="kxd-os-meta kxd-os-timeline-event__meta">
            {clientId ? (
              <Link href={`/admin/operations/timeline/${clientId}`} className="kxd-os-link-quiet">
                {clientName}
              </Link>
            ) : (
              clientName
            )}
            {" · "}
            {category}
            {event.eventType ? ` · ${String(event.eventType)}` : ""}
          </p>
        </div>
        <div className="kxd-os-timeline-event__badges">
          <KxdBadge variant={importanceVariant(importance)}>{importance}</KxdBadge>
          <KxdBadge variant="default">{category}</KxdBadge>
        </div>
      </div>
    </article>
  );
}

export interface ExecutiveTimelineScreenProps {
  data: ExecutiveTimelineDashboardData;
  categoryFilter?: ExecutiveTimelineCategory | "all";
  importanceFilter?: ExecutiveTimelineImportance | "all";
  clientFilter?: number;
  searchQuery?: string;
  pinnedOnly?: boolean;
}

export function ExecutiveTimelineScreen({
  data,
  categoryFilter = "all",
  importanceFilter = "all",
  clientFilter,
  searchQuery = "",
  pinnedOnly = false,
}: ExecutiveTimelineScreenProps) {
  const filterBase = {
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    importance: importanceFilter !== "all" ? importanceFilter : undefined,
    client: clientFilter ? String(clientFilter) : undefined,
    q: searchQuery || undefined,
    pinned: pinnedOnly ? "1" : undefined,
  };

  const kpis = [
    { label: "Recent events", value: String(data.recentEvents.length) },
    { label: "Pinned", value: String(data.pinnedEvents.length) },
    { label: "Active clients", value: String(data.clients.length) },
  ];

  return (
    <OperationsShell activeId="timeline">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Executive Timeline"
          title="Relationship History"
          lead="Permanent record of every meaningful moment in the partnership — launches, milestones, and decisions that shaped the relationship."
        />

        <div className="kxd-os-ops-kpi-grid">
          {kpis.map((kpi) => (
            <KxdMetric key={kpi.label} label={kpi.label} value={kpi.value} />
          ))}
        </div>

        <KxdSection label="Filters" />
        <form method="get" action="/admin/operations/timeline" className="kxd-os-filter-bar">
          <select
            name="client"
            defaultValue={clientFilter ? String(clientFilter) : ""}
            className="kxd-os-input kxd-os-filter-bar__input kxd-os-filter-bar__input--client"
          >
            <option value="">All clients</option>
            {data.clients.map((c) => (
              <option key={c.id as number} value={String(c.id)}>
                {String(c.name)}
              </option>
            ))}
          </select>
          <select
            name="category"
            defaultValue={categoryFilter}
            className="kxd-os-input kxd-os-filter-bar__input"
          >
            {CATEGORIES.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            name="importance"
            defaultValue={importanceFilter}
            className="kxd-os-input kxd-os-filter-bar__input"
          >
            {IMPORTANCE.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            type="search"
            name="q"
            defaultValue={searchQuery}
            placeholder="Search events…"
            className="kxd-os-input kxd-os-filter-bar__input kxd-os-filter-bar__input--search"
          />
          <label className="kxd-os-meta kxd-os-filter-bar__check">
            <input type="checkbox" name="pinned" value="1" defaultChecked={pinnedOnly} />
            Pinned only
          </label>
          <button type="submit" className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm">
            Apply
          </button>
          <Link href="/admin/operations/timeline" className="kxd-os-link-quiet">
            Clear
          </Link>
        </form>

        <div className="kxd-os-operations-split">
          <section>
            <KxdSection label="Pinned events" />
            {data.pinnedEvents.length === 0 ? (
              <p className="kxd-os-meta">No pinned events match these filters.</p>
            ) : (
              data.pinnedEvents.map((event) => (
                <TimelineEventCard key={event.id as number} event={event} />
              ))
            )}
          </section>

          <section>
            <KxdSection label="Quick filters" />
            <div className="kxd-os-filter-pills">
              {CATEGORIES.slice(1, 8).map((opt) => (
                <Link
                  key={opt.id}
                  href={buildFilterHref({ ...filterBase, category: opt.id })}
                  className={`kxd-os-filter-pill${categoryFilter === opt.id ? " kxd-os-filter-pill--active" : ""}`}
                >
                  {opt.label}
                </Link>
              ))}
              <Link href="/admin/collections/executive-timeline-events" className="kxd-os-link-quiet">
                Payload →
              </Link>
            </div>
          </section>
        </div>

        <div className="kxd-os-ops-section-head kxd-os-mt-page">
          <KxdSection label="Recent executive activity" />
        </div>

        {data.recentEvents.length === 0 ? (
          <KxdEmptyState
            title="No timeline events yet"
            description="Events from launches, infrastructure work, onboarding, and audits will appear here as they occur."
          />
        ) : (
          <div className="kxd-os-timeline-stream">
            {data.recentEvents.map((event) => (
              <TimelineEventCard key={event.id as number} event={event} />
            ))}
          </div>
        )}
      </KxdPage>
    </OperationsShell>
  );
}
