"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
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

function SectionNum({ n }: { n: string }) {
  return (
    <span className="kxd-inv-num" aria-hidden>
      {n}
    </span>
  );
}

function Field({
  label,
  required,
  hint,
  wide,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`kxd-inv-field${wide ? " kxd-inv-field--wide" : ""}`}>
      <span className="kxd-inv-field__label">
        {label}
        {required ? <span className="kxd-inv-req">*</span> : null}
      </span>
      {hint ? <span className="kxd-inv-field__hint">{hint}</span> : null}
      {children}
    </label>
  );
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

  const pageTitle = mode === "create" ? "Add event" : "Edit event";

  return (
    <CesPage className="kxd-cal-editor kxd-inv-editor">
      <header className="kxd-inv-pagehead">
        <div className="kxd-inv-pagehead__copy">
          <p className="kxd-inv-pagehead__crumb">
            Calendar <span>/</span> {mode === "create" ? "New" : "Manage"}
          </p>
          <h1 className="kxd-inv-pagehead__title">{pageTitle}</h1>
          <p className="kxd-inv-pagehead__lead">
            {sourceLocked
              ? `Official date and venue come from ${SOURCE_LABELS[initial!.sourceSystem]}. Primal notes and website publishing stay with you.`
              : "Create a Primal-owned event. It stays independent of the official MotorsportReg feed."}
          </p>
          {sourceLocked ? (
            <span className="kxd-cal-source-badge kxd-cal-source-badge--official">
              Official · {SOURCE_LABELS[initial!.sourceSystem]}
            </span>
          ) : (
            <span className="kxd-cal-source-badge">Primal-owned event</span>
          )}
        </div>
        <Link href="/portal/calendar" className="kxd-ces-btn kxd-ces-btn--ghost kxd-inv-pagehead__back">
          ← Back to calendar
        </Link>
      </header>

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
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="kxd-inv-editor__layout">
          <div className="kxd-inv-editor__main">
            <section className="kxd-inv-panel kxd-inv-panel--primary" aria-labelledby="cal-details">
              <header className="kxd-inv-panel__head">
                <SectionNum n="01" />
                <div>
                  <h2 id="cal-details">Event details</h2>
                  <p>Name, type, and workflow status for this date.</p>
                </div>
              </header>
              <div className="kxd-inv-form__stack">
                <Field label="Event name" required={!sourceLocked} wide>
                  <input
                    className="kxd-inv-input"
                    value={sourceLocked ? form.titleOverride : form.sourceTitle}
                    onChange={(e) =>
                      sourceLocked ? patch("titleOverride", e.target.value) : patch("sourceTitle", e.target.value)
                    }
                    placeholder={sourceLocked ? initial?.sourceTitle ?? "" : "Event name"}
                    required={!sourceLocked}
                  />
                </Field>
                {sourceLocked ? (
                  <p className="kxd-inv-field__hint kxd-cal-official-name">
                    Official name: {initial?.sourceTitle}
                  </p>
                ) : null}
                <div className="kxd-inv-form__grid">
                  <Field label="Type">
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
                  </Field>
                  <Field label="Status">
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
                  </Field>
                </div>
              </div>
            </section>

            <section className="kxd-inv-panel kxd-inv-panel--secondary" aria-labelledby="cal-schedule">
              <header className="kxd-inv-panel__head">
                <SectionNum n="02" />
                <div>
                  <h2 id="cal-schedule">Schedule and venue</h2>
                  <p>When and where this event runs.</p>
                </div>
              </header>
              <div className="kxd-inv-form__stack">
                <div className="kxd-inv-form__grid">
                  <Field label="Start date">
                    <input
                      className="kxd-inv-input"
                      type="date"
                      value={form.startsOn}
                      onChange={(e) => patch("startsOn", e.target.value)}
                      disabled={sourceLocked}
                      required
                    />
                  </Field>
                  <Field label="End date">
                    <input
                      className="kxd-inv-input"
                      type="date"
                      value={form.endsOn}
                      onChange={(e) => patch("endsOn", e.target.value)}
                      disabled={sourceLocked}
                    />
                  </Field>
                </div>
                <Field label="Venue" wide>
                  <input
                    className="kxd-inv-input"
                    value={form.venueName}
                    onChange={(e) => patch("venueName", e.target.value)}
                    disabled={sourceLocked}
                  />
                </Field>
                <div className="kxd-inv-form__grid">
                  <Field label="City">
                    <input
                      className="kxd-inv-input"
                      value={form.venueCity}
                      onChange={(e) => patch("venueCity", e.target.value)}
                      disabled={sourceLocked}
                    />
                  </Field>
                  <Field label="State">
                    <input
                      className="kxd-inv-input"
                      value={form.venueState}
                      onChange={(e) => patch("venueState", e.target.value)}
                      disabled={sourceLocked}
                    />
                  </Field>
                </div>
              </div>
            </section>

            <section className="kxd-inv-panel kxd-inv-panel--editorial" aria-labelledby="cal-notes">
              <header className="kxd-inv-panel__head">
                <SectionNum n="03" />
                <div>
                  <h2 id="cal-notes">Team notes</h2>
                  <p>Internal context for Primal operators and partners.</p>
                </div>
              </header>
              <div className="kxd-inv-form__stack">
                <Field label="Notes for the team" wide>
                  <textarea
                    className="kxd-inv-input kxd-inv-input--textarea"
                    rows={4}
                    value={form.description}
                    onChange={(e) => patch("description", e.target.value)}
                  />
                </Field>
                <Field label="Practice / prep notes" wide>
                  <textarea
                    className="kxd-inv-input kxd-inv-input--textarea"
                    rows={3}
                    value={form.practiceNotes}
                    onChange={(e) => patch("practiceNotes", e.target.value)}
                  />
                </Field>
              </div>
            </section>

            <section className="kxd-inv-panel kxd-inv-panel--secondary" aria-labelledby="cal-registration">
              <header className="kxd-inv-panel__head">
                <SectionNum n="04" />
                <div>
                  <h2 id="cal-registration">Registration guidance</h2>
                  <p>What guests should know before signing up. Informational only.</p>
                </div>
              </header>
              <Field label="Registration guidance" wide>
                <textarea
                  className="kxd-inv-input kxd-inv-input--textarea"
                  rows={3}
                  value={form.registrationGuidance}
                  onChange={(e) => patch("registrationGuidance", e.target.value)}
                  placeholder="Informational only. This does not open checkout."
                />
              </Field>
            </section>

            <div className="kxd-ces-empty-guide__actions">
              <button type="submit" className="kxd-ces-btn kxd-ces-btn--primary" disabled={pending}>
                {pending ? "Saving…" : "Save event"}
              </button>
              <Link href="/portal/calendar" className="kxd-ces-btn kxd-ces-btn--ghost">
                Cancel
              </Link>
            </div>
          </div>

          <aside className="kxd-inv-editor__aside">
            <div className="kxd-inv-railcard">
              <header className="kxd-inv-railcard__head">
                <h2>Website publishing</h2>
              </header>
              <KxdToggle
                checked={form.listedOnWebsite}
                onChange={(e) => patch("listedOnWebsite", e.currentTarget.checked)}
                label="Publish to website"
              />
            </div>

            {initial ? (
              <div className="kxd-inv-railcard">
                <header className="kxd-inv-railcard__head">
                  <h2>Source</h2>
                </header>
                <div className="kxd-cal-sidebar-block">
                  <p>
                    <strong>{SOURCE_LABELS[initial.sourceSystem]}</strong>
                    {initial.sourceLastSyncedAt
                      ? ` · Official schedule checked ${initial.sourceLastSyncedAt.slice(0, 10)}`
                      : ""}
                  </p>
                  <p>{formatEventDate(initial.startsOn, initial.endsOn)}</p>
                  {initial.sourceUrl ? (
                    <p>
                      Registration:{" "}
                      <a href={initial.sourceUrl} target="_blank" rel="noopener noreferrer">
                        Open official listing
                      </a>
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {initial?.activityLog?.length ? (
              <div className="kxd-inv-railcard">
                <header className="kxd-inv-railcard__head">
                  <h2>Recent changes</h2>
                </header>
                <ul className="kxd-cal-activity">
                  {initial.activityLog.slice(0, 8).map((entry) => (
                    <li key={`${entry.at}-${entry.summary}`}>
                      {entry.at.slice(0, 16).replace("T", " ")} · {entry.summary}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      </form>
    </CesPage>
  );
}
