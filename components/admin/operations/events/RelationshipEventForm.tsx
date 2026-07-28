"use client";

import { useEffect, useId, useState } from "react";
import type {
  OperatorClientOption,
  OperatorContactOption,
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
import { PHASE3_OPERATOR_UNAVAILABLE_MESSAGE } from "@/lib/executive-client-workspace/phase3-schema";

export type EventFormState = {
  clientId: string;
  title: string;
  eventAt: string;
  eventCategory: RelationshipEventCategory;
  status: RelationshipEventStatus;
  location: string;
  contextNotes: string;
  followUpNotes: string;
  dietaryNotes: string;
  accessibilityNotes: string;
  contactIds: number[];
};

export const EMPTY_EVENT_FORM: EventFormState = {
  clientId: "",
  title: "",
  eventAt: "",
  eventCategory: "meeting",
  status: "planned",
  location: "",
  contextNotes: "",
  followUpNotes: "",
  dietaryNotes: "",
  accessibilityNotes: "",
  contactIds: [],
};

/** Convert ISO timestamp to datetime-local value (local wall time). */
export function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert datetime-local value to ISO for the API. */
export function datetimeLocalToIso(value: string): string {
  if (!value.trim()) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString();
}

export function formFromEvent(event: OperatorRelationshipEventRow): EventFormState {
  return {
    clientId: String(event.clientId),
    title: event.title,
    eventAt: isoToDatetimeLocal(event.eventAt),
    eventCategory: event.eventCategory,
    status: event.status,
    location: event.location ?? "",
    contextNotes: event.contextNotes ?? "",
    followUpNotes: event.followUpNotes ?? "",
    dietaryNotes: event.dietaryNotes ?? "",
    accessibilityNotes: event.accessibilityNotes ?? "",
    contactIds: [...event.contactIds],
  };
}

type EventFormProps = {
  mode: "create" | "edit";
  form: EventFormState;
  onChange: (next: EventFormState) => void;
  clients: OperatorClientOption[];
  contacts: OperatorContactOption[];
  contactsLoading?: boolean;
  /** When true, client select is disabled (edit: owning client immutable). */
  clientLocked?: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export function RelationshipEventForm({
  mode,
  form,
  onChange,
  clients,
  contacts,
  contactsLoading = false,
  clientLocked = false,
  saveState,
  error,
  onSubmit,
  onCancel,
  submitLabel,
}: EventFormProps) {
  const titleId = useId();

  function setField<K extends keyof EventFormState>(key: K, value: EventFormState[K]) {
    onChange({ ...form, [key]: value });
  }

  function toggleContact(id: number) {
    const has = form.contactIds.includes(id);
    setField(
      "contactIds",
      has ? form.contactIds.filter((x) => x !== id) : [...form.contactIds, id],
    );
  }

  return (
    <form
      className="kxd-os-command-timeline-form kxd-rel-events__form"
      onSubmit={onSubmit}
      aria-labelledby={titleId}
    >
      <p id={titleId} className="kxd-os-meta">
        {mode === "create" ? "New relationship event" : "Edit relationship event"} ·
        private operator record
      </p>

      <div className="kxd-rel-events__form-grid">
        <label className="kxd-os-command-timeline-form__field">
          <span>Client{mode === "create" ? " (required)" : ""}</span>
          <select
            required={mode === "create"}
            disabled={clientLocked || mode === "edit"}
            value={form.clientId}
            onChange={(e) => {
              // Changing client clears contacts so prior-client IDs cannot remain.
              onChange({
                ...form,
                clientId: e.target.value,
                contactIds: [],
              });
            }}
            className="kxd-os-command-timeline-form__input"
          >
            <option value="">Select client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {mode === "edit" ? (
            <span className="kxd-os-meta">Owning client cannot be reassigned here.</span>
          ) : null}
        </label>

        <label className="kxd-os-command-timeline-form__field">
          <span>Title (required)</span>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            className="kxd-os-command-timeline-form__input"
            autoFocus={mode === "create"}
          />
        </label>

        <label className="kxd-os-command-timeline-form__field">
          <span>Date & time (required)</span>
          <input
            type="datetime-local"
            required
            value={form.eventAt}
            onChange={(e) => setField("eventAt", e.target.value)}
            className="kxd-os-command-timeline-form__input"
          />
        </label>

        <label className="kxd-os-command-timeline-form__field">
          <span>Category</span>
          <select
            value={form.eventCategory}
            onChange={(e) =>
              setField("eventCategory", e.target.value as RelationshipEventCategory)
            }
            className="kxd-os-command-timeline-form__input"
          >
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
          <span>Status</span>
          <select
            value={form.status}
            onChange={(e) =>
              setField("status", e.target.value as RelationshipEventStatus)
            }
            className="kxd-os-command-timeline-form__input"
          >
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
          <span>Location</span>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setField("location", e.target.value)}
            className="kxd-os-command-timeline-form__input"
          />
        </label>
      </div>

      <fieldset className="kxd-rel-events__contacts-fieldset">
        <legend className="kxd-os-meta">Associated contacts (same client only)</legend>
        {!form.clientId ? (
          <p className="kxd-os-meta">Select a client to load contacts.</p>
        ) : contactsLoading ? (
          <p className="kxd-os-meta" aria-live="polite">
            Loading contacts…
          </p>
        ) : contacts.length === 0 ? (
          <p className="kxd-os-meta">
            No contacts for this client yet. Add contacts from the client Relationship tab.
          </p>
        ) : (
          <ul className="kxd-rel-events__contact-options">
            {contacts.map((contact) => {
              const inputId = `event-contact-${contact.id}`;
              const checked = form.contactIds.includes(contact.id);
              return (
                <li key={contact.id}>
                  <label htmlFor={inputId} className="kxd-rel-events__contact-option">
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleContact(contact.id)}
                    />
                    <span>
                      {contact.name}
                      {contact.roleTitle ? ` · ${contact.roleTitle}` : ""}
                      {contact.status === "inactive" ? " (inactive)" : ""}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </fieldset>

      <label className="kxd-os-command-timeline-form__field">
        <span>Private context</span>
        <textarea
          value={form.contextNotes}
          onChange={(e) => setField("contextNotes", e.target.value)}
          rows={3}
          className="kxd-os-command-timeline-form__input"
        />
      </label>
      <label className="kxd-os-command-timeline-form__field">
        <span>Follow-up notes (private)</span>
        <textarea
          value={form.followUpNotes}
          onChange={(e) => setField("followUpNotes", e.target.value)}
          rows={3}
          className="kxd-os-command-timeline-form__input"
        />
      </label>
      <div className="kxd-rel-events__form-grid">
        <label className="kxd-os-command-timeline-form__field">
          <span>Dietary notes (private)</span>
          <textarea
            value={form.dietaryNotes}
            onChange={(e) => setField("dietaryNotes", e.target.value)}
            rows={2}
            className="kxd-os-command-timeline-form__input"
          />
        </label>
        <label className="kxd-os-command-timeline-form__field">
          <span>Accessibility notes (private)</span>
          <textarea
            value={form.accessibilityNotes}
            onChange={(e) => setField("accessibilityNotes", e.target.value)}
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
          : "Internal only · never portal or public"}
      </p>

      <div className="kxd-os-command-timeline-form__actions">
        <button
          type="submit"
          className="kxd-os-btn kxd-os-btn--sm"
          disabled={saveState === "saving"}
        >
          {saveState === "saving"
            ? "Saving…"
            : submitLabel ?? (mode === "create" ? "Create event" : "Save changes")}
        </button>
        {onCancel ? (
          <button
            type="button"
            className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
            onClick={onCancel}
            disabled={saveState === "saving"}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

/** Load contacts when clientId changes; clears selection when client changes externally. */
export function useClientContactOptions(clientId: string) {
  const [contacts, setContacts] = useState<OperatorContactOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when client cleared
      setContacts([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/admin/client-relationship/form-options?clientId=${encodeURIComponent(clientId)}`,
          { credentials: "same-origin" },
        );
        const json = (await res.json()) as {
          success?: boolean;
          error?: string;
          unavailable?: boolean;
          contacts?: OperatorContactOption[];
        };
        if (res.status === 503 || json.unavailable) {
          throw new Error(json.error ?? PHASE3_OPERATOR_UNAVAILABLE_MESSAGE);
        }
        if (!res.ok || !json.success) {
          throw new Error(json.error ?? "Unable to load contacts.");
        }
        if (!cancelled) setContacts(json.contacts ?? []);
      } catch (err) {
        if (!cancelled) {
          setContacts([]);
          setError(err instanceof Error ? err.message : "Unable to load contacts.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return { contacts, loading, error };
}
