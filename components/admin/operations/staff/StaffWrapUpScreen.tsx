"use client";

import Link from "next/link";
import { useState } from "react";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsSectionHead,
} from "@/components/admin/operations/shared/OpsBriefing";
import { KxdPage } from "@/components/os";
import type { StaffWrapUpData } from "@/lib/staff/types";

export interface StaffWrapUpScreenProps {
  data: StaffWrapUpData;
  canAct: boolean;
  isPreview: boolean;
}

function ListBlock({
  title,
  items,
}: {
  title: string;
  items: Array<{ title: string; detail?: string }>;
}) {
  return (
    <section style={{ marginTop: "1.5rem" }}>
      <OpsSectionHead label={title} count={items.length} />
      <OpsCard>
        {items.length === 0 ? (
          <p className="kxd-os-meta">None.</p>
        ) : (
          items.map((item, index) => (
            <div key={`${item.title}-${index}`} className="kxd-os-ops-list-row">
              <div className="kxd-os-ops-list-row__main">
                <p className="kxd-os-ops-list-row__title">{item.title}</p>
                {item.detail ? <p className="kxd-os-meta">{item.detail}</p> : null}
              </div>
            </div>
          ))
        )}
      </OpsCard>
    </section>
  );
}

export function StaffWrapUpScreen({
  data,
  canAct,
  isPreview,
}: StaffWrapUpScreenProps) {
  const [note, setNote] = useState(data.savedNote ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveNote() {
    if (!canAct || isPreview) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/staff/wrap-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteForMatt: note }),
      });
      const payload = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || payload.success === false) {
        throw new Error(payload.error ?? "Could not save wrap-up note.");
      }
      setMessage("Wrap-up note saved for Matt. Work items were not changed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save wrap-up note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <OperationsShell activeId="staff" variant="staff">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="End of day"
          title="Wrap up today"
          lead={`${data.dateLabel}. Review what moved — without silently finishing unfinished work.`}
        />

        <ListBlock
          title="Completed today"
          items={data.completedToday.map((row) => ({ title: row.title }))}
        />
        <ListBlock
          title="Prepared for Matt"
          items={data.preparedForMatt.map((row) => ({
            title: row.title,
            detail: row.submittedAt
              ? `Updated ${new Date(row.submittedAt).toLocaleString()}`
              : undefined,
          }))}
        />
        <ListBlock
          title="Still underway"
          items={data.underway.map((row) => ({
            title: row.title,
            detail: `Status: ${row.status}`,
          }))}
        />
        <ListBlock
          title="Blockers"
          items={data.blockers.map((row) => ({
            title: row.title,
            detail: row.detail,
          }))}
        />
        <ListBlock
          title="Moving to tomorrow"
          items={data.movingToTomorrow.map((row) => ({
            title: row.title,
            detail: row.reason,
          }))}
        />

        <section style={{ marginTop: "1.5rem" }}>
          <OpsSectionHead label="Optional note for Matt" />
          <OpsCard className="kxd-os-ops-card-padding">
            <label className="kxd-os-meta" htmlFor="wrap-up-note">
              Internal summary only. This does not complete work or change dates.
            </label>
            <textarea
              id="wrap-up-note"
              className="kxd-os-input"
              style={{ width: "100%", minHeight: "7rem", marginTop: "0.75rem" }}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={!canAct || isPreview}
              placeholder="What Matt should know about today…"
            />
            {error ? (
              <p className="kxd-os-meta" style={{ color: "var(--kxd-os-critical)", marginTop: "0.75rem" }}>
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
                {message}
              </p>
            ) : null}
            <button
              type="button"
              className="kxd-os-btn kxd-os-btn--primary"
              style={{ marginTop: "1rem" }}
              disabled={!canAct || isPreview || saving || !note.trim()}
              onClick={saveNote}
            >
              {saving ? "Saving…" : "Save note for Matt"}
            </button>
          </OpsCard>
        </section>

        <p className="kxd-os-meta" style={{ marginTop: "1.5rem" }}>
          <Link href="/admin/operations/staff" className="kxd-os-link-quiet">
            Return to daily plan
          </Link>
        </p>
      </KxdPage>
    </OperationsShell>
  );
}
