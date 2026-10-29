"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsSectionHead,
  OpsStatusBadge,
} from "@/components/admin/operations/shared/OpsBriefing";
import { KxdPage } from "@/components/os";
import type { OutreachKind } from "@/lib/sales/follow-up-policy";
import type { StaffSalesDetailData } from "@/lib/staff/sales/types";

const OUTREACH_ACTIONS: Array<{ kind: OutreachKind; label: string }> = [
  { kind: "email", label: "Email" },
  { kind: "call", label: "Call" },
  { kind: "meeting", label: "Log meeting (outreach)" },
  { kind: "note", label: "Note" },
  { kind: "follow-up", label: "Follow-up" },
];

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function StaffSalesDetailScreen({ data }: { data: StaffSalesDetailData }) {
  const router = useRouter();
  const p = data.prospect;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState(p.notes ?? "");
  const [status, setStatus] = useState(p.status);
  const [nextAction, setNextAction] = useState(p.nextAction);
  const [nextFollowUp, setNextFollowUp] = useState(toLocalInput(p.nextFollowUp));
  const [nextActionNote, setNextActionNote] = useState(p.nextActionNote ?? "");

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/staff/sales/leads/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !payload.success) {
        setError(payload.error ?? "Update failed.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function saveQualification(e: React.FormEvent) {
    e.preventDefault();
    await patch({
      notes,
      status,
      nextAction,
      nextActionNote,
      nextFollowUp: nextFollowUp ? new Date(nextFollowUp).toISOString() : null,
    });
  }

  async function logOutreach(kind: OutreachKind) {
    const summary =
      kind === "note" || kind === "follow-up"
        ? window.prompt("Brief summary (optional)") ?? ""
        : "";
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/staff/sales/leads/${p.id}/outreach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          summary: summary || undefined,
          nextAction,
          nextFollowUp: nextFollowUp ? new Date(nextFollowUp).toISOString() : undefined,
        }),
      });
      const payload = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !payload.success) {
        setError(payload.error ?? "Could not log outreach.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const readOnly = p.isOperatorControlled;

  return (
    <OperationsShell activeId="staff-sales" variant="staff">
      <KxdPage className="kxd-os-page--ops kxd-os-page--staff">
        <OperationsPageHero
          eyebrow="Prospect"
          title={p.companyName}
          lead={`${p.contactName}${p.email ? ` · ${p.email}` : ""}`}
        />

        <p className="kxd-os-meta" style={{ marginBottom: "1.25rem" }}>
          <Link href="/admin/operations/staff/sales" className="kxd-os-link-quiet">
            All prospects
          </Link>
        </p>

        {readOnly ? (
          <div style={{ marginBottom: "1rem" }}>
          <OpsCard className="kxd-os-ops-card-padding">
            <OpsStatusBadge label="Operator commercial stage" variant="pending" />
            <p style={{ marginTop: "0.75rem" }}>
              This opportunity is in a commercial stage Matt owns. You can review history here;
              edits and outreach are locked until Matt moves it back or reassigns scope.
            </p>
          </OpsCard>
          </div>
        ) : null}

        {p.attentionLabel ? (
          <p className="kxd-os-meta" style={{ marginBottom: "1rem" }}>
            <OpsStatusBadge label={p.attentionLabel} variant="warning" />
            {" · "}
            {p.nextActionLabel}
            {p.nextFollowUp
              ? ` · Follow-up ${new Date(p.nextFollowUp).toLocaleString()}`
              : ""}
          </p>
        ) : null}

        {!readOnly ? (
          <div style={{ marginBottom: "1.5rem" }}>
          <OpsCard className="kxd-os-ops-card-padding">
            <OpsSectionHead label="Record outreach" />
            <p className="kxd-os-meta" style={{ marginBottom: "0.75rem" }}>
              Log what you did — this builds the timeline Matt sees before discovery.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {OUTREACH_ACTIONS.map((action) => (
                <button
                  key={action.kind}
                  type="button"
                  className="kxd-os-btn kxd-os-btn--secondary"
                  disabled={busy}
                  onClick={() => logOutreach(action.kind)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </OpsCard>
          </div>
        ) : null}

        <div style={{ marginBottom: "1.5rem" }}>
        <OpsCard className="kxd-os-ops-card-padding">
          <OpsSectionHead label="Qualification & follow-up" />
          {readOnly ? (
            <p className="kxd-os-body">{p.notes || "No qualification notes."}</p>
          ) : (
            <form onSubmit={saveQualification}>
              <div className="kxd-os-form-stack">
                <label className="kxd-os-field">
                  <span className="kxd-os-field__label">Stage (early pipeline only)</span>
                  <select
                    className="kxd-os-input"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {data.allowedStatuses.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </label>
                <label className="kxd-os-field">
                  <span className="kxd-os-field__label">Next action</span>
                  <select
                    className="kxd-os-input"
                    value={nextAction}
                    onChange={(e) => setNextAction(e.target.value as typeof nextAction)}
                  >
                    {data.allowedNextActions.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </label>
                <label className="kxd-os-field">
                  <span className="kxd-os-field__label">Follow-up date</span>
                  <input
                    className="kxd-os-input"
                    type="datetime-local"
                    value={nextFollowUp}
                    onChange={(e) => setNextFollowUp(e.target.value)}
                  />
                </label>
                <label className="kxd-os-field">
                  <span className="kxd-os-field__label">Next action note</span>
                  <input
                    className="kxd-os-input"
                    value={nextActionNote}
                    onChange={(e) => setNextActionNote(e.target.value)}
                  />
                </label>
                <label className="kxd-os-field">
                  <span className="kxd-os-field__label">Qualification notes</span>
                  <textarea
                    className="kxd-os-input"
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
                {error ? (
                  <p className="kxd-os-meta" style={{ color: "var(--kxd-critical)" }}>{error}</p>
                ) : null}
                <button type="submit" className="kxd-os-btn" disabled={busy}>
                  {busy ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          )}
        </OpsCard>
        </div>

        <section aria-label="Activity history">
          <OpsSectionHead label="Activity" count={data.activities.length} />
          <OpsCard className="kxd-os-ops-card-padding">
            {data.activities.length === 0 ? (
              <p className="kxd-os-meta">No activity logged yet.</p>
            ) : (
              <ul className="kxd-os-ops-list-plain">
                {data.activities.map((a) => (
                  <li key={a.id} style={{ marginBottom: "0.85rem" }}>
                    <p className="kxd-os-card__title">{a.title}</p>
                    <p className="kxd-os-meta">
                      {new Date(a.occurredAt).toLocaleString()} · {a.activityType}
                    </p>
                    {a.summary ? (
                      <p className="kxd-os-body" style={{ marginTop: "0.35rem" }}>{a.summary}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </OpsCard>
        </section>
      </KxdPage>
    </OperationsShell>
  );
}
