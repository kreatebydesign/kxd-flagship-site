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
import { KxdButton, KxdPage } from "@/components/os";
import type { StaffDocumentListItem, StaffDocumentTemplateStatus } from "@/lib/staff-documents/types";

type TemplateRow = {
  id: number;
  title: string;
  version: number;
  status: StaffDocumentTemplateStatus;
  contentHash: string;
};

type AssignmentRow = StaffDocumentListItem & {
  staffUserId: number;
  staffLabel: string;
};

export function StaffDocumentsOperatorScreen(props: {
  templates: TemplateRow[];
  assignments: AssignmentRow[];
  staffUsers: Array<{ id: number; label: string }>;
}) {
  const router = useRouter();
  const [staffUserId, setStaffUserId] = useState(props.staffUsers[0]?.id ?? 0);
  const [templateId, setTemplateId] = useState(
    props.templates.find((t) => t.status === "approved-for-use")?.id ?? 0,
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createSampleTemplate() {
    setBusy("sample");
    setError(null);
    try {
      const res = await fetch("/api/admin/staff/documents/operator/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useSample: true }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string; id?: number };
      if (!res.ok || !data.success) throw new Error(data.error ?? "Failed.");
      if (data.id) {
        await fetch("/api/admin/staff/documents/operator/templates", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId: data.id, status: "approved-for-use" }),
        });
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(null);
    }
  }

  async function assignDocument() {
    setBusy("assign");
    setError(null);
    try {
      const res = await fetch("/api/admin/staff/documents/operator/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, staffUserId }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error ?? "Failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <OperationsShell activeId="staff" variant="full">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="Staff oversight"
          title="Staff documents"
          lead="Release A — policy acknowledgment only. Use the nonbinding sample for testing. Employment agreements and NDAs are not available yet."
        />

        {error ? (
          <p className="kxd-os-meta" style={{ color: "var(--kxd-os-critical)", marginBottom: "1rem" }}>
            {error}
          </p>
        ) : null}

        <OpsSectionHead label="Templates" count={props.templates.length} />
        <div style={{ marginBottom: "1.5rem" }}>
        <OpsCard className="kxd-os-ops-card-padding">
          <KxdButton
            type="button"
            variant="secondary"
            disabled={busy === "sample"}
            onClick={() => void createSampleTemplate()}
          >
            Create sample nonbinding template (test)
          </KxdButton>
          <ul style={{ marginTop: "1rem", listStyle: "none", padding: 0 }}>
            {props.templates.map((t) => (
              <li key={t.id} style={{ marginBottom: "0.5rem" }}>
                <span className="kxd-os-meta">
                  {t.title} · v{t.version} · {t.status}
                </span>
              </li>
            ))}
          </ul>
        </OpsCard>
        </div>

        <OpsSectionHead label="Assign to employee" />
        <div style={{ marginBottom: "1.5rem" }}>
        <OpsCard className="kxd-os-ops-card-padding">
          <label className="kxd-os-field" style={{ display: "block" }}>
            <span className="kxd-os-field__label">Staff user</span>
            <select
              className="kxd-os-input"
              value={staffUserId}
              onChange={(e) => setStaffUserId(Number(e.target.value))}
            >
              {props.staffUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </label>
          <label className="kxd-os-field" style={{ display: "block", marginTop: "0.75rem" }}>
            <span className="kxd-os-field__label">Approved template</span>
            <select
              className="kxd-os-input"
              value={templateId}
              onChange={(e) => setTemplateId(Number(e.target.value))}
            >
              {props.templates
                .filter((t) => t.status === "approved-for-use")
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
            </select>
          </label>
          <KxdButton
            type="button"
            variant="primary"
            style={{ marginTop: "1rem" }}
            disabled={busy === "assign" || !templateId || !staffUserId}
            onClick={() => void assignDocument()}
          >
            Assign document
          </KxdButton>
        </OpsCard>
        </div>

        <OpsSectionHead label="Assignments" count={props.assignments.length} />
        <OpsCard>
          {props.assignments.map((row) => (
            <div key={row.id} className="kxd-os-ops-list-row">
              <div className="kxd-os-ops-list-row__main">
                <div className="kxd-os-ops-list-row__head">
                  <p className="kxd-os-ops-list-row__title">{row.title}</p>
                  <OpsStatusBadge label={row.status} variant={row.status === "assigned" ? "warning" : "success"} />
                </div>
                <p className="kxd-os-meta">{row.staffLabel}</p>
              </div>
            </div>
          ))}
        </OpsCard>

        <p className="kxd-os-meta" style={{ marginTop: "1.25rem" }}>
          <Link href="/admin/operations/staff/oversight" className="kxd-os-link-quiet">
            Back to oversight
          </Link>
        </p>
      </KxdPage>
    </OperationsShell>
  );
}
