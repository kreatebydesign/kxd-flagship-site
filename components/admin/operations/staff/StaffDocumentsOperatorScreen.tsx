"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsListRow,
  OpsSectionHead,
  OpsStatusBadge,
} from "@/components/admin/operations/shared/OpsBriefing";
import { KxdButton, KxdPage } from "@/components/os";
import { operatorStaffDocumentPath } from "@/lib/staff-documents/access";
import {
  staffDocumentKindLabel,
  staffDocumentStatusBadge,
} from "@/lib/staff-documents/display";
import type { StaffDocumentListItem, StaffDocumentTemplateStatus } from "@/lib/staff-documents/types";

type TemplateRow = {
  id: number;
  title: string;
  version: number;
  kind: StaffDocumentListItem["kind"];
  signingMode: StaffDocumentListItem["signingMode"];
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
  countersignQueue: AssignmentRow[];
  staffUsers: Array<{ id: number; label: string }>;
}) {
  const router = useRouter();
  const [staffUserId, setStaffUserId] = useState(props.staffUsers[0]?.id ?? 0);
  const [templateId, setTemplateId] = useState(
    props.templates.find((t) => t.status === "approved-for-use")?.id ?? 0,
  );
  const [sampleKind, setSampleKind] = useState<"policy-acknowledgment" | "employment-agreement">(
    "policy-acknowledgment",
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
        body: JSON.stringify({ useSample: true, kind: sampleKind }),
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
      <KxdPage className="kxd-os-page--ops kxd-os-page--staff-documents-operator">
        <OperationsPageHero
          eyebrow="Staff oversight"
          title="Staff documents"
          lead="Approve templates, assign policies and agreements, and countersign employee-signed documents. Use nonbinding samples for testing only."
        />

        {error ? (
          <p
            className="kxd-os-meta"
            style={{ color: "var(--kxd-os-critical)", marginBottom: "1rem" }}
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <section className="kxd-os-staff-docs-operator__section" aria-label="Countersignature queue">
          <OpsSectionHead label="Countersignature queue" count={props.countersignQueue.length} />
          <OpsCard>
            {props.countersignQueue.length === 0 ? (
              <p className="kxd-os-meta kxd-os-ops-card-padding">No documents awaiting KXD signature.</p>
            ) : (
              props.countersignQueue.map((row) => {
                const badge = staffDocumentStatusBadge({
                  status: row.status,
                  signingMode: row.signingMode,
                });
                return (
                  <OpsListRow key={row.id} href={operatorStaffDocumentPath(row.id)}>
                    <div className="kxd-os-ops-list-row__main">
                      <div className="kxd-os-ops-list-row__head">
                        <p className="kxd-os-ops-list-row__title">{row.title}</p>
                        <OpsStatusBadge label={badge.label} variant={badge.variant} />
                      </div>
                      <p className="kxd-os-meta">
                        {row.staffLabel} · {staffDocumentKindLabel(row.kind)}
                      </p>
                    </div>
                  </OpsListRow>
                );
              })
            )}
          </OpsCard>
        </section>

        <section className="kxd-os-staff-docs-operator__section" aria-label="Templates">
          <OpsSectionHead label="Templates" count={props.templates.length} />
          <OpsCard className="kxd-os-ops-card-padding">
            <label className="kxd-os-field" style={{ display: "block", maxWidth: "20rem" }}>
              <span className="kxd-os-field__label">Sample template type (test)</span>
              <select
                className="kxd-os-input"
                value={sampleKind}
                onChange={(e) =>
                  setSampleKind(e.target.value as "policy-acknowledgment" | "employment-agreement")
                }
              >
                <option value="policy-acknowledgment">Policy acknowledgment</option>
                <option value="employment-agreement">Employment agreement (dual signature)</option>
              </select>
            </label>
            <KxdButton
              type="button"
              variant="secondary"
              style={{ marginTop: "0.75rem" }}
              disabled={busy === "sample"}
              onClick={() => void createSampleTemplate()}
            >
              Create sample nonbinding template
            </KxdButton>
            <ul className="kxd-os-staff-docs-operator__template-list">
              {props.templates.map((t) => (
                <li key={t.id}>
                  <span className="kxd-os-meta">
                    {t.title} · {staffDocumentKindLabel(t.kind)} · v{t.version} · {t.status}
                  </span>
                </li>
              ))}
            </ul>
          </OpsCard>
        </section>

        <section className="kxd-os-staff-docs-operator__section" aria-label="Assign document">
          <OpsSectionHead label="Assign to employee" />
          <OpsCard className="kxd-os-ops-card-padding">
            <label className="kxd-os-field kxd-os-staff-docs-operator__field">
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
            <label className="kxd-os-field kxd-os-staff-docs-operator__field">
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
                      {t.title} ({staffDocumentKindLabel(t.kind)})
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
        </section>

        <section className="kxd-os-staff-docs-operator__section" aria-label="Assignments">
          <OpsSectionHead label="Assignments" count={props.assignments.length} />
          <OpsCard>
            {props.assignments.map((row) => {
              const badge = staffDocumentStatusBadge({
                status: row.status,
                signingMode: row.signingMode,
              });
              const href =
                row.signingMode === "dual-signature"
                  ? operatorStaffDocumentPath(row.id)
                  : undefined;
              const inner = (
                <div className="kxd-os-ops-list-row__main">
                  <div className="kxd-os-ops-list-row__head">
                    <p className="kxd-os-ops-list-row__title">{row.title}</p>
                    <OpsStatusBadge label={badge.label} variant={badge.variant} />
                  </div>
                  <p className="kxd-os-meta">
                    {row.staffLabel} · {staffDocumentKindLabel(row.kind)}
                  </p>
                </div>
              );
              return href ? (
                <OpsListRow key={row.id} href={href}>{inner}</OpsListRow>
              ) : (
                <div key={row.id} className="kxd-os-ops-list-row">{inner}</div>
              );
            })}
          </OpsCard>
        </section>

        <p className="kxd-os-meta" style={{ marginTop: "1.25rem" }}>
          <Link href="/admin/operations/staff/oversight" className="kxd-os-link-quiet">
            Back to oversight
          </Link>
        </p>
      </KxdPage>
    </OperationsShell>
  );
}
