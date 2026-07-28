"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { OpsEmpty, OpsSectionHead } from "@/components/admin/operations/shared/OpsBriefing";
import { KxdPage } from "@/components/os";
import type {
  OperatorClientOption,
  OperatorRelationshipEventRow,
} from "@/lib/executive-client-workspace/events-data";
import type {
  RelationshipEventCategory,
  RelationshipEventStatus,
} from "@/lib/executive-client-workspace/relationship-types";
import {
  EVENT_CATEGORY_LABEL,
  EVENT_STATUS_LABEL,
} from "@/lib/executive-client-workspace/relationship-types";
import { fmtWorkspaceDateTime } from "@/lib/executive-client-workspace/theme";
import { PHASE3_OPERATOR_UNAVAILABLE_MESSAGE } from "@/lib/executive-client-workspace/phase3-schema";

type Timeframe = "all" | "upcoming" | "recent";

export function EventsListScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [events, setEvents] = useState<OperatorRelationshipEventRow[]>([]);
  const [clients, setClients] = useState<OperatorClientOption[]>([]);
  const [q, setQ] = useState("");
  const [qDraft, setQDraft] = useState("");
  const [clientId, setClientId] = useState<string>("all");
  const [status, setStatus] = useState<RelationshipEventStatus | "all">("all");
  const [category, setCategory] = useState<RelationshipEventCategory | "all">("all");
  const [timeframe, setTimeframe] = useState<Timeframe>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDenied(false);
    setUnavailable(false);
    try {
      const params = new URLSearchParams();
      params.set("timeframe", timeframe);
      if (q.trim()) params.set("q", q.trim());
      if (clientId !== "all") params.set("clientId", clientId);
      if (status !== "all") params.set("status", status);
      if (category !== "all") params.set("category", category);

      const res = await fetch(
        `/api/admin/client-relationship/events?${params.toString()}`,
        { credentials: "same-origin" },
      );
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        unavailable?: boolean;
        events?: OperatorRelationshipEventRow[];
        clients?: OperatorClientOption[];
      };
      if (res.status === 401 || res.status === 403) {
        setDenied(true);
        throw new Error(
          json.error ?? "You do not have permission to view relationship events.",
        );
      }
      if (res.status === 503 || json.unavailable) {
        setUnavailable(true);
        setEvents([]);
        setClients(json.clients ?? []);
        setError(json.error ?? PHASE3_OPERATOR_UNAVAILABLE_MESSAGE);
        return;
      }
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Unable to load relationship events.");
      }
      setEvents(json.events ?? []);
      setClients(json.clients ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load.");
    } finally {
      setLoading(false);
    }
  }, [q, clientId, status, category, timeframe]);

  const [nowMs] = useState(() => Date.now());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async bootstrap
    void load();
  }, [load]);

  const upcomingCount = useMemo(
    () =>
      events.filter((e) => {
        if (e.status !== "planned" || !e.eventAt) return false;
        return new Date(e.eventAt).getTime() >= nowMs;
      }).length,
    [events, nowMs],
  );

  const hasActiveFilters =
    Boolean(q.trim()) ||
    clientId !== "all" ||
    status !== "all" ||
    category !== "all" ||
    timeframe !== "all";

  return (
    <OperationsShell activeId="events">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Relationship"
          title="Relationship Events"
          lead="Private operator engagements across clients — dinners, meetings, visits. Distinct from Timeline history and Google Calendar."
        />

        <div className="kxd-rel-events__toolbar">
          {unavailable ? (
            <span className="kxd-os-btn kxd-os-btn--sm" aria-disabled="true" style={{ opacity: 0.5, pointerEvents: "none" }}>
              New event
            </span>
          ) : (
            <Link href="/admin/operations/events/new" className="kxd-os-btn kxd-os-btn--sm">
              New event
            </Link>
          )}
          <Link href="/admin/operations/clients" className="kxd-os-link-quiet">
            Client portfolio →
          </Link>
          <p className="kxd-os-meta" aria-live="polite">
            {loading
              ? "Loading…"
              : denied
                ? "Access restricted"
                : unavailable
                  ? "Temporarily unavailable"
                  : `${events.length} shown${upcomingCount > 0 ? ` · ${upcomingCount} upcoming planned` : ""}`}
          </p>
        </div>

        <form
          className="kxd-rel-events__filters"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(qDraft);
          }}
        >
          <label className="kxd-os-command-timeline-form__field">
            <span>Search title</span>
            <input
              type="search"
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              className="kxd-os-command-timeline-form__input"
              placeholder="Search…"
              disabled={denied || unavailable}
            />
          </label>
          <label className="kxd-os-command-timeline-form__field">
            <span>Client</span>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="kxd-os-command-timeline-form__input"
              disabled={denied || unavailable}
            >
              <option value="all">All clients</option>
              {clients.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="kxd-os-command-timeline-form__field">
            <span>Status</span>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as RelationshipEventStatus | "all")
              }
              className="kxd-os-command-timeline-form__input"
              disabled={denied || unavailable}
            >
              <option value="all">All statuses</option>
              {(Object.keys(EVENT_STATUS_LABEL) as RelationshipEventStatus[]).map(
                (key) => (
                  <option key={key} value={key}>
                    {EVENT_STATUS_LABEL[key]}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="kxd-os-command-timeline-form__field">
            <span>Category</span>
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as RelationshipEventCategory | "all")
              }
              className="kxd-os-command-timeline-form__input"
              disabled={denied || unavailable}
            >
              <option value="all">All categories</option>
              {(Object.keys(EVENT_CATEGORY_LABEL) as RelationshipEventCategory[]).map(
                (key) => (
                  <option key={key} value={key}>
                    {EVENT_CATEGORY_LABEL[key]}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="kxd-os-command-timeline-form__field">
            <span>Timeframe</span>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as Timeframe)}
              className="kxd-os-command-timeline-form__input"
              disabled={denied || unavailable}
            >
              <option value="all">Upcoming then recent</option>
              <option value="upcoming">Upcoming planned</option>
              <option value="recent">Recent / past</option>
            </select>
          </label>
          <div className="kxd-rel-events__filter-actions">
            <button
              type="submit"
              className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
              disabled={denied || unavailable}
            >
              Apply search
            </button>
          </div>
        </form>

        {error ? (
          <p className="kxd-os-command-timeline-form__error" role="alert">
            {error}
          </p>
        ) : null}

        <OpsSectionHead
          label="Events"
          count={loading || denied || unavailable ? undefined : events.length}
        />

        {loading ? (
          <p className="kxd-os-meta" aria-live="polite">
            Loading relationship events…
          </p>
        ) : denied ? (
          <OpsEmpty message="Access denied. Relationship Events are available to studio operators only." />
        ) : unavailable ? (
          <OpsEmpty message={PHASE3_OPERATOR_UNAVAILABLE_MESSAGE} />
        ) : events.length === 0 ? (
          <div className="kxd-rel-events__empty">
            <OpsEmpty
              message={
                hasActiveFilters
                  ? "No relationship events match these filters."
                  : "No relationship events yet."
              }
            />
            <p className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
              {hasActiveFilters ? (
                <>Clear filters, or create an event from the toolbar.</>
              ) : (
                <>
                  <Link href="/admin/operations/events/new" className="kxd-os-link-quiet">
                    Create an event
                  </Link>
                  {" · "}
                  <Link href="/admin/operations/clients" className="kxd-os-link-quiet">
                    Open client portfolio
                  </Link>
                </>
              )}
            </p>
          </div>
        ) : (
          <ul className="kxd-rel-events__list">
            {events.map((event) => (
              <li key={event.id} className="kxd-rel-events__row">
                <div className="kxd-rel-events__row-main">
                  <Link href={event.href} className="kxd-rel-events__title-link">
                    {event.title}
                  </Link>
                  <p className="kxd-rel-events__meta">
                    {[
                      event.clientName,
                      fmtWorkspaceDateTime(event.eventAt),
                      event.eventCategoryLabel,
                      event.statusLabel,
                      event.location,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {event.contactNames.length > 0 ? (
                    <p className="kxd-rel-events__meta">
                      Contacts: {event.contactNames.join(", ")}
                    </p>
                  ) : null}
                  {(event.hasPrivateContext || event.hasFollowUpNotes) && (
                    <p className="kxd-rel-events__private-flag">
                      {[
                        event.hasPrivateContext ? "Private context on file" : null,
                        event.hasFollowUpNotes ? "Follow-up notes on file" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                <div className="kxd-rel-events__row-actions">
                  <Link
                    href={event.href}
                    className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
                  >
                    Open
                  </Link>
                  <Link href={event.clientHref} className="kxd-os-link-quiet">
                    Client workspace →
                  </Link>
                  <Link
                    href={event.clientRelationshipHref}
                    className="kxd-os-link-quiet"
                  >
                    Relationship →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </KxdPage>
    </OperationsShell>
  );
}
