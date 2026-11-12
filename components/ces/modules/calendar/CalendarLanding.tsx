"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { ResolvedExperienceProfile } from "@/lib/ces";
import type { CalendarEventRecord } from "@/lib/calendar/types";
import {
  EVENT_TYPE_LABELS,
  SOURCE_LABELS,
  STATUS_LABELS,
  attentionLabel,
  eventAttention,
  eventDateRailParts,
  eventHeadline,
  formatEventDate,
  formatVenue,
} from "@/lib/calendar/presentation";
import { fmtPortalDate } from "@/lib/portal/format";
import { CesHero, CesPage } from "@/components/ces/primitives";

type Props = {
  profile: ResolvedExperienceProfile;
  events: CalendarEventRecord[];
};

function statusTone(event: CalendarEventRecord): "won" | "new" | "lost" {
  if (event.status === "cancelled") return "lost";
  if (event.listedOnWebsite) return "won";
  return "new";
}

function CalendarEventCard({ event }: { event: CalendarEventRecord }) {
  const attention = eventAttention(event);
  const rail = eventDateRailParts(event.startsOn, event.endsOn);
  const venue = formatVenue(event);
  const attentionText = attentionLabel(attention);

  return (
    <li className="kxd-cal-event-card">
      <div className="kxd-cal-event-card__rail" aria-hidden>
        <span className="kxd-cal-event-card__month">{rail.monthLabel}</span>
        <span className="kxd-cal-event-card__day">{rail.dayLabel}</span>
        {rail.multiDay && rail.endDayLabel ? (
          <span className="kxd-cal-event-card__day-range">– {rail.endDayLabel}</span>
        ) : null}
        <span className="kxd-cal-event-card__year">{rail.yearLabel}</span>
      </div>
      <div className="kxd-cal-event-card__body">
        <h3 className="kxd-cal-event-card__title">
          <Link href={`/portal/calendar/${event.eventKey}`}>{eventHeadline(event)}</Link>
        </h3>
        {venue ? (
          <p className="kxd-cal-event-card__venue">{venue}</p>
        ) : (
          <p className="kxd-cal-event-card__venue kxd-cal-event-card__venue--missing">Venue not set</p>
        )}
        <div className="kxd-cal-event-card__chips">
          <span className="kxd-cal-chip kxd-cal-chip--type">{EVENT_TYPE_LABELS[event.eventType]}</span>
          <span className="kxd-cal-chip">{SOURCE_LABELS[event.sourceSystem]}</span>
          {attentionText ? <span className="kxd-cal-chip kxd-cal-chip--attention">{attentionText}</span> : null}
        </div>
      </div>
      <div className="kxd-cal-event-card__aside">
        <span className={`kxd-ces-status kxd-ces-status--${statusTone(event)}`}>
          {event.listedOnWebsite ? "On website" : STATUS_LABELS[event.status]}
        </span>
        <Link
          href={`/portal/calendar/${event.eventKey}`}
          className="kxd-ces-btn kxd-ces-btn--ghost kxd-cal-event-card__manage"
        >
          Manage
        </Link>
      </div>
    </li>
  );
}

export function CalendarLanding({ events: initial }: Props) {
  const [events, setEvents] = useState(initial);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("upcoming");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const upcoming = useMemo(
    () =>
      events
        .filter((event) => (event.endsOn || event.startsOn) >= today && event.status !== "cancelled")
        .slice()
        .sort((a, b) => a.startsOn.localeCompare(b.startsOn)),
    [events, today],
  );

  const filtered = useMemo(() => {
    return events
      .filter((event) => {
        if (status === "upcoming") {
          return (event.endsOn || event.startsOn) >= today && event.status !== "cancelled";
        }
        if (status === "website") return event.listedOnWebsite;
        if (status !== "all" && event.status !== status) return false;
        return true;
      })
      .filter((event) => {
        if (!query.trim()) return true;
        const q = query.trim().toLowerCase();
        return (
          eventHeadline(event).toLowerCase().includes(q) ||
          (event.venueName ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  }, [events, query, status, today]);

  const nextEvent = upcoming[0] ?? null;
  const attentionCount = events.filter((event) => eventAttention(event) !== "none").length;
  const publishedCount = events.filter((event) => event.listedOnWebsite).length;

  const latestChange = useMemo(() => {
    const sorted = [...events].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    return sorted[0]?.updatedAt ? fmtPortalDate(sorted[0].updatedAt) : "—";
  }, [events]);

  function refresh() {
    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/portal/calendar");
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.message || "Could not refresh the calendar.");
        return;
      }
      setEvents(data.events);
      setNotice("Calendar refreshed.");
    });
  }

  function syncOfficial() {
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const response = await fetch("/api/portal/calendar/sync", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.message || "Could not refresh the official schedule.");
        return;
      }
      const list = await fetch("/api/portal/calendar");
      const body = await list.json();
      if (body.ok) setEvents(body.events);
      setNotice(
        `Official schedule updated. ${data.created} new, ${data.updated} changed, ${data.unchanged} unchanged.`,
      );
    });
  }

  return (
    <CesPage className="kxd-cal-landing">
      <CesHero
        eyebrow="Schedule"
        title="Calendar"
        lead="Season schedule, official MotorsportReg dates, and what Primal publishes to the website."
        actions={
          <div className="kxd-ces-hero__action-row">
            <Link href="/portal/calendar/new" className="kxd-ces-btn kxd-ces-btn--primary">
              Add event
            </Link>
            <button
              type="button"
              className="kxd-ces-btn kxd-ces-btn--ghost"
              onClick={syncOfficial}
              disabled={pending}
            >
              Refresh official schedule
            </button>
            <button type="button" className="kxd-ces-btn kxd-ces-btn--ghost" onClick={refresh} disabled={pending}>
              {pending ? "Working…" : "Refresh"}
            </button>
          </div>
        }
      />

      <section className="kxd-cal-command" aria-labelledby="calendar-next-title">
        <div>
          <p className="kxd-cal-command__eyebrow">Next on the calendar</p>
          <h2 id="calendar-next-title" className="kxd-cal-command__title">
            {nextEvent ? eventHeadline(nextEvent) : "No upcoming events yet"}
          </h2>
          <p className="kxd-cal-command__lead">
            {nextEvent
              ? `${formatEventDate(nextEvent.startsOn, nextEvent.endsOn)}${formatVenue(nextEvent) ? ` · ${formatVenue(nextEvent)}` : ""}${nextEvent ? ` · ${EVENT_TYPE_LABELS[nextEvent.eventType]}` : ""}`
              : "Refresh the official schedule or add a Primal event."}
          </p>
        </div>
        <ul className="kxd-cal-command__metrics">
          <li>
            <span className="kxd-cal-command__metric-label">Upcoming</span>
            <span className="kxd-cal-command__metric-value">{upcoming.length}</span>
          </li>
          <li>
            <span className="kxd-cal-command__metric-label">On website</span>
            <span className="kxd-cal-command__metric-value">{publishedCount}</span>
          </li>
          <li>
            <span className="kxd-cal-command__metric-label">Needs attention</span>
            <span className="kxd-cal-command__metric-value">{attentionCount}</span>
          </li>
          <li>
            <span className="kxd-cal-command__metric-label">Latest change</span>
            <span className="kxd-cal-command__metric-value kxd-cal-command__metric-value--small">
              {latestChange}
            </span>
          </li>
        </ul>
      </section>

      <section className="kxd-ces-section kxd-cal-toolbar" aria-label="Calendar filters">
        <label className="kxd-inv-field">
          <span className="kxd-inv-field__label">Search</span>
          <input
            className="kxd-inv-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Event or venue…"
            autoComplete="off"
          />
        </label>
        <label className="kxd-inv-field">
          <span className="kxd-inv-field__label">View</span>
          <select className="kxd-inv-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="upcoming">Upcoming</option>
            <option value="website">On website</option>
            <option value="all">All events</option>
            <option value="draft">Drafts</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <p className="kxd-cal-toolbar__count">
          {filtered.length} event{filtered.length === 1 ? "" : "s"}
        </p>
      </section>

      {error ? (
        <p className="kxd-inv-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="kxd-inv-notice" role="status">
          {notice}
        </p>
      ) : null}

      {events.length === 0 ? (
        <section className="kxd-ces-section kxd-ces-empty-guide">
          <h2 className="kxd-ces-empty-guide__title">Start the Primal calendar</h2>
          <ol className="kxd-ces-empty-guide__steps">
            <li>Refresh the official MotorsportReg schedule.</li>
            <li>Add Primal-only events that should not come from MotorsportReg.</li>
            <li>Publish events that should appear on primalmotorsports.com.</li>
          </ol>
          <div className="kxd-ces-empty-guide__actions">
            <button type="button" className="kxd-ces-btn kxd-ces-btn--primary" onClick={syncOfficial}>
              Refresh official schedule
            </button>
          </div>
        </section>
      ) : null}

      {events.length > 0 && filtered.length === 0 ? (
        <section className="kxd-ces-section kxd-ces-empty">
          <h2 className="kxd-ces-empty__title">No matches</h2>
          <p className="kxd-ces-empty__lead">Nothing matches this view. Clear search or switch to All events.</p>
        </section>
      ) : null}

      {filtered.length > 0 ? (
        <section className="kxd-ces-section" aria-label="Events">
          <ul className="kxd-cal-list">
            {filtered.map((event) => (
              <CalendarEventCard key={event.id} event={event} />
            ))}
          </ul>
        </section>
      ) : null}
    </CesPage>
  );
}
