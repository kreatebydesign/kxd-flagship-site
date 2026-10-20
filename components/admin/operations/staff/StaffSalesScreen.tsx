"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsEmpty,
  OpsKpiStrip,
  OpsListRow,
  OpsSectionHead,
  OpsStatusBadge,
} from "@/components/admin/operations/shared/OpsBriefing";
import { KxdPage } from "@/components/os";
import type { StaffSalesListData, StaffSalesProspectRow } from "@/lib/staff/sales/types";

function attentionVariant(
  kind: StaffSalesProspectRow["attentionKind"],
): "default" | "pending" | "warning" | "success" | "status" | "critical" {
  if (kind === "overdue" || kind === "overdue-response") return "critical";
  if (kind === "respond-today" || kind === "due-today") return "warning";
  if (kind === "stale") return "pending";
  return "default";
}

function fmtFollowUp(iso: string | null): string {
  if (!iso) return "No follow-up set";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtMoney(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function ProspectRow({ row }: { row: StaffSalesProspectRow }) {
  return (
    <OpsListRow href={row.href}>
      <div className="kxd-os-ops-list-row__main">
        <div className="kxd-os-ops-list-row__head">
          <p className="kxd-os-ops-list-row__title">{row.companyName}</p>
          {row.attentionLabel ? (
            <OpsStatusBadge label={row.attentionLabel} variant={attentionVariant(row.attentionKind)} />
          ) : (
            <OpsStatusBadge label={row.statusLabel} variant="status" />
          )}
        </div>
        <p className="kxd-os-meta">
          {row.contactName}
          {row.email ? ` · ${row.email}` : ""}
        </p>
        <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
          {row.nextActionLabel} · Follow-up {fmtFollowUp(row.nextFollowUp)}
          {row.estimatedValue != null ? ` · ${fmtMoney(row.estimatedValue)} est.` : ""}
        </p>
      </div>
    </OpsListRow>
  );
}

export function StaffSalesScreen({ data }: { data: StaffSalesListData }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    website: "",
    estimatedValue: "",
    notes: "",
  });

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/staff/sales/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName,
          contactName: form.contactName,
          email: form.email || undefined,
          website: form.website || undefined,
          notes: form.notes || undefined,
          estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
        }),
      });
      const payload = (await res.json()) as {
        success?: boolean;
        error?: string;
        id?: number;
        href?: string;
      };
      if (!res.ok || !payload.success || !payload.id) {
        setError(payload.error ?? "Could not create prospect.");
        return;
      }
      router.push(payload.href ?? `/admin/operations/staff/sales/${payload.id}`);
      router.refresh();
    } catch {
      setError("Could not create prospect.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <OperationsShell activeId="staff-sales" variant="staff">
      <KxdPage className="kxd-os-page--ops kxd-os-page--staff">
        <OperationsPageHero
          eyebrow="Business development"
          title="Sales development"
          lead="Your prospects, outreach, and follow-ups — scoped to you. Pricing, proposals, and closing stay with Matt."
        />

        <p className="kxd-os-meta" style={{ marginBottom: "1.25rem" }}>
          <Link href="/admin/operations/staff" className="kxd-os-link-quiet">
            Staff home
          </Link>
          {" · "}
          <Link href="/admin/operations/staff/my-work" className="kxd-os-link-quiet">
            My work
          </Link>
        </p>

        <OpsKpiStrip
          items={[
            { label: "Your prospects", value: String(data.counts.total), sub: "In your scope" },
            { label: "Open", value: String(data.counts.open), sub: "Active opportunities" },
            {
              label: "Needs attention",
              value: String(data.attention.length),
              sub: "Overdue or due today",
            },
            {
              label: "Due today",
              value: String(data.counts.dueToday),
              sub: "Follow-ups",
            },
          ]}
        />

        <div style={{ marginTop: "1.5rem", marginBottom: "1rem" }}>
          <button
            type="button"
            className="kxd-os-btn"
            onClick={() => setShowCreate((v) => !v)}
          >
            {showCreate ? "Cancel" : "New prospect"}
          </button>
        </div>

        {showCreate ? (
          <div style={{ marginBottom: "1.5rem" }}>
          <OpsCard className="kxd-os-ops-card-padding">
            <OpsSectionHead label="Create prospect" />
            <form onSubmit={submitCreate} className="kxd-os-form-stack">
              <label className="kxd-os-field">
                <span className="kxd-os-field__label">Organization</span>
                <input
                  className="kxd-os-input"
                  required
                  value={form.companyName}
                  onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                />
              </label>
              <label className="kxd-os-field">
                <span className="kxd-os-field__label">Primary contact</span>
                <input
                  className="kxd-os-input"
                  required
                  value={form.contactName}
                  onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                />
              </label>
              <label className="kxd-os-field">
                <span className="kxd-os-field__label">Email</span>
                <input
                  className="kxd-os-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </label>
              <label className="kxd-os-field">
                <span className="kxd-os-field__label">Website</span>
                <input
                  className="kxd-os-input"
                  value={form.website}
                  onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                />
              </label>
              <label className="kxd-os-field">
                <span className="kxd-os-field__label">
                  Preliminary estimate ($) — Matt approves pricing
                </span>
                <input
                  className="kxd-os-input"
                  inputMode="numeric"
                  value={form.estimatedValue}
                  onChange={(e) => setForm((f) => ({ ...f, estimatedValue: e.target.value }))}
                />
              </label>
              <label className="kxd-os-field">
                <span className="kxd-os-field__label">Qualification notes</span>
                <textarea
                  className="kxd-os-input"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </label>
              {error ? (
                <p className="kxd-os-meta" style={{ color: "var(--kxd-critical)" }}>{error}</p>
              ) : null}
              <button type="submit" className="kxd-os-btn" disabled={busy}>
                {busy ? "Saving…" : "Save prospect"}
              </button>
            </form>
          </OpsCard>
          </div>
        ) : null}

        {data.attention.length > 0 ? (
          <section style={{ marginBottom: "1.5rem" }} aria-label="Needs attention">
            <OpsSectionHead label="Needs attention" count={data.attention.length} />
            <OpsCard>
              {data.attention.map((row) => (
                <ProspectRow key={`attn-${row.id}`} row={row} />
              ))}
            </OpsCard>
          </section>
        ) : null}

        <section aria-label="All prospects">
          <OpsSectionHead label="Your prospects" count={data.prospects.length} />
          {data.prospects.length === 0 ? (
            <OpsCard className="kxd-os-ops-card-padding">
              <OpsEmpty message="No prospects yet" />
              <p style={{ marginTop: "0.75rem" }}>
                Add a qualified prospect when you have a real $7.5k–$20k+ website opportunity.
                Log every outreach here so Matt can see history before discovery calls.
              </p>
            </OpsCard>
          ) : (
            <OpsCard>
              {data.prospects.map((row) => (
                <ProspectRow key={row.id} row={row} />
              ))}
            </OpsCard>
          )}
        </section>
      </KxdPage>
    </OperationsShell>
  );
}
