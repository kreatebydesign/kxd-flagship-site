"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsListRow,
  OpsSectionHead,
  OpsStatusBadge,
} from "@/components/admin/operations/shared/OpsBriefing";
import { KxdButton, KxdPage } from "@/components/os";
import {
  operatorStaffDocumentPath,
  operatorStaffDocumentTemplateNewPath,
  operatorStaffDocumentTemplatePath,
} from "@/lib/staff-documents/access";
import {
  staffDocumentAssignmentNextAction,
  staffDocumentKindLabel,
  staffDocumentKindOperatorLabel,
  staffDocumentStatusBadge,
  staffDocumentTemplateStatusLabel,
} from "@/lib/staff-documents/display";
import type {
  StaffDocumentListItem,
  StaffDocumentTemplateOperatorListItem,
} from "@/lib/staff-documents/types";

type AssignmentRow = StaffDocumentListItem & {
  staffUserId: number;
  staffLabel: string;
};

export function StaffDocumentsOperatorScreen(props: {
  templates: StaffDocumentTemplateOperatorListItem[];
  assignments: AssignmentRow[];
  countersignQueue: AssignmentRow[];
  staffUsers: Array<{ id: number; label: string }>;
}) {
  const router = useRouter();
  const assignableTemplates = useMemo(
    () => props.templates.filter((t) => t.assignable),
    [props.templates],
  );
  const [staffUserId, setStaffUserId] = useState(props.staffUsers[0]?.id ?? 0);
  const [templateId, setTemplateId] = useState(assignableTemplates[0]?.id ?? 0);
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
          lead="Create and approve real employee templates, assign counsel-reviewed documents, and countersign completed agreements. QA samples remain separate from assignable templates."
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
          <OpsSectionHead label="Document templates" count={props.templates.length} />
          <OpsCard className="kxd-os-ops-card-padding">
            <Link
              href={operatorStaffDocumentTemplateNewPath()}
              className="kxd-os-btn kxd-os-btn--primary"
            >
              New real template
            </Link>
            <ul className="kxd-os-staff-docs-operator__template-list">
              {props.templates.map((t) => (
                <li key={t.id}>
                  <Link
                    href={operatorStaffDocumentTemplatePath(t.id)}
                    className="kxd-os-link-quiet"
                  >
                    {t.title}
                  </Link>
                  <span className="kxd-os-meta">
                    {" "}
                    · {staffDocumentKindOperatorLabel(t.kind)} · v{t.version} ·{" "}
                    {staffDocumentTemplateStatusLabel(t.status)}
                    {t.isSample ? " · QA sample" : ""}
                    {t.assignable ? " · Assignable" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </OpsCard>
        </section>

        <section
          className="kxd-os-staff-docs-operator__section"
          aria-label="QA samples"
        >
          <OpsSectionHead label="QA samples (non-assignable)" />
          <OpsCard className="kxd-os-ops-card-padding">
            <p className="kxd-os-meta" style={{ marginBottom: "0.75rem" }}>
              Samples stay in draft for flow testing. They cannot be approved for production use or
              assigned to staff.
            </p>
            <label className="kxd-os-field" style={{ display: "block", maxWidth: "20rem" }}>
              <span className="kxd-os-field__label">Sample template type</span>
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
              Create sample template (draft)
            </KxdButton>
          </OpsCard>
        </section>

        <section className="kxd-os-staff-docs-operator__section" aria-label="Assign document">
          <OpsSectionHead label="Assign to employee" />
          <OpsCard className="kxd-os-ops-card-padding">
            {assignableTemplates.length === 0 ? (
              <p className="kxd-os-meta">
                No approved assignable templates yet. Complete legal review and approval on a real
                template first.
              </p>
            ) : (
              <>
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
                    {assignableTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({staffDocumentKindOperatorLabel(t.kind)})
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
              </>
            )}
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
              const nextAction = staffDocumentAssignmentNextAction({
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
                    {row.staffLabel} · {staffDocumentKindLabel(row.kind)} · {nextAction}
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
