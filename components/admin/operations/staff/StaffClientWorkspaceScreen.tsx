"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsListRow,
  OpsSectionHead,
  OpsStatusBadge,
} from "@/components/admin/operations/shared/OpsBriefing";
import { StaffAskHelpControl } from "@/components/admin/operations/staff/StaffAskHelpControl";
import { KxdButton, KxdPage } from "@/components/os";
import type { StaffClientWorkspaceData } from "@/lib/staff/client-context/types";
import { STAFF_MY_CLIENTS_PATH } from "@/lib/staff/client-context/paths";
import { projectStatusLabel } from "@/lib/staff/client-context/safe-projection";
import type { StaffClientNoteRecord } from "@/lib/staff/client-notes/types";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function NoteRow({ note }: { note: StaffClientNoteRecord }) {
  return (
    <div className="kxd-os-ops-list-row" style={{ borderBottom: "1px solid var(--kxd-border-subtle)" }}>
      <div className="kxd-os-ops-list-row__main">
        <div className="kxd-os-ops-list-row__head">
          <p className="kxd-os-ops-list-row__title">
            {note.kind === "question" ? "Question" : "Internal note"}
          </p>
          <OpsStatusBadge
            label={note.kind === "question" ? "Question" : "Note"}
            variant={note.kind === "question" ? "pending" : "status"}
          />
        </div>
        <p className="kxd-os-meta">
          {note.authorDisplayName} · {formatWhen(note.createdAt)}
        </p>
        <p style={{ marginTop: "0.5rem", whiteSpace: "pre-wrap" }}>{note.body}</p>
      </div>
    </div>
  );
}

export function StaffClientWorkspaceScreen({ data }: { data: StaffClientWorkspaceData }) {
  const router = useRouter();
  const { summary, permissions } = data;
  const [notes, setNotes] = useState(data.notes);
  const [draft, setDraft] = useState("");
  const [kind, setKind] = useState<"note" | "question">("note");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pagePath = `${STAFF_MY_CLIENTS_PATH}/${summary.clientId}`;

  const submitNote = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/staff/client-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: summary.clientId,
          kind,
          body: draft,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        note?: StaffClientNoteRecord;
      };
      if (!res.ok || !json.success || !json.note) {
        setError(json.error ?? "Could not save note.");
        return;
      }
      setNotes((prev) => [json.note!, ...prev]);
      setDraft("");
      router.refresh();
    } catch {
      setError("Could not save note.");
    } finally {
      setBusy(false);
    }
  }, [draft, kind, router, summary.clientId]);

  return (
    <OperationsShell activeId="staff-my-clients" variant="staff">
      <KxdPage className="kxd-os-page--ops kxd-os-page--staff">
        <p className="kxd-os-meta" style={{ marginBottom: "0.75rem" }}>
          <Link href={STAFF_MY_CLIENTS_PATH} className="kxd-os-link-quiet">
            My clients
          </Link>
        </p>

        <OperationsPageHero
          eyebrow="Client workspace"
          title={summary.name}
          lead="Assignment-scoped context for delivery — contacts, projects, and your work. Financial and agreement details stay in the client workspace."
        />

        <div className="kxd-os-staff-plan-grid" style={{ marginTop: "1.5rem" }}>
          <div>
            <OpsSectionHead label="Contact" />
            <OpsCard className="kxd-os-ops-card-padding">
              {summary.contacts.length === 0 ? (
                <p className="kxd-os-meta">No approved contacts on file yet.</p>
              ) : (
                <ul className="kxd-os-meta" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {summary.contacts.map((contact, index) => (
                    <li key={`${contact.source}-${contact.id ?? index}`} style={{ marginBottom: "0.75rem" }}>
                      <strong>{contact.name}</strong>
                      {contact.roleTitle ? ` · ${contact.roleTitle}` : ""}
                      {contact.email ? (
                        <div>
                          <a href={`mailto:${contact.email}`} className="kxd-os-link-quiet">
                            {contact.email}
                          </a>
                        </div>
                      ) : null}
                      {contact.phone ? <div>{contact.phone}</div> : null}
                    </li>
                  ))}
                </ul>
              )}
            </OpsCard>

            <section style={{ marginTop: "1.5rem" }} aria-label="Links">
              <OpsSectionHead label="Links" />
              <OpsCard>
                {summary.projectLinks.length === 0 ? (
                  <p className="kxd-os-meta kxd-os-ops-card-padding">No project links recorded.</p>
                ) : (
                  summary.projectLinks.map((link) => (
                    <OpsListRow key={link.url} href={link.url}>
                      <div className="kxd-os-ops-list-row__main">
                        <p className="kxd-os-ops-list-row__title">{link.label}</p>
                        <p className="kxd-os-meta">{link.url}</p>
                      </div>
                    </OpsListRow>
                  ))
                )}
                {summary.portalHref ? (
                  <OpsListRow href={summary.portalHref}>
                    <div className="kxd-os-ops-list-row__main">
                      <p className="kxd-os-ops-list-row__title">Client portal</p>
                      <p className="kxd-os-meta">Open connected workspace (operator view)</p>
                    </div>
                  </OpsListRow>
                ) : null}
              </OpsCard>
            </section>

            <section style={{ marginTop: "1.5rem" }} aria-label="Project overview">
              <OpsSectionHead label="Project overview" />
              <OpsCard className="kxd-os-ops-card-padding">
                {summary.projectOverview ? (
                  <p style={{ whiteSpace: "pre-wrap" }}>{summary.projectOverview}</p>
                ) : (
                  <p className="kxd-os-meta">No project overview summary yet.</p>
                )}
                {summary.currentServices ? (
                  <div style={{ marginTop: "1rem" }}>
                    <p className="kxd-os-card__title">Current services</p>
                    <p style={{ whiteSpace: "pre-wrap", marginTop: "0.35rem" }}>
                      {summary.currentServices}
                    </p>
                  </div>
                ) : null}
                {summary.nextAction ? (
                  <div style={{ marginTop: "1rem" }}>
                    <p className="kxd-os-card__title">Studio next action</p>
                    <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
                      {summary.nextAction}
                      {summary.nextActionDueDate
                        ? ` · Due ${summary.nextActionDueDate.slice(0, 10)}`
                        : ""}
                    </p>
                  </div>
                ) : null}
              </OpsCard>
            </section>

            <section style={{ marginTop: "1.5rem" }} aria-label="Projects">
              <OpsSectionHead label="Projects" count={summary.projects.length} />
              <OpsCard>
                {summary.projects.length === 0 ? (
                  <p className="kxd-os-meta kxd-os-ops-card-padding">No delivery projects listed.</p>
                ) : (
                  summary.projects.map((project) => (
                    <div key={project.id} className="kxd-os-ops-list-row">
                      <div className="kxd-os-ops-list-row__main">
                        <div className="kxd-os-ops-list-row__head">
                          <p className="kxd-os-ops-list-row__title">{project.name}</p>
                          <OpsStatusBadge
                            label={projectStatusLabel(project.status)}
                            variant="status"
                          />
                        </div>
                        <p className="kxd-os-meta">
                          {project.projectType ?? "Project"}
                          {project.nextAction ? ` · Next: ${project.nextAction}` : ""}
                        </p>
                        {project.approvedNotes ? (
                          <p className="kxd-os-meta" style={{ marginTop: "0.5rem", whiteSpace: "pre-wrap" }}>
                            {project.approvedNotes}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </OpsCard>
            </section>
          </div>

          <div>
            <section aria-label="Your work">
              <OpsSectionHead label="Your assigned work" count={summary.assignedWork.length} />
              <OpsCard>
                {summary.assignedWork.length === 0 ? (
                  <p className="kxd-os-meta kxd-os-ops-card-padding">
                    No open work assigned for this client.
                  </p>
                ) : (
                  summary.assignedWork.map((work) => (
                    <OpsListRow key={work.id} href={work.href}>
                      <div className="kxd-os-ops-list-row__main">
                        <div className="kxd-os-ops-list-row__head">
                          <p className="kxd-os-ops-list-row__title">{work.title}</p>
                          <OpsStatusBadge label={work.status.replace(/-/g, " ")} variant="warning" />
                        </div>
                        {work.dueDate ? (
                          <p className="kxd-os-meta">Due {work.dueDate.slice(0, 10)}</p>
                        ) : null}
                        {work.instructions ? (
                          <p className="kxd-os-meta" style={{ marginTop: "0.5rem", whiteSpace: "pre-wrap" }}>
                            {work.instructions}
                          </p>
                        ) : null}
                      </div>
                    </OpsListRow>
                  ))
                )}
              </OpsCard>
            </section>

            <section style={{ marginTop: "1.5rem" }} aria-label="Internal notes">
              <OpsSectionHead label="Internal notes & questions" count={notes.length} />
              <OpsCard className="kxd-os-ops-card-padding">
                {permissions.canAddNotes ? (
                  <div style={{ marginBottom: "1.25rem" }}>
                    <label className="kxd-os-meta" htmlFor="staff-client-note-kind">
                      Type
                    </label>
                    <select
                      id="staff-client-note-kind"
                      className="kxd-os-input"
                      style={{ marginTop: "0.35rem", width: "100%", maxWidth: "16rem" }}
                      value={kind}
                      onChange={(e) => setKind(e.target.value === "question" ? "question" : "note")}
                      disabled={busy}
                    >
                      <option value="note">Internal note</option>
                      <option value="question">Question for Matt</option>
                    </select>
                    <label className="kxd-os-meta" htmlFor="staff-client-note-body" style={{ display: "block", marginTop: "0.75rem" }}>
                      Write a note
                    </label>
                    <textarea
                      id="staff-client-note-body"
                      className="kxd-os-input"
                      rows={4}
                      style={{ marginTop: "0.35rem", width: "100%" }}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      disabled={busy}
                      placeholder="Facts, context, or a clear question. Matt sees this in the executive client workspace."
                    />
                    {error ? (
                      <p className="kxd-os-meta" style={{ color: "var(--kxd-critical)", marginTop: "0.5rem" }}>
                        {error}
                      </p>
                    ) : null}
                    <KxdButton
                      type="button"
                      variant="primary"
                      style={{ marginTop: "0.75rem" }}
                      disabled={busy || draft.trim().length < 4}
                      onClick={() => void submitNote()}
                    >
                      {busy ? "Saving…" : "Save note"}
                    </KxdButton>
                  </div>
                ) : null}

                {notes.length === 0 ? (
                  <p className="kxd-os-meta">No internal notes yet.</p>
                ) : (
                  notes.map((note) => <NoteRow key={note.id} note={note} />)
                )}
              </OpsCard>
            </section>

            <section style={{ marginTop: "1.5rem" }} aria-label="Ask for help">
              <OpsSectionHead label="Request Matt's input" />
              <OpsCard className="kxd-os-ops-card-padding">
                <p className="kxd-os-meta" style={{ marginBottom: "0.75rem" }}>
                  For decisions or blockers, use the help flow. Client context is attached automatically.
                </p>
                <StaffAskHelpControl
                  pagePath={pagePath}
                  clientId={summary.clientId}
                  clientLabel={permissions.clientLabel}
                  canAct={permissions.canAct}
                  preferWorkspace={false}
                  contextLabel={summary.name}
                  contextKind="operations"
                  mode="matt"
                />
              </OpsCard>
            </section>
          </div>
        </div>
      </KxdPage>
    </OperationsShell>
  );
}
