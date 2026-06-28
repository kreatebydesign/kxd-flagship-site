"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { fmtWorkspaceDate } from "@/lib/executive-client-workspace/theme";
import { groupTimelineEventsByDate } from "@/lib/client-command/activity/formatters";
import type { ClientWorkspaceBundle } from "@/lib/client-command/workspace-types";
import {
  WorkspaceChapter,
  WorkspaceEmpty,
} from "@/components/admin/operations/client-workspace/WorkspacePrimitives";

type ActivityFormMode = "timeline-event" | "note" | "meeting" | null;

export function ClientTimelinePanel({ data }: { data: ClientWorkspaceBundle }) {
  const router = useRouter();
  const [mode, setMode] = useState<ActivityFormMode>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  const groups = groupTimelineEventsByDate(data.timelineEvents);

  async function submitActivity() {
    setStatus("loading");
    setError(null);

    const payload =
      mode === "timeline-event"
        ? {
            action: "timeline-event",
            clientId: data.clientId,
            title,
            summary,
            details,
          }
        : mode === "note"
          ? {
              action: "note",
              clientId: data.clientId,
              title,
              summary,
            }
          : mode === "meeting"
            ? {
                action: "meeting",
                clientId: data.clientId,
                summary,
                meetingDate: meetingDate || undefined,
              }
            : null;

    if (!payload) return;

    try {
      const res = await fetch("/api/admin/client-command/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to log activity.");
      }
      setStatus("success");
      setTitle("");
      setSummary("");
      setDetails("");
      setMeetingDate("");
      setMode(null);
      router.refresh();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to log activity.");
    }
  }

  return (
    <WorkspaceChapter title="Timeline">
      <div className="kxd-os-command-timeline-actions">
        <button
          type="button"
          className="kxd-os-command-timeline-actions__btn"
          onClick={() => {
            setMode("note");
            setStatus("idle");
            setError(null);
          }}
        >
          Add Note
        </button>
        <button
          type="button"
          className="kxd-os-command-timeline-actions__btn"
          onClick={() => {
            setMode("meeting");
            setStatus("idle");
            setError(null);
          }}
        >
          Log Meeting
        </button>
        <button
          type="button"
          className="kxd-os-command-timeline-actions__btn"
          onClick={() => {
            setMode("timeline-event");
            setStatus("idle");
            setError(null);
          }}
        >
          Add Timeline Event
        </button>
      </div>

      {mode ? (
        <form
          className="kxd-os-command-timeline-form"
          onSubmit={(e) => {
            e.preventDefault();
            submitActivity();
          }}
        >
          <p className="kxd-os-meta">
            {mode === "timeline-event"
              ? "Manual timeline entry — visible on this client’s relationship history."
              : mode === "note"
                ? "Creates an executive note and publishes timeline activity."
                : "Logs a success check-in and publishes meeting activity."}
          </p>

          {mode !== "meeting" ? (
            <label className="kxd-os-command-timeline-form__field">
              <span>Title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="kxd-os-command-timeline-form__input"
              />
            </label>
          ) : null}

          <label className="kxd-os-command-timeline-form__field">
            <span>{mode === "meeting" ? "Meeting summary" : "Summary"}</span>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required={mode === "meeting"}
              rows={3}
              className="kxd-os-command-timeline-form__input"
            />
          </label>

          {mode === "timeline-event" ? (
            <label className="kxd-os-command-timeline-form__field">
              <span>Details</span>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                className="kxd-os-command-timeline-form__input"
              />
            </label>
          ) : null}

          {mode === "meeting" ? (
            <label className="kxd-os-command-timeline-form__field">
              <span>Meeting date</span>
              <input
                type="datetime-local"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="kxd-os-command-timeline-form__input"
              />
            </label>
          ) : null}

          {error ? <p className="kxd-os-command-timeline-form__error">{error}</p> : null}
          {status === "success" ? (
            <p className="kxd-os-command-timeline-form__success">Activity logged.</p>
          ) : null}

          <div className="kxd-os-command-timeline-form__actions">
            <button
              type="submit"
              className="kxd-os-command-timeline-actions__btn kxd-os-command-timeline-actions__btn--primary"
              disabled={status === "loading"}
            >
              {status === "loading" ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className="kxd-os-command-timeline-actions__btn"
              onClick={() => setMode(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {groups.length === 0 ? (
        <WorkspaceEmpty
          message="No activity yet. Log the first note, meeting, or milestone — future projects, requests, invoices, and infrastructure updates will appear here automatically."
        />
      ) : (
        <div className="kxd-os-command-timeline-groups">
          {groups.map((group) => (
            <section key={group.dateKey} className="kxd-os-command-timeline-group">
              <h3 className="kxd-os-command-timeline-group__label">{group.dateLabel}</h3>
              <ol className="kxd-os-command-timeline">
                {group.events.map((event) => (
                  <li key={event.id} className="kxd-os-command-timeline__item">
                    <div className="kxd-os-command-timeline__marker" aria-hidden="true">
                      {event.icon}
                    </div>
                    <div className="kxd-os-command-timeline__content">
                      <div className="kxd-os-command-timeline__head">
                        <time className="kxd-os-command-timeline__date">
                          {fmtWorkspaceDate(event.occurredAt)}
                        </time>
                        {event.sourceModule ? (
                          <span className="kxd-os-workspace-badge">{event.sourceModule}</span>
                        ) : null}
                        {event.pinned ? (
                          <span className="kxd-os-workspace-badge">Pinned</span>
                        ) : null}
                        {event.status ? (
                          <span className="kxd-os-workspace-badge">{event.status}</span>
                        ) : null}
                        {event.priority ? (
                          <span className="kxd-os-workspace-badge">{event.priority}</span>
                        ) : null}
                      </div>
                      <h4 className="kxd-os-command-timeline__title">
                        {event.href ? (
                          <Link href={event.href}>{event.title}</Link>
                        ) : (
                          event.title
                        )}
                      </h4>
                      {event.summary ? (
                        <p className="kxd-os-workspace-prose">{event.summary}</p>
                      ) : null}
                      {event.details && event.details !== event.summary ? (
                        <p className="kxd-os-workspace-prose kxd-os-command-timeline__details">
                          {event.details}
                        </p>
                      ) : null}
                      {event.author ? (
                        <p className="kxd-os-command-timeline__author">{event.author}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </WorkspaceChapter>
  );
}
