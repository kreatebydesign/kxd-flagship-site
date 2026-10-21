"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AgreementDocumentBody } from "@/components/agreement/AgreementDocumentBody";
import { KxdAgreementDocument } from "@/components/agreement/KxdAgreementDocument";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { OpsCard, OpsSectionHead, OpsStatusBadge } from "@/components/admin/operations/shared/OpsBriefing";
import { KxdButton, KxdPage } from "@/components/os";
import {
  operatorStaffDocumentTemplateNewPath,
  operatorStaffDocumentsPath,
} from "@/lib/staff-documents/access";
import {
  staffDocumentKindOperatorLabel,
  staffDocumentTemplateStatusLabel,
} from "@/lib/staff-documents/display";
import {
  STAFF_DOCUMENT_DEFAULT_LEGAL_ENTITY,
  STAFF_DOCUMENT_OPERATOR_TEMPLATE_KINDS,
  type StaffDocumentKind,
  type StaffDocumentTemplateOperatorDetail,
  type StaffDocumentTemplateStatus,
} from "@/lib/staff-documents/types";

function previewEyebrow(kind: StaffDocumentKind, signingMode: string): string {
  if (signingMode === "dual-signature") return "Staff agreement";
  if (kind === "staff-policy") return "Information security policy";
  return "Staff policy";
}

export function StaffDocumentTemplateEditorScreen(props: {
  mode: "create" | "edit";
  template?: StaffDocumentTemplateOperatorDetail;
}) {
  const router = useRouter();
  const initial = props.template;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [kind, setKind] = useState<StaffDocumentKind>(
    initial?.kind ?? "confidentiality-nda",
  );
  const [legalEntityName, setLegalEntityName] = useState(
    initial?.legalEntityName ?? STAFF_DOCUMENT_DEFAULT_LEGAL_ENTITY,
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (!initial) return;
    setTitle(initial.title);
    setBody(initial.body);
    setKind(initial.kind);
    setLegalEntityName(initial.legalEntityName);
  }, [initial]);

  const signingMode = useMemo(() => {
    if (
      kind === "employment-agreement" ||
      kind === "confidentiality-nda" ||
      kind === "ip-assignment"
    ) {
      return "dual-signature";
    }
    return "acknowledgment";
  }, [kind]);

  const editable = props.mode === "create" || Boolean(initial?.editable);
  const status = initial?.status ?? "draft";

  async function saveDraft() {
    setBusy("save");
    setError(null);
    try {
      if (props.mode === "create") {
        const res = await fetch("/api/admin/staff/documents/operator/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body, kind, legalEntityName }),
        });
        const data = (await res.json()) as { success?: boolean; error?: string; id?: number };
        if (!res.ok || !data.success || !data.id) throw new Error(data.error ?? "Failed.");
        router.push(`/admin/operations/staff/oversight/documents/templates/${data.id}`);
        router.refresh();
        return;
      }
      const res = await fetch(
        `/api/admin/staff/documents/operator/templates/${initial!.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body, kind, legalEntityName }),
        },
      );
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error ?? "Failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(null);
    }
  }

  async function transitionStatus(next: StaffDocumentTemplateStatus) {
    if (!initial) return;
    setBusy(next);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/staff/documents/operator/templates/${initial.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        },
      );
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error ?? "Failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed.");
    } finally {
      setBusy(null);
    }
  }

  async function downloadPreviewPdf() {
    setBusy("pdf");
    setError(null);
    try {
      const url =
        props.mode === "edit" && initial
          ? `/api/admin/staff/documents/operator/templates/${initial.id}/preview-pdf`
          : "/api/admin/staff/documents/operator/templates/preview-pdf";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          kind,
          legalEntityName,
          templateVersion: initial?.version ?? 1,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "PDF preview failed.");
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `${title || "template"}-preview.pdf`;
      a.click();
      URL.revokeObjectURL(href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF preview failed.");
    } finally {
      setBusy(null);
    }
  }

  async function createNewVersion() {
    if (!initial) return;
    setBusy("version");
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/staff/documents/operator/templates/${initial.id}/new-version`,
        { method: "POST" },
      );
      const data = (await res.json()) as { success?: boolean; error?: string; id?: number };
      if (!res.ok || !data.success || !data.id) throw new Error(data.error ?? "Failed.");
      router.push(`/admin/operations/staff/oversight/documents/templates/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create new version.");
    } finally {
      setBusy(null);
    }
  }

  const statusVariant =
    status === "approved-for-use"
      ? "success"
      : status === "legal-review"
        ? "warning"
        : status === "retired"
          ? "default"
          : "default";

  return (
    <OperationsShell activeId="staff" variant="full">
      <KxdPage className="kxd-os-page--ops kxd-os-page--staff-documents-operator">
        <OperationsPageHero
          eyebrow="Staff oversight"
          title={props.mode === "create" ? "New document template" : initial?.title ?? "Template"}
          lead="Draft counsel-approved employee documents. Submit for legal review before approval. Approved templates are immutable — create a new version to change content."
        />

        {error ? (
          <p className="kxd-os-meta" style={{ color: "var(--kxd-os-critical)" }} role="alert">
            {error}
          </p>
        ) : null}

        {initial ? (
          <OpsCard className="kxd-os-ops-card-padding kxd-os-staff-docs-operator__detail-card">
            <div className="kxd-os-ops-list-row__head" style={{ marginBottom: "0.75rem" }}>
              <OpsStatusBadge
                label={staffDocumentTemplateStatusLabel(status)}
                variant={statusVariant}
              />
              <span className="kxd-os-meta">
                v{initial.version} · {staffDocumentKindOperatorLabel(initial.kind)}
              </span>
            </div>
            <dl className="kxd-os-staff-docs-template-meta">
              <div>
                <dt>Content hash</dt>
                <dd className="kxd-os-meta">{initial.contentHash}</dd>
              </div>
              {initial.createdBy ? (
                <div>
                  <dt>Created by</dt>
                  <dd>{initial.createdBy}</dd>
                </div>
              ) : null}
              {initial.legalReviewSubmittedAt ? (
                <div>
                  <dt>Legal review submitted</dt>
                  <dd>
                    {initial.legalReviewSubmittedAt}
                    {initial.legalReviewSubmittedBy
                      ? ` · ${initial.legalReviewSubmittedBy}`
                      : ""}
                  </dd>
                </div>
              ) : null}
              {initial.approvedAt ? (
                <div>
                  <dt>Approved</dt>
                  <dd>
                    {initial.approvedAt}
                    {initial.approvedBy ? ` · ${initial.approvedBy}` : ""}
                  </dd>
                </div>
              ) : null}
            </dl>
          </OpsCard>
        ) : null}

        <section className="kxd-os-staff-docs-operator__section" aria-label="Template fields">
          <OpsSectionHead label="Template content" />
          <OpsCard className="kxd-os-ops-card-padding">
            <label className="kxd-os-field kxd-os-staff-docs-operator__field">
              <span className="kxd-os-field__label">Document type</span>
              <select
                className="kxd-os-input"
                value={kind}
                disabled={!editable}
                onChange={(e) => setKind(e.target.value as StaffDocumentKind)}
              >
                {STAFF_DOCUMENT_OPERATOR_TEMPLATE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {staffDocumentKindOperatorLabel(k)}
                  </option>
                ))}
              </select>
            </label>
            <label className="kxd-os-field kxd-os-staff-docs-operator__field">
              <span className="kxd-os-field__label">Title</span>
              <input
                className="kxd-os-input"
                value={title}
                disabled={!editable}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="kxd-os-field kxd-os-staff-docs-operator__field">
              <span className="kxd-os-field__label">Legal entity</span>
              <input
                className="kxd-os-input"
                value={legalEntityName}
                disabled={!editable}
                onChange={(e) => setLegalEntityName(e.target.value)}
              />
            </label>
            <label className="kxd-os-field" style={{ display: "block", marginTop: "1rem" }}>
              <span className="kxd-os-field__label">Document body</span>
              <textarea
                className="kxd-os-input"
                rows={16}
                style={{ width: "100%", maxWidth: "48rem", fontFamily: "inherit" }}
                value={body}
                disabled={!editable}
                onChange={(e) => setBody(e.target.value)}
              />
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "1rem" }}>
              {editable ? (
                <KxdButton
                  type="button"
                  variant="primary"
                  disabled={busy === "save"}
                  onClick={() => void saveDraft()}
                >
                  Save draft
                </KxdButton>
              ) : null}
              <KxdButton
                type="button"
                variant="secondary"
                disabled={Boolean(busy)}
                onClick={() => setShowPreview((v) => !v)}
              >
                {showPreview ? "Hide preview" : "Show preview"}
              </KxdButton>
              <KxdButton
                type="button"
                variant="secondary"
                disabled={Boolean(busy) || !title || !body}
                onClick={() => void downloadPreviewPdf()}
              >
                Download PDF preview
              </KxdButton>
            </div>
          </OpsCard>
        </section>

        {showPreview && title && body ? (
          <section className="kxd-os-staff-docs-operator__section" aria-label="Preview">
            <OpsSectionHead label="KXD Classic preview" />
            <div className="kxd-agreement-doc-island">
              <KxdAgreementDocument
                variant="workspace"
                eyebrow={previewEyebrow(kind, signingMode)}
                showDocumentFooter
                documentFooterLabel="Template preview · Not executed"
              >
                <h1 className="kxd-agreement-doc__title">{title}</h1>
                <p className="kxd-os-meta" style={{ marginBottom: "1rem" }}>
                  {legalEntityName} · Version {initial?.version ?? 1}
                </p>
                <AgreementDocumentBody text={body} variant="workspace" />
              </KxdAgreementDocument>
            </div>
          </section>
        ) : null}

        {initial && !initial.qaProvenance ? (
          <section className="kxd-os-staff-docs-operator__section" aria-label="Workflow">
            <OpsSectionHead label="Review workflow" />
            <OpsCard className="kxd-os-ops-card-padding">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                {status === "draft" ? (
                  <KxdButton
                    type="button"
                    variant="primary"
                    disabled={Boolean(busy)}
                    onClick={() => void transitionStatus("legal-review")}
                  >
                    Submit for legal review
                  </KxdButton>
                ) : null}
                {status === "legal-review" ? (
                  <>
                    <KxdButton
                      type="button"
                      variant="primary"
                      disabled={Boolean(busy)}
                      onClick={() => void transitionStatus("approved-for-use")}
                    >
                      Approve for use
                    </KxdButton>
                    <KxdButton
                      type="button"
                      variant="secondary"
                      disabled={Boolean(busy)}
                      onClick={() => void transitionStatus("draft")}
                    >
                      Return to draft
                    </KxdButton>
                  </>
                ) : null}
                {status === "approved-for-use" ? (
                  <>
                    <KxdButton
                      type="button"
                      variant="secondary"
                      disabled={Boolean(busy)}
                      onClick={() => void createNewVersion()}
                    >
                      Create new draft version
                    </KxdButton>
                    <KxdButton
                      type="button"
                      variant="secondary"
                      disabled={Boolean(busy)}
                      onClick={() => void transitionStatus("retired")}
                    >
                      Retire template
                    </KxdButton>
                  </>
                ) : null}
                {status === "draft" || status === "legal-review" ? (
                  <KxdButton
                    type="button"
                    variant="secondary"
                    disabled={Boolean(busy)}
                    onClick={() => void transitionStatus("retired")}
                  >
                    Retire draft
                  </KxdButton>
                ) : null}
              </div>
            </OpsCard>
          </section>
        ) : null}

        <p className="kxd-os-meta" style={{ marginTop: "1.25rem" }}>
          <Link href={operatorStaffDocumentsPath()} className="kxd-os-link-quiet">
            Back to staff documents
          </Link>
          {props.mode === "create" ? null : (
            <>
              {" · "}
              <Link href={operatorStaffDocumentTemplateNewPath()} className="kxd-os-link-quiet">
                New template
              </Link>
            </>
          )}
        </p>
      </KxdPage>
    </OperationsShell>
  );
}
