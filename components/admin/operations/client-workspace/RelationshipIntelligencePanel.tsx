"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  ContactStatus,
  WorkspaceContact,
  WorkspaceRelationshipEvent,
  RelationshipIntelligenceSummary,
} from "@/lib/executive-client-workspace/relationship-types";
import {
  CONTACT_STATUS_LABEL,
  EVENT_CATEGORY_LABEL,
  EVENT_STATUS_LABEL,
} from "@/lib/executive-client-workspace/relationship-types";
import { fmtWorkspaceDateTime } from "@/lib/executive-client-workspace/theme";
import {
  WorkspaceChapter,
  WorkspaceEmpty,
  WorkspaceMetaLine,
  WorkspaceProse,
  WorkspaceStat,
  WorkspaceStatRow,
} from "./WorkspacePrimitives";

type FormMode = "create" | "edit" | null;

type ContactFormState = {
  name: string;
  roleTitle: string;
  email: string;
  phone: string;
  status: ContactStatus;
  preferredCommunication: string;
  relationshipNotes: string;
  preferences: string;
  dietaryNotes: string;
  accessibilityNotes: string;
};

const EMPTY_FORM: ContactFormState = {
  name: "",
  roleTitle: "",
  email: "",
  phone: "",
  status: "active",
  preferredCommunication: "",
  relationshipNotes: "",
  preferences: "",
  dietaryNotes: "",
  accessibilityNotes: "",
};

function formFromContact(contact: WorkspaceContact): ContactFormState {
  return {
    name: contact.name,
    roleTitle: contact.roleTitle ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    status: contact.status,
    preferredCommunication: contact.preferredCommunication ?? "",
    relationshipNotes: contact.relationshipNotes ?? "",
    preferences: contact.preferences ?? "",
    dietaryNotes: contact.dietaryNotes ?? "",
    accessibilityNotes: contact.accessibilityNotes ?? "",
  };
}

export function RelationshipIntelligencePanel({
  clientId,
  contacts,
  events,
  summary,
}: {
  clientId: number;
  contacts: WorkspaceContact[];
  events: WorkspaceRelationshipEvent[];
  summary: RelationshipIntelligenceSummary;
}) {
  const router = useRouter();
  const formTitleId = useId();
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ContactFormState>(EMPTY_FORM);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (formMode !== "create" && formMode !== "edit") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setFormMode(null);
        setEditingId(null);
        setError(null);
        setSaveState("idle");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formMode]);

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setSaveState("idle");
  }

  function openEdit(contact: WorkspaceContact) {
    setFormMode("edit");
    setEditingId(contact.id);
    setForm(formFromContact(contact));
    setError(null);
    setSaveState("idle");
  }

  function closeForm() {
    setFormMode(null);
    setEditingId(null);
    setError(null);
    setSaveState("idle");
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required.");
      setSaveState("error");
      return;
    }

    setSaveState("saving");
    setError(null);

    try {
      const payload = {
        clientId,
        name: form.name.trim(),
        roleTitle: form.roleTitle.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        status: form.status,
        preferredCommunication: form.preferredCommunication.trim() || null,
        relationshipNotes: form.relationshipNotes.trim() || null,
        preferences: form.preferences.trim() || null,
        dietaryNotes: form.dietaryNotes.trim() || null,
        accessibilityNotes: form.accessibilityNotes.trim() || null,
      };

      const res =
        formMode === "edit" && editingId != null
          ? await fetch(`/api/admin/client-relationship/contacts/${editingId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch("/api/admin/client-relationship/contacts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Unable to save contact.");
      }

      setSaveState("saved");
      closeForm();
      router.refresh();
    } catch (err) {
      setSaveState("error");
      setError(err instanceof Error ? err.message : "Unable to save contact.");
    }
  }

  async function setContactStatus(contact: WorkspaceContact, status: ContactStatus) {
    setError(null);
    setSaveState("saving");
    try {
      const res = await fetch(`/api/admin/client-relationship/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          status,
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Unable to update status.");
      }
      setSaveState("saved");
      router.refresh();
    } catch (err) {
      setSaveState("error");
      setError(err instanceof Error ? err.message : "Unable to update status.");
    }
  }

  return (
    <div className="kxd-os-workspace-dossier kxd-os-workspace-relationship">
      <WorkspaceChapter
        title="Relationship intelligence"
        eyebrow="Operator only · private context"
      >
        <WorkspaceProse>
          First-class contacts and relationship events for this client. Sensitive notes stay
          internal — never portal or public.
        </WorkspaceProse>
        <WorkspaceStatRow>
          <WorkspaceStat
            label="Active contacts"
            value={String(summary.activeContactCount)}
            prominence="large"
          />
          <WorkspaceStat
            label="All contacts"
            value={String(summary.totalContactCount)}
          />
        </WorkspaceStatRow>
        <div className="kxd-os-workspace-meta-stack">
          <WorkspaceMetaLine
            label="Recent active contact"
            value={
              summary.recentActiveContact
                ? [
                    summary.recentActiveContact.name,
                    summary.recentActiveContact.roleTitle,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "—"
            }
          />
          <WorkspaceMetaLine
            label="Next planned event"
            value={
              summary.nextPlannedEvent
                ? `${summary.nextPlannedEvent.title} · ${fmtWorkspaceDateTime(summary.nextPlannedEvent.eventAt)}`
                : "—"
            }
          />
          <WorkspaceMetaLine
            label="Latest completed event"
            value={
              summary.latestCompletedEvent
                ? `${summary.latestCompletedEvent.title} · ${fmtWorkspaceDateTime(summary.latestCompletedEvent.eventAt)}`
                : "—"
            }
          />
        </div>
        {summary.preferenceHighlights.length > 0 && (
          <div className="kxd-os-workspace-relationship__notes">
            <p className="kxd-os-workspace-notes__label">Preferences on file</p>
            <ul className="kxd-os-workspace-relationship__note-list">
              {summary.preferenceHighlights.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
        {summary.accessHighlights.length > 0 && (
          <div className="kxd-os-workspace-relationship__notes">
            <p className="kxd-os-workspace-notes__label">Accessibility considerations</p>
            <ul className="kxd-os-workspace-relationship__note-list">
              {summary.accessHighlights.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
      </WorkspaceChapter>

      <WorkspaceChapter
        title="Contacts"
        action={
          formMode === null ? (
            <button
              type="button"
              className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
              onClick={openCreate}
            >
              Add contact
            </button>
          ) : null
        }
      >
        {error && formMode === null ? (
          <p className="kxd-os-command-timeline-form__error" role="alert">
            {error}
          </p>
        ) : null}

        {formMode ? (
          <form
            className="kxd-os-command-timeline-form kxd-os-workspace-relationship__form"
            onSubmit={submitForm}
            aria-labelledby={formTitleId}
          >
            <p id={formTitleId} className="kxd-os-meta">
              {formMode === "create" ? "Add contact" : "Edit contact"} · private operator record
            </p>
            <div className="kxd-os-workspace-relationship__form-grid">
              <label className="kxd-os-command-timeline-form__field">
                <span>Name</span>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="kxd-os-command-timeline-form__input"
                  autoFocus
                />
              </label>
              <label className="kxd-os-command-timeline-form__field">
                <span>Role / title</span>
                <input
                  type="text"
                  value={form.roleTitle}
                  onChange={(e) => setForm((f) => ({ ...f, roleTitle: e.target.value }))}
                  className="kxd-os-command-timeline-form__input"
                />
              </label>
              <label className="kxd-os-command-timeline-form__field">
                <span>Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="kxd-os-command-timeline-form__input"
                />
              </label>
              <label className="kxd-os-command-timeline-form__field">
                <span>Phone</span>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="kxd-os-command-timeline-form__input"
                />
              </label>
              <label className="kxd-os-command-timeline-form__field">
                <span>Status</span>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value === "inactive" ? "inactive" : "active",
                    }))
                  }
                  className="kxd-os-command-timeline-form__input"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>
            <label className="kxd-os-command-timeline-form__field">
              <span>Preferred communication (private)</span>
              <textarea
                value={form.preferredCommunication}
                onChange={(e) =>
                  setForm((f) => ({ ...f, preferredCommunication: e.target.value }))
                }
                rows={2}
                className="kxd-os-command-timeline-form__input"
              />
            </label>
            <label className="kxd-os-command-timeline-form__field">
              <span>Relationship notes (private)</span>
              <textarea
                value={form.relationshipNotes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, relationshipNotes: e.target.value }))
                }
                rows={3}
                className="kxd-os-command-timeline-form__input"
              />
            </label>
            <label className="kxd-os-command-timeline-form__field">
              <span>Preferences (private)</span>
              <textarea
                value={form.preferences}
                onChange={(e) => setForm((f) => ({ ...f, preferences: e.target.value }))}
                rows={2}
                className="kxd-os-command-timeline-form__input"
              />
            </label>
            <div className="kxd-os-workspace-relationship__form-grid">
              <label className="kxd-os-command-timeline-form__field">
                <span>Dietary notes (private)</span>
                <textarea
                  value={form.dietaryNotes}
                  onChange={(e) => setForm((f) => ({ ...f, dietaryNotes: e.target.value }))}
                  rows={2}
                  className="kxd-os-command-timeline-form__input"
                />
              </label>
              <label className="kxd-os-command-timeline-form__field">
                <span>Accessibility notes (private)</span>
                <textarea
                  value={form.accessibilityNotes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, accessibilityNotes: e.target.value }))
                  }
                  rows={2}
                  className="kxd-os-command-timeline-form__input"
                />
              </label>
            </div>
            {error ? (
              <p className="kxd-os-command-timeline-form__error" role="alert">
                {error}
              </p>
            ) : null}
            {saveState === "saved" ? (
              <p className="kxd-os-command-timeline-form__success" aria-live="polite">
                Saved.
              </p>
            ) : null}
            <p className="kxd-os-meta" aria-live="polite">
              {saveState === "saving"
                ? "Saving…"
                : saveState === "error"
                  ? "Fix the issue and try again."
                  : "Internal only · remains operator-private"}
            </p>
            <div className="kxd-os-command-timeline-form__actions">
              <button
                type="submit"
                className="kxd-os-btn kxd-os-btn--sm"
                disabled={saveState === "saving"}
              >
                {saveState === "saving" ? "Saving…" : "Save contact"}
              </button>
              <button
                type="button"
                className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
                onClick={closeForm}
                disabled={saveState === "saving"}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {contacts.length === 0 && formMode === null ? (
          <WorkspaceEmpty message="No contacts recorded for this client yet. Add the people who matter to this relationship." />
        ) : (
          <ul className="kxd-os-workspace-relationship__contact-list">
            {contacts.map((contact) => (
              <li
                key={contact.id}
                className={`kxd-os-workspace-relationship__contact${
                  contact.status === "inactive"
                    ? " kxd-os-workspace-relationship__contact--inactive"
                    : ""
                }`}
              >
                <div className="kxd-os-workspace-relationship__contact-head">
                  <div>
                    <p className="kxd-os-workspace-relationship__contact-name">
                      {contact.name}
                    </p>
                    <p className="kxd-os-workspace-relationship__contact-meta">
                      {[
                        contact.roleTitle,
                        CONTACT_STATUS_LABEL[contact.status],
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="kxd-os-workspace-relationship__contact-actions">
                    <button
                      type="button"
                      className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
                      onClick={() => openEdit(contact)}
                    >
                      Edit
                    </button>
                    {contact.status === "active" ? (
                      <button
                        type="button"
                        className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
                        onClick={() => setContactStatus(contact, "inactive")}
                      >
                        Mark inactive
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
                        onClick={() => setContactStatus(contact, "active")}
                      >
                        Mark active
                      </button>
                    )}
                    <Link
                      href={contact.href}
                      className="kxd-os-link-quiet kxd-os-workspace-inline-link"
                    >
                      Payload →
                    </Link>
                  </div>
                </div>
                <div className="kxd-os-workspace-relationship__contact-body">
                  {(contact.email || contact.phone) && (
                    <p className="kxd-os-workspace-prose">
                      {[contact.email, contact.phone].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {contact.preferredCommunication && (
                    <p className="kxd-os-workspace-prose">
                      <span className="kxd-os-workspace-notes__label">Communication · </span>
                      {contact.preferredCommunication}
                    </p>
                  )}
                  {contact.relationshipNotes && (
                    <p className="kxd-os-workspace-prose kxd-os-workspace-relationship__wrap">
                      <span className="kxd-os-workspace-notes__label">Relationship · </span>
                      {contact.relationshipNotes}
                    </p>
                  )}
                  {contact.preferences && (
                    <p className="kxd-os-workspace-prose kxd-os-workspace-relationship__wrap">
                      <span className="kxd-os-workspace-notes__label">Preferences · </span>
                      {contact.preferences}
                    </p>
                  )}
                  {(contact.dietaryNotes || contact.accessibilityNotes) && (
                    <p className="kxd-os-workspace-prose kxd-os-workspace-relationship__wrap">
                      {contact.dietaryNotes
                        ? `Dietary: ${contact.dietaryNotes}`
                        : null}
                      {contact.dietaryNotes && contact.accessibilityNotes ? " · " : null}
                      {contact.accessibilityNotes
                        ? `Accessibility: ${contact.accessibilityNotes}`
                        : null}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </WorkspaceChapter>

      <WorkspaceChapter title="Relationship events">
        <WorkspaceProse>
          Client-scoped operational engagements. Read-only here — create and edit in the
          Events workspace. Distinct from Timeline history and Google Calendar.
        </WorkspaceProse>
        <p className="kxd-os-meta" style={{ marginBottom: "0.75rem" }}>
          <Link href="/admin/operations/events" className="kxd-os-link-quiet">
            Open Events workspace →
          </Link>
          {" · "}
          <Link
            href={`/admin/operations/events/new`}
            className="kxd-os-link-quiet"
          >
            New event →
          </Link>
        </p>
        {events.length === 0 ? (
          <WorkspaceEmpty message="No relationship events recorded yet. Activity will appear here once events are logged." />
        ) : (
          <ul className="kxd-os-workspace-relationship__event-list">
            {events.map((event) => (
              <li key={event.id} className="kxd-os-workspace-relationship__event">
                <div className="kxd-os-workspace-relationship__event-head">
                  <div>
                    <p className="kxd-os-workspace-relationship__event-title">{event.title}</p>
                    <p className="kxd-os-workspace-relationship__contact-meta">
                      {[
                        fmtWorkspaceDateTime(event.eventAt),
                        EVENT_CATEGORY_LABEL[event.eventCategory],
                        EVENT_STATUS_LABEL[event.status],
                        event.location,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <Link
                    href={`/admin/operations/events/${event.id}`}
                    className="kxd-os-link-quiet kxd-os-workspace-inline-link"
                  >
                    Open →
                  </Link>
                </div>
                {event.contactNames.length > 0 && (
                  <p className="kxd-os-workspace-prose">
                    Contacts: {event.contactNames.join(", ")}
                  </p>
                )}
                {event.contextNotes && (
                  <p className="kxd-os-workspace-prose kxd-os-workspace-relationship__wrap">
                    <span className="kxd-os-workspace-notes__label">Context · </span>
                    {event.contextNotes}
                  </p>
                )}
                {event.followUpNotes && (
                  <p className="kxd-os-workspace-prose kxd-os-workspace-relationship__wrap">
                    <span className="kxd-os-workspace-notes__label">Follow-up · </span>
                    {event.followUpNotes}
                  </p>
                )}
                {(event.dietaryNotes || event.accessibilityNotes) && (
                  <p className="kxd-os-workspace-prose kxd-os-workspace-relationship__wrap">
                    {event.dietaryNotes ? `Dietary: ${event.dietaryNotes}` : null}
                    {event.dietaryNotes && event.accessibilityNotes ? " · " : null}
                    {event.accessibilityNotes
                      ? `Accessibility: ${event.accessibilityNotes}`
                      : null}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </WorkspaceChapter>
    </div>
  );
}
