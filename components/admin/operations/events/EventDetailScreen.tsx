"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { KxdPage } from "@/components/os";
import type {
  OperatorClientOption,
  OperatorContactOption,
  OperatorRelationshipEventRow,
} from "@/lib/executive-client-workspace/events-data";
import type { RelationshipEventStatus } from "@/lib/executive-client-workspace/relationship-types";
import { EVENT_STATUS_LABEL } from "@/lib/executive-client-workspace/relationship-types";
import { fmtWorkspaceDateTime } from "@/lib/executive-client-workspace/theme";
import {
  EMPTY_EVENT_FORM,
  RelationshipEventForm,
  datetimeLocalToIso,
  formFromEvent,
  useClientContactOptions,
  type EventFormState,
} from "./RelationshipEventForm";

export function EventCreateScreen({
  initialClientId,
}: {
  initialClientId?: number;
}) {
  const router = useRouter();
  const [clients, setClients] = useState<OperatorClientOption[]>([]);
  const [form, setForm] = useState<EventFormState>(() => ({
    ...EMPTY_EVENT_FORM,
    clientId:
      initialClientId != null && Number.isFinite(initialClientId) && initialClientId > 0
        ? String(initialClientId)
        : "",
  }));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const { contacts, loading: contactsLoading } = useClientContactOptions(form.clientId);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/client-relationship/form-options", {
          credentials: "same-origin",
        });
        const json = (await res.json()) as {
          success?: boolean;
          error?: string;
          clients?: OperatorClientOption[];
        };
        if (res.status === 401 || res.status === 403) {
          throw new Error(
            json.error ?? "You do not have permission to create relationship events.",
          );
        }
        if (!res.ok || !json.success) {
          throw new Error(json.error ?? "Unable to load clients.");
        }
        setClients(json.clients ?? []);
      } catch (err) {
        setBootError(err instanceof Error ? err.message : "Unable to load.");
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveState("saving");
    setError(null);
    try {
      const res = await fetch("/api/admin/client-relationship/events", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: Number(form.clientId),
          title: form.title.trim(),
          eventAt: datetimeLocalToIso(form.eventAt),
          eventCategory: form.eventCategory,
          status: form.status,
          location: form.location.trim() || null,
          contextNotes: form.contextNotes.trim() || null,
          followUpNotes: form.followUpNotes.trim() || null,
          dietaryNotes: form.dietaryNotes.trim() || null,
          accessibilityNotes: form.accessibilityNotes.trim() || null,
          contactIds: form.contactIds,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        href?: string;
        id?: number;
      };
      if (res.status === 401 || res.status === 403) {
        throw new Error(
          json.error ?? "You do not have permission to create relationship events.",
        );
      }
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Unable to create event.");
      }
      setSaveState("saved");
      router.push(json.href ?? `/admin/operations/events/${json.id}`);
      router.refresh();
    } catch (err) {
      setSaveState("error");
      setError(err instanceof Error ? err.message : "Unable to create event.");
    }
  }

  const selectedClientHref =
    form.clientId && Number(form.clientId) > 0
      ? `/admin/operations/clients/${form.clientId}?tab=relationship`
      : null;

  return (
    <OperationsShell activeId="events">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Relationship"
          title="New relationship event"
          lead="Record a private operational engagement. Contacts must belong to the selected client."
        />
        <p className="kxd-os-meta" style={{ marginBottom: "1rem" }}>
          <Link href="/admin/operations/events" className="kxd-os-link-quiet">
            ← All events
          </Link>
          {" · "}
          <Link href="/admin/operations/clients" className="kxd-os-link-quiet">
            Client portfolio
          </Link>
          {selectedClientHref ? (
            <>
              {" · "}
              <Link href={selectedClientHref} className="kxd-os-link-quiet">
                Selected client relationship
              </Link>
            </>
          ) : null}
        </p>
        {bootError ? (
          <p className="kxd-os-command-timeline-form__error" role="alert">
            {bootError}
          </p>
        ) : (
          <RelationshipEventForm
            mode="create"
            form={form}
            onChange={setForm}
            clients={clients}
            contacts={contacts}
            contactsLoading={contactsLoading}
            saveState={saveState}
            error={error}
            onSubmit={onSubmit}
            onCancel={() => router.push("/admin/operations/events")}
          />
        )}
      </KxdPage>
    </OperationsShell>
  );
}

export function EventDetailScreen({ eventId }: { eventId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [event, setEvent] = useState<OperatorRelationshipEventRow | null>(null);
  const [contacts, setContacts] = useState<OperatorContactOption[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EventFormState>(EMPTY_EVENT_FORM);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<OperatorClientOption[]>([]);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const [detailRes, optionsRes] = await Promise.all([
        fetch(`/api/admin/client-relationship/events/${eventId}`, {
          credentials: "same-origin",
        }),
        fetch("/api/admin/client-relationship/form-options", {
          credentials: "same-origin",
        }),
      ]);
      const detailJson = (await detailRes.json()) as {
        success?: boolean;
        error?: string;
        event?: OperatorRelationshipEventRow;
        contacts?: OperatorContactOption[];
      };
      const optionsJson = (await optionsRes.json()) as {
        success?: boolean;
        clients?: OperatorClientOption[];
      };
      if (detailRes.status === 401 || detailRes.status === 403) {
        throw new Error(
          detailJson.error ??
            "You do not have permission to view this relationship event.",
        );
      }
      if (!detailRes.ok || !detailJson.success || !detailJson.event) {
        throw new Error(detailJson.error ?? "Event not found.");
      }
      setEvent(detailJson.event);
      setContacts(detailJson.contacts ?? []);
      setForm(formFromEvent(detailJson.event));
      if (optionsJson.success) setClients(optionsJson.clients ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Unable to load event.");
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async bootstrap
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load on eventId
  }, [eventId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return;
    setSaveState("saving");
    setError(null);
    try {
      const res = await fetch(`/api/admin/client-relationship/events/${event.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: event.clientId,
          title: form.title.trim(),
          eventAt: datetimeLocalToIso(form.eventAt),
          eventCategory: form.eventCategory,
          status: form.status,
          location: form.location.trim() || null,
          contextNotes: form.contextNotes.trim() || null,
          followUpNotes: form.followUpNotes.trim() || null,
          dietaryNotes: form.dietaryNotes.trim() || null,
          accessibilityNotes: form.accessibilityNotes.trim() || null,
          contactIds: form.contactIds,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        event?: OperatorRelationshipEventRow;
      };
      if (!res.ok || !json.success || !json.event) {
        throw new Error(json.error ?? "Unable to save.");
      }
      setEvent(json.event);
      setForm(formFromEvent(json.event));
      setSaveState("saved");
      setEditing(false);
      router.refresh();
    } catch (err) {
      setSaveState("error");
      setError(err instanceof Error ? err.message : "Unable to save.");
    }
  }

  async function setStatus(status: RelationshipEventStatus) {
    if (!event) return;
    setSaveState("saving");
    setError(null);
    try {
      const res = await fetch(`/api/admin/client-relationship/events/${event.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: event.clientId,
          status,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        event?: OperatorRelationshipEventRow;
      };
      if (!res.ok || !json.success || !json.event) {
        throw new Error(json.error ?? "Unable to update status.");
      }
      setEvent(json.event);
      setForm(formFromEvent(json.event));
      setSaveState("saved");
      router.refresh();
    } catch (err) {
      setSaveState("error");
      setError(err instanceof Error ? err.message : "Unable to update status.");
    }
  }

  return (
    <OperationsShell activeId="events">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Relationship"
          title={event?.title ?? "Relationship event"}
          lead="Private operator engagement detail. Distinct from Timeline and Google Calendar."
        />

        <p className="kxd-os-meta" style={{ marginBottom: "1rem" }}>
          <Link href="/admin/operations/events" className="kxd-os-link-quiet">
            ← All events
          </Link>
          {" · "}
          <Link href="/admin/operations/clients" className="kxd-os-link-quiet">
            Client portfolio
          </Link>
        </p>

        {loading ? (
          <p className="kxd-os-meta" aria-live="polite">
            Loading event…
          </p>
        ) : loadError || !event ? (
          <p className="kxd-os-command-timeline-form__error" role="alert">
            {loadError ?? "Event not found."}
          </p>
        ) : editing ? (
          <RelationshipEventForm
            mode="edit"
            form={form}
            onChange={setForm}
            clients={clients}
            contacts={contacts}
            clientLocked
            saveState={saveState}
            error={error}
            onSubmit={save}
            onCancel={() => {
              setEditing(false);
              setForm(formFromEvent(event));
              setError(null);
              setSaveState("idle");
            }}
          />
        ) : (
          <div className="kxd-rel-events__detail">
            <div className="kxd-rel-events__detail-actions">
              <button
                type="button"
                className="kxd-os-btn kxd-os-btn--sm"
                onClick={() => {
                  setEditing(true);
                  setSaveState("idle");
                  setError(null);
                }}
              >
                Edit
              </button>
              <Link
                href={event.clientRelationshipHref}
                className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
              >
                Client relationship
              </Link>
              <Link href={event.clientHref} className="kxd-os-link-quiet">
                Client workspace →
              </Link>
              <Link href={event.payloadHref} className="kxd-os-link-quiet">
                Payload →
              </Link>
            </div>

            <dl className="kxd-rel-events__dl">
              <div>
                <dt>Client</dt>
                <dd>{event.clientName}</dd>
              </div>
              <div>
                <dt>When</dt>
                <dd>{fmtWorkspaceDateTime(event.eventAt)}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{event.eventCategoryLabel}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{event.statusLabel}</dd>
              </div>
              {event.location ? (
                <div>
                  <dt>Location</dt>
                  <dd className="kxd-rel-events__wrap">{event.location}</dd>
                </div>
              ) : null}
              <div>
                <dt>Contacts</dt>
                <dd>
                  {event.contactNames.length > 0
                    ? event.contactNames.join(", ")
                    : "None linked"}
                  {" · "}
                  <Link
                    href={event.clientRelationshipHref}
                    className="kxd-os-link-quiet"
                  >
                    Manage contacts on client relationship →
                  </Link>
                </dd>
              </div>
              {event.updatedAt ? (
                <div>
                  <dt>Updated</dt>
                  <dd>{fmtWorkspaceDateTime(event.updatedAt)}</dd>
                </div>
              ) : null}
            </dl>

            <div className="kxd-rel-events__status-actions" role="group" aria-label="Set status">
              <p className="kxd-os-meta">Status workflow</p>
              {(Object.keys(EVENT_STATUS_LABEL) as RelationshipEventStatus[]).map(
                (key) => (
                  <button
                    key={key}
                    type="button"
                    className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
                    disabled={event.status === key || saveState === "saving"}
                    onClick={() => setStatus(key)}
                    aria-pressed={event.status === key}
                  >
                    {EVENT_STATUS_LABEL[key]}
                    {event.status === key ? " (current)" : ""}
                  </button>
                ),
              )}
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

            <section className="kxd-rel-events__notes">
              <h2 className="kxd-os-workspace-chapter__title">Private context</h2>
              <p className="kxd-os-workspace-prose kxd-rel-events__wrap">
                {event.contextNotes || "—"}
              </p>
            </section>
            <section className="kxd-rel-events__notes">
              <h2 className="kxd-os-workspace-chapter__title">Follow-up notes</h2>
              <p className="kxd-os-workspace-prose kxd-rel-events__wrap">
                {event.followUpNotes || "—"}
              </p>
            </section>
            {(event.dietaryNotes || event.accessibilityNotes) && (
              <section className="kxd-rel-events__notes">
                <h2 className="kxd-os-workspace-chapter__title">Operational notes</h2>
                <p className="kxd-os-workspace-prose kxd-rel-events__wrap">
                  {event.dietaryNotes ? `Dietary: ${event.dietaryNotes}` : null}
                  {event.dietaryNotes && event.accessibilityNotes ? " · " : null}
                  {event.accessibilityNotes
                    ? `Accessibility: ${event.accessibilityNotes}`
                    : null}
                </p>
              </section>
            )}
            <p className="kxd-os-meta">
              No hard delete — mark cancelled when the engagement is no longer active.
            </p>
          </div>
        )}
      </KxdPage>
    </OperationsShell>
  );
}
