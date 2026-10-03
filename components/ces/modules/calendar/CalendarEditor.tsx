"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { KxdToggle } from "@/components/os";
import { CesPage } from "@/components/ces/primitives";
import type { CalendarEventInput, CalendarEventRecord, CalendarEventType } from "@/lib/calendar/types";
import { CALENDAR_EVENT_TYPES } from "@/lib/calendar/types";
import { EVENT_TYPE_LABELS, SOURCE_LABELS, STATUS_LABELS, formatEventDate } from "@/lib/calendar/presentation";
import { sourceOwnedLockedMessage } from "@/lib/calendar/authority";

type Props = {
  mode: "create" | "edit";
  initial?: CalendarEventRecord | null;
};

type FormState = {
  titleOverride: string;
  sourceTitle: string;
  startsOn: string;
  endsOn: string;
  eventType: CalendarEventType;
  status: CalendarEventRecord["status"];
  listedOnWebsite: boolean;
  featured: boolean;
  venueName: string;
  venueCity: string;
  venueState: string;
  venueAddress: string;
  summary: string;
  description: string;
  practiceNotes: string;
  registrationGuidance: string;
  timezone: string;
};

function fromRecord(record?: CalendarEventRecord | null): FormState {
  return {
    titleOverride: record?.titleOverride ?? "",
    sourceTitle: record?.sourceTitle ?? "",
    startsOn: record?.startsOn ?? "",
    endsOn: record?.endsOn ?? "",
    eventType: record?.eventType ?? "school",
    status: record?.status ?? "draft",
    listedOnWebsite: record?.listedOnWebsite ?? false,
    featured: record?.featured ?? false,
    venueName: record?.venueName ?? "",
    venueCity: record?.venueCity ?? "",
    venueState: record?.venueState ?? "",
    venueAddress: record?.venueAddress ?? "",
    summary: record?.summary ?? "",
    description: record?.description ?? "",
    practiceNotes: record?.practiceNotes ?? "",
    registrationGuidance: record?.registrationGuidance ?? "",
    timezone: record?.timezone ?? "America/New_York",
  };
}

export function CalendarEditor({ mode, initial }: Props) {
  const router = useRouter();
  const sourceLocked = Boolean(initial && initial.sourceSystem !== "manual");
  const [form, setForm] = useState<FormState>(fromRecord(initial));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toPayload(): CalendarEventInput {
    return {
      titleOverride: form.titleOverride,
      sourceTitle: form.sourceTitle,
      startsOn: form.startsOn,
      endsOn: form.endsOn || null,
      eventType: form.eventType,
      status: form.status,
      listedOnWebsite: form.listedOnWebsite,
      featured: form.featured,
      venueName: form.venueName,
      venueCity: form.venueCity,
      venueState: form.venueState,
      venueAddress: form.venueAddress,
      summary: form.summary,
      description: form.description,
      practiceNotes: form.practiceNotes,
      registrationGuidance: form.registrationGuidance,
      timezone: form.timezone,
      allDay: true,
    };
  }

  function save() {
    startTransition(async () => {
      setError(null);
      const url =
        mode === "create" ? "/api/portal/calendar" : `/api/portal/calendar/${initial!.eventKey}`;
      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload()),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.message || "Could not save this event.");
        return;
      }
      router.push(`/portal/calendar/${data.event.eventKey}`);
      router.refresh();
    });
  }

  return (
    <CesPage>
      <p className="kxd-client-home__eyebrow">
        <Link href="/portal/calendar">Calendar</Link>
      </p>
      <h1 className="kxd-ces-hero__title">{mode === "create" ? "Add event" : "Edit event"}</h1>
      <p className="kxd-ces-hero__lead">
        {sourceLocked
          ? `Official date and venue come from ${SOURCE_LABELS[initial!.sourceSystem]}. Primal notes and website publishing stay with you.`
          : "Create a Primal-owned event. It stays independent of the official MotorsportReg feed."}
      </p>

      {sourceLocked ? (
        <p className="kxd-inv-notice" role="note">
          {sourceOwnedLockedMessage("Date and venue")}
        </p>
      ) : null}

      {error ? (
        <p className="kxd-inv-error" role="alert">
          {error}
        </p>
      ) : null}

      <form
        className="kxd-ces-section"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label className="kxd-inv-field">
          <span className="kxd-inv-field__label">Event name</span>
          <input
            className="kxd-inv-input"
            value={sourceLocked ? form.titleOverride : form.sourceTitle}
            onChange={(e) =>
              sourceLocked ? patch("titleOverride", e.target.value) : patch("sourceTitle", e.target.value)
            }
            placeholder={sourceLocked ? initial?.sourceTitle ?? "" : "Event name"}
            required={!sourceLocked}
          />
        </label>
        {sourceLocked ? (
          <p className="kxd-inv-card__meta">Official name: {initial?.sourceTitle}</p>
        ) : null}

        <label className="kxd-inv-field">
          <span className="kxd-inv-field__label">Start date</span>
          <input
            className="kxd-inv-input"
            type="date"
            value={form.startsOn}
            onChange={(e) => patch("startsOn", e.target.value)}
            disabled={sourceLocked}
            required
          />
        </label>
        <label className="kxd-inv-field">
          <span className="kxd-inv-field__label">End date</span>
          <input
            className="kxd-inv-input"
            type="date"
            value={form.endsOn}
            onChange={(e) => patch("endsOn", e.target.value)}
            disabled={sourceLocked}
          />
        </label>

        <label className="kxd-inv-field">
          <span className="kxd-inv-field__label">Type</span>
          <select
            className="kxd-inv-input"
            value={form.eventType}
            onChange={(e) => patch("eventType", e.target.value as CalendarEventType)}
          >
            {CALENDAR_EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {EVENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        <label className="kxd-inv-field">
          <span className="kxd-inv-field__label">Status</span>
          <select
            className="kxd-inv-input"
            value={form.status}
            onChange={(e) => patch("status", e.target.value as FormState["status"])}
            disabled={sourceLocked && initial?.status === "cancelled"}
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="kxd-inv-field">
          <span className="kxd-inv-field__label">Venue</span>
          <input
            className="kxd-inv-input"
            value={form.venueName}
            onChange={(e) => patch("venueName", e.target.value)}
            disabled={sourceLocked}
          />
        </label>
        <label className="kxd-inv-field">
          <span className="kxd-inv-field__label">City</span>
          <input
            className="kxd-inv-input"
            value={form.venueCity}
            onChange={(e) => patch("venueCity", e.target.value)}
            disabled={sourceLocked}
          />
        </label>
        <label className="kxd-inv-field">
          <span className="kxd-inv-field__label">State</span>
          <input
            className="kxd-inv-input"
            value={form.venueState}
            onChange={(e) => patch("venueState", e.target.value)}
            disabled={sourceLocked}
          />
        </label>

        <label className="kxd-inv-field">
          <span className="kxd-inv-field__label">Notes for the team</span>
          <textarea
            className="kxd-inv-input"
            rows={4}
            value={form.description}
            onChange={(e) => patch("description", e.target.value)}
          />
        </label>
        <label className="kxd-inv-field">
          <span className="kxd-inv-field__label">Practice / prep notes</span>
          <textarea
            className="kxd-inv-input"
            rows={3}
            value={form.practiceNotes}
            onChange={(e) => patch("practiceNotes", e.target.value)}
          />
        </label>
        <label className="kxd-inv-field">
          <span className="kxd-inv-field__label">Registration guidance</span>
          <textarea
            className="kxd-inv-input"
            rows={3}
            value={form.registrationGuidance}
            onChange={(e) => patch("registrationGuidance", e.target.value)}
            placeholder="Informational only — this does not open checkout."
          />
        </label>

        <div className="kxd-inv-field">
          <KxdToggle
            checked={form.listedOnWebsite}
            onChange={(e) => patch("listedOnWebsite", e.currentTarget.checked)}
            label="Publish to website"
          />
        </div>

        {initial ? (
          <p className="kxd-inv-card__meta">
            {formatEventDate(initial.startsOn, initial.endsOn)} · {SOURCE_LABELS[initial.sourceSystem]}
            {initial.sourceLastSyncedAt ? ` · Official schedule checked ${initial.sourceLastSyncedAt.slice(0, 10)}` : ""}
          </p>
        ) : null}

        {initial?.activityLog?.length ? (
          <section aria-label="Recent changes">
            <h2 className="kxd-ces-empty-guide__title">Recent changes</h2>
            <ul className="kxd-inv-list">
              {initial.activityLog.slice(0, 8).map((entry) => (
                <li key={`${entry.at}-${entry.summary}`} className="kxd-inv-card__meta">
                  {entry.at.slice(0, 16).replace("T", " ")} · {entry.summary}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="kxd-ces-empty-guide__actions">
          <button type="submit" className="kxd-ces-btn kxd-ces-btn--primary" disabled={pending}>
            {pending ? "Saving…" : "Save event"}
          </button>
          <Link href="/portal/calendar" className="kxd-ces-btn kxd-ces-btn--ghost">
            Back to calendar
          </Link>
        </div>
      </form>
    </CesPage>
  );
}
