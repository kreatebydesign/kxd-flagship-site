"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fmtWorkspaceDate } from "@/lib/executive-client-workspace/theme";
import { groupTimelineEventsByDate } from "@/lib/client-command/activity/formatters";
import type {
  ClientCommunicationType,
  WorkspaceCommunicationRow,
} from "@/lib/client-command/communications/types";
import type { ClientWorkspaceBundle } from "@/lib/client-command/workspace-types";
import {
  WorkspaceChapter,
  WorkspaceEmpty,
} from "@/components/admin/operations/client-workspace/WorkspacePrimitives";

const TYPE_OPTIONS: Array<{ value: ClientCommunicationType; label: string }> = [
  { value: "email", label: "Email" },
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
  { value: "text", label: "Text" },
  { value: "note", label: "Note" },
  { value: "form_submission", label: "Form" },
  { value: "campaign_update", label: "Campaign" },
  { value: "support_followup", label: "Support" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "logged", label: "Logged" },
  { value: "needs_reply", label: "Needs reply" },
  { value: "replied", label: "Replied" },
  { value: "resolved", label: "Resolved" },
  { value: "archived", label: "Archived" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All priorities" },
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const TYPE_ICONS: Record<string, string> = {
  email: "✉",
  call: "☎",
  meeting: "◉",
  text: "◫",
  note: "◎",
  form_submission: "◇",
  campaign_update: "◈",
  support_followup: "◫",
};

type FormMode = ClientCommunicationType | "communication" | null;

function typeLabel(type: string): string {
  return type.replace(/_/g, " ");
}

function matchesSearch(row: WorkspaceCommunicationRow, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [
    row.subject,
    row.summary,
    row.bodyPreview,
    row.contactName,
    row.contactEmail,
    row.type,
    row.status,
  ].some((v) => v && v.toLowerCase().includes(needle));
}

export function ClientCommunicationsPanel({ data }: { data: ClientWorkspaceBundle }) {
  const router = useRouter();
  const snapshot = data.communications;

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [subject, setSubject] = useState("");
  const [summary, setSummary] = useState("");
  const [contactName, setContactName] = useState(data.header.primaryContact ?? "");
  const [contactEmail, setContactEmail] = useState(data.header.primaryEmail ?? "");
  const [followUpDate, setFollowUpDate] = useState("");
  const [formType, setFormType] = useState<ClientCommunicationType>("email");
  const [formStatus, setFormStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return snapshot.communications.filter((row) => {
      if (typeFilter !== "all" && row.type !== typeFilter) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (priorityFilter !== "all" && row.priority !== priorityFilter) return false;
      return matchesSearch(row, search.trim());
    });
  }, [snapshot.communications, search, typeFilter, statusFilter, priorityFilter]);

  const timelineGroups = useMemo(() => {
    const asTimeline = filtered.map((row) => ({
      id: `comm-${row.id}`,
      occurredAt: row.date,
      icon: TYPE_ICONS[row.type] ?? "·",
      title: row.subject ?? row.summary ?? typeLabel(row.type),
      summary: row.summary ?? "",
      details: row.bodyPreview ?? "",
      author: row.contactName ?? row.contactEmail ?? row.direction,
      category: row.type,
      eventType: row.type,
      sourceModule: row.source ?? "manual",
      status: row.status,
      priority: row.priority,
      href: row.href,
      pinned: false,
    }));
    return groupTimelineEventsByDate(asTimeline);
  }, [filtered]);

  function openForm(mode: FormMode) {
    setFormMode(mode);
    setFormError(null);
    setFormStatus("idle");
    if (mode && mode !== "communication") {
      setFormType(mode);
    }
    if (mode === "meeting") {
      setSubject("Meeting follow-up");
    }
  }

  async function submitCommunication() {
    setFormStatus("loading");
    setFormError(null);

    try {
      const res = await fetch("/api/admin/client-command/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: data.clientId,
          type: formType,
          direction: formType === "email" ? "outbound" : "internal",
          subject: subject.trim() || summary.trim().slice(0, 80) || typeLabel(formType),
          summary: summary.trim(),
          contactName: contactName.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          followUpDate: followUpDate || undefined,
          status: formType === "email" ? "logged" : "logged",
          source: "client-command",
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to log communication.");
      }
      setFormStatus("success");
      setSubject("");
      setSummary("");
      setFollowUpDate("");
      setFormMode(null);
      router.refresh();
    } catch (err) {
      setFormStatus("error");
      setFormError(err instanceof Error ? err.message : "Failed to log communication.");
    }
  }

  async function patchCommunication(
    id: number,
    patch: { status?: string; followUpDate?: string | null },
  ) {
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/client-command/communications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Update failed.");
      }
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Update failed.");
    }
  }

  return (
    <WorkspaceChapter title="Communications">
      {(snapshot.overdueFollowUps.length > 0 || snapshot.upcomingFollowUps.length > 0) && (
        <div className="kxd-os-comm-followups">
          {snapshot.overdueFollowUps.length > 0 ? (
            <p className="kxd-os-comm-followups__alert">
              {snapshot.overdueFollowUps.length} overdue follow-up
              {snapshot.overdueFollowUps.length === 1 ? "" : "s"}
            </p>
          ) : null}
          {snapshot.upcomingFollowUps.length > 0 ? (
            <p className="kxd-os-comm-followups__upcoming">
              {snapshot.upcomingFollowUps.length} upcoming follow-up
              {snapshot.upcomingFollowUps.length === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>
      )}

      <div className="kxd-os-command-timeline-actions">
        <button type="button" className="kxd-os-command-timeline-actions__btn" onClick={() => openForm("communication")}>
          Add Communication
        </button>
        <button type="button" className="kxd-os-command-timeline-actions__btn" onClick={() => openForm("email")}>
          Log Email
        </button>
        <button type="button" className="kxd-os-command-timeline-actions__btn" onClick={() => openForm("call")}>
          Log Call
        </button>
        <button type="button" className="kxd-os-command-timeline-actions__btn" onClick={() => openForm("meeting")}>
          Log Meeting Follow-up
        </button>
      </div>

      <div className="kxd-os-comm-filters">
        <input
          type="search"
          placeholder="Search communications…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="kxd-os-comm-filters__search"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="kxd-os-comm-filters__select"
        >
          <option value="all">All types</option>
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="kxd-os-comm-filters__select"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="kxd-os-comm-filters__select"
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {formMode ? (
        <form
          className="kxd-os-command-timeline-form"
          onSubmit={(e) => {
            e.preventDefault();
            submitCommunication();
          }}
        >
          <p className="kxd-os-meta">Quick capture — logs to client communications and timeline.</p>
          <label className="kxd-os-command-timeline-form__field">
            <span>Type</span>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as ClientCommunicationType)}
              className="kxd-os-command-timeline-form__input"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="kxd-os-command-timeline-form__field">
            <span>Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="kxd-os-command-timeline-form__input"
              placeholder="Re: project update"
            />
          </label>
          <label className="kxd-os-command-timeline-form__field">
            <span>Summary</span>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              className="kxd-os-command-timeline-form__input"
              placeholder="What happened?"
            />
          </label>
          <div className="kxd-os-comm-form-row">
            <label className="kxd-os-command-timeline-form__field">
              <span>Contact</span>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="kxd-os-command-timeline-form__input"
              />
            </label>
            <label className="kxd-os-command-timeline-form__field">
              <span>Email</span>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="kxd-os-command-timeline-form__input"
              />
            </label>
          </div>
          <label className="kxd-os-command-timeline-form__field">
            <span>Follow-up date</span>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="kxd-os-command-timeline-form__input"
            />
          </label>
          {formError ? <p className="kxd-os-command-timeline-form__error">{formError}</p> : null}
          {formStatus === "success" ? (
            <p className="kxd-os-command-timeline-form__success">Communication logged.</p>
          ) : null}
          <div className="kxd-os-command-timeline-form__actions">
            <button
              type="submit"
              className="kxd-os-command-timeline-actions__btn kxd-os-command-timeline-actions__btn--primary"
              disabled={formStatus === "loading"}
            >
              {formStatus === "loading" ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className="kxd-os-command-timeline-actions__btn"
              onClick={() => setFormMode(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {actionError ? <p className="kxd-os-command-timeline-form__error">{actionError}</p> : null}

      {timelineGroups.length === 0 ? (
        <WorkspaceEmpty
          message="No communications logged yet. Capture emails, calls, meetings, and follow-ups here — full inbox sync comes in a future phase."
        />
      ) : (
        <div className="kxd-os-command-timeline-groups">
          {timelineGroups.map((group) => (
            <section key={group.dateKey} className="kxd-os-command-timeline-group">
              <h3 className="kxd-os-command-timeline-group__label">{group.dateLabel}</h3>
              <ol className="kxd-os-command-timeline">
                {group.events.map((event) => {
                  const commId = Number(event.id.replace("comm-", ""));
                  const row = filtered.find((r) => r.id === commId);
                  if (!row) return null;
                  return (
                    <li key={event.id} className="kxd-os-command-timeline__item">
                      <div className="kxd-os-command-timeline__marker" aria-hidden="true">
                        {event.icon}
                      </div>
                      <div className="kxd-os-command-timeline__content">
                        <div className="kxd-os-command-timeline__head">
                          <time className="kxd-os-command-timeline__date">
                            {fmtWorkspaceDate(event.occurredAt)}
                          </time>
                          <span className="kxd-os-workspace-badge">{typeLabel(row.type)}</span>
                          <span className="kxd-os-workspace-badge">{row.direction}</span>
                          <span className="kxd-os-workspace-badge">{row.status.replace(/_/g, " ")}</span>
                          {row.priority !== "normal" ? (
                            <span className="kxd-os-workspace-badge">{row.priority}</span>
                          ) : null}
                          {row.followUpDate ? (
                            <span className="kxd-os-workspace-badge">
                              Follow-up {fmtWorkspaceDate(row.followUpDate)}
                            </span>
                          ) : null}
                        </div>
                        <h4 className="kxd-os-command-timeline__title">
                          <Link href={row.href}>{event.title}</Link>
                        </h4>
                        {event.summary ? (
                          <p className="kxd-os-workspace-prose">{event.summary}</p>
                        ) : null}
                        {row.contactName || row.contactEmail ? (
                          <p className="kxd-os-command-timeline__author">
                            {row.contactName}
                            {row.contactEmail ? ` · ${row.contactEmail}` : ""}
                          </p>
                        ) : null}
                        <div className="kxd-os-comm-row-actions">
                          {row.status !== "needs_reply" ? (
                            <button
                              type="button"
                              className="kxd-os-comm-row-actions__btn"
                              onClick={() => patchCommunication(commId, { status: "needs_reply" })}
                            >
                              Needs reply
                            </button>
                          ) : null}
                          {row.status !== "resolved" ? (
                            <button
                              type="button"
                              className="kxd-os-comm-row-actions__btn"
                              onClick={() => patchCommunication(commId, { status: "resolved" })}
                            >
                              Resolved
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="kxd-os-comm-row-actions__btn"
                            onClick={() => {
                              const date = prompt("Follow-up date (YYYY-MM-DD)", row.followUpDate?.slice(0, 10) ?? "");
                              if (date) patchCommunication(commId, { followUpDate: date });
                            }}
                          >
                            Set follow-up
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </WorkspaceChapter>
  );
}
