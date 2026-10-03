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
    <CesPage>
      <CesHero
        eyebrow="Schedule"
        title="Calendar"
        lead="See what’s next, keep Primal notes accurate, and publish the events that should appear on the website."
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

      <section className="kxd-inv-command" aria-labelledby="calendar-next-title">
        <header>
          <p className="kxd-client-home__eyebrow">What’s next</p>
          <h2 id="calendar-next-title">
            {nextEvent ? eventHeadline(nextEvent) : "No upcoming events yet"}
          </h2>
          <p>
            {nextEvent
              ? `${formatEventDate(nextEvent.startsOn, nextEvent.endsOn)}${formatVenue(nextEvent) ? ` · ${formatVenue(nextEvent)}` : ""}`
              : "Refresh the official schedule or add a Primal event."}
          </p>
        </header>
        <dl>
          <div>
            <dt>Upcoming</dt>
            <dd>{upcoming.length}</dd>
          </div>
          <div>
            <dt>On website</dt>
            <dd>{publishedCount}</dd>
          </div>
          <div>
            <dt>Needs attention</dt>
            <dd>{attentionCount}</dd>
          </div>
          <div>
            <dt>Latest change</dt>
            <dd>
              {events[0]?.updatedAt ? fmtPortalDate([...events].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))[0]?.updatedAt ?? "") : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="kxd-ces-section kxd-inv-toolbar" aria-label="Calendar filters">
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
        <p className="kxd-inv-toolbar__count">
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
        <section className="kxd-ces-section kxd-inv-list-wrap" aria-label="Events">
          <ul className="kxd-inv-list">
            {filtered.map((event) => {
              const attention = eventAttention(event);
              return (
                <li key={event.id} className="kxd-inv-card">
                  <div className="kxd-inv-card__body">
                    <div className="kxd-inv-card__top">
                      <div>
                        <h3>
                          <Link href={`/portal/calendar/${event.eventKey}`}>{eventHeadline(event)}</Link>
                        </h3>
                        <p className="kxd-inv-card__meta">
                          {formatEventDate(event.startsOn, event.endsOn)}
                          {formatVenue(event) ? ` · ${formatVenue(event)}` : ""}
                          {` · ${EVENT_TYPE_LABELS[event.eventType]}`}
                          {` · ${SOURCE_LABELS[event.sourceSystem]}`}
                        </p>
                      </div>
                      <span className={`kxd-ces-status kxd-ces-status--${event.status === "cancelled" ? "lost" : event.listedOnWebsite ? "won" : "new"}`}>
                        {event.listedOnWebsite ? "On website" : STATUS_LABELS[event.status]}
                      </span>
                    </div>
                    {attentionLabel(attention) ? (
                      <p className="kxd-inv-card__price">{attentionLabel(attention)}</p>
                    ) : null}
                    <div className="kxd-inv-card__actions">
                      <Link href={`/portal/calendar/${event.eventKey}`} className="kxd-ces-btn kxd-ces-btn--ghost">
                        Open
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </CesPage>
  );
}
