"use client";

import "@/design-system/agreement/kxd-agreement-document.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AgreementDocumentBody } from "@/components/agreement/AgreementDocumentBody";
import { KxdAgreementDocument } from "@/components/agreement/KxdAgreementDocument";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { OpsCard, OpsStatusBadge } from "@/components/admin/operations/shared/OpsBriefing";
import { KxdButton, KxdPage } from "@/components/os";
import {
  operatorStaffDocumentTemplateNewPath,
  operatorStaffDocumentsPath,
} from "@/lib/staff-documents/access";
import {
  staffDocumentKindOperatorLabel,
  staffDocumentTemplateStatusLabel,
} from "@/lib/staff-documents/display";
import { staffDocumentTemplateBodyIsIncomplete } from "@/lib/staff-documents/template-provenance";
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

type DraftSnapshot = {
  title: string;
  body: string;
  kind: StaffDocumentKind;
  legalEntityName: string;
};

function snapshotFromTemplate(
  template: StaffDocumentTemplateOperatorDetail | undefined,
): DraftSnapshot {
  return {
    title: template?.title ?? "",
    body: template?.body ?? "",
    kind: template?.kind ?? "confidentiality-nda",
    legalEntityName: template?.legalEntityName ?? STAFF_DOCUMENT_DEFAULT_LEGAL_ENTITY,
  };
}

function formatSavedAt(iso: string | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function snapshotsEqual(a: DraftSnapshot, b: DraftSnapshot): boolean {
  return (
    a.title === b.title &&
    a.body === b.body &&
    a.kind === b.kind &&
    a.legalEntityName === b.legalEntityName
  );
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
  const [savedBaseline, setSavedBaseline] = useState<DraftSnapshot>(() =>
    snapshotFromTemplate(initial),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [saveFlash, setSaveFlash] = useState(false);

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

  const currentSnapshot = useMemo(
    (): DraftSnapshot => ({ title, body, kind, legalEntityName }),
    [title, body, kind, legalEntityName],
  );

  const isDirty = props.mode === "create" || !snapshotsEqual(currentSnapshot, savedBaseline);
  const bodyIncomplete = staffDocumentTemplateBodyIsIncomplete(body);
  const displayTitle =
    title.trim() ||
    (props.mode === "create" ? "New document template" : "Untitled template");

  const lastSavedLabel = useMemo(() => {
    if (props.mode === "create") {
      return isDirty ? "Not saved yet" : null;
    }
    if (isDirty) return "Unsaved changes";
    if (saveFlash) return "Draft saved";
    const at = formatSavedAt(initial?.updatedAt);
    return at ? `Saved ${at}` : "Draft saved";
  }, [props.mode, isDirty, saveFlash, initial?.updatedAt]);

  async function saveDraft() {
    setBusy("save");
    setError(null);
    setSaveFlash(false);
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
      setSavedBaseline(currentSnapshot);
      setSaveFlash(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(null);
    }
  }

  async function transitionStatus(next: StaffDocumentTemplateStatus) {
    if (!initial) return;
    if (next === "legal-review" && (isDirty || bodyIncomplete)) {
      setError(
        isDirty
          ? "Save draft before submitting for legal review."
          : "Replace the placeholder body with the full agreement text, then save draft.",
      );
      return;
    }
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

  const showWorkflow = Boolean(initial && !initial.qaProvenance);
  const canSubmitLegalReview =
    showWorkflow &&
    status === "draft" &&
    editable &&
    !isDirty &&
    !bodyIncomplete &&
    !busy;

  const saveStateClass = isDirty
    ? "kxd-os-staff-docs-template-editor__save-state kxd-os-staff-docs-template-editor__save-state--dirty"
    : saveFlash
      ? "kxd-os-staff-docs-template-editor__save-state kxd-os-staff-docs-template-editor__save-state--ok"
      : "kxd-os-staff-docs-template-editor__save-state";

  return (
    <OperationsShell activeId="staff" variant="full">
      <KxdPage className="kxd-os-page--ops kxd-os-page--staff-documents-operator">
        <OperationsPageHero
          eyebrow="Staff oversight"
          title="Document template"
          lead="Draft counsel-approved employee documents. Submit for legal review before approval. Approved templates are immutable — create a new version to change content."
        />

        {error ? (
          <p className="kxd-os-meta" style={{ color: "var(--kxd-os-critical)" }} role="alert">
            {error}
          </p>
        ) : null}

        <div className="kxd-os-staff-docs-template-editor">
          <header className="kxd-os-staff-docs-template-editor__doc-header">
            <div>
              <h2 className="kxd-os-staff-docs-template-editor__doc-title">{displayTitle}</h2>
              <div className="kxd-os-staff-docs-template-editor__doc-meta">
                <OpsStatusBadge
                  label={staffDocumentTemplateStatusLabel(status)}
                  variant={statusVariant}
                />
                <span className="kxd-os-staff-docs-template-editor__doc-meta-item">
                  {staffDocumentKindOperatorLabel(kind)}
                </span>
                <span className="kxd-os-staff-docs-template-editor__doc-meta-item">
                  Version {initial?.version ?? 1}
                </span>
                <span
                  className="kxd-os-staff-docs-template-editor__doc-meta-item kxd-os-staff-docs-template-editor__doc-meta-item--entity"
                >
                  {legalEntityName}
                </span>
                {status === "legal-review" && initial?.legalReviewSubmittedAt ? (
                  <span className="kxd-os-staff-docs-template-editor__doc-meta-item">
                    In review since {formatSavedAt(initial.legalReviewSubmittedAt)}
                  </span>
                ) : null}
                {status === "approved-for-use" && initial?.approvedAt ? (
                  <span className="kxd-os-staff-docs-template-editor__doc-meta-item">
                    Approved {formatSavedAt(initial.approvedAt)}
                    {initial.approvedBy ? ` · ${initial.approvedBy}` : ""}
                  </span>
                ) : null}
              </div>
            </div>
          </header>

          <div className="kxd-os-staff-docs-template-editor__workflow-bar" aria-label="Document actions">
            <p className={saveStateClass} role="status" aria-live="polite">
              {lastSavedLabel ?? (props.mode === "edit" ? "Draft" : "")}
              {bodyIncomplete && editable ? " · Body incomplete" : null}
            </p>
            <div className="kxd-os-staff-docs-template-editor__actions">
              {editable ? (
                <KxdButton
                  type="button"
                  variant="primary"
                  disabled={busy === "save" || !isDirty}
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
                disabled={Boolean(busy) || !title.trim() || bodyIncomplete}
                onClick={() => void downloadPreviewPdf()}
              >
                Download PDF
              </KxdButton>

              {showWorkflow ? (
                <>
                  <span className="kxd-os-staff-docs-template-editor__actions-divider" aria-hidden />
                  {status === "draft" ? (
                    <KxdButton
                      type="button"
                      variant="secondary"
                      disabled={!canSubmitLegalReview}
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
                        New draft version
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
                      Retire
                    </KxdButton>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>

          {status === "draft" && bodyIncomplete && editable ? (
            <p className="kxd-os-staff-docs-template-editor__hint" role="note">
              The agreement body must contain the full legal text before legal review. Placeholder
              content cannot be submitted.
            </p>
          ) : null}

          <div className="kxd-os-staff-docs-template-editor__grid">
            <OpsCard className="kxd-os-ops-card-padding" aria-label="Template content">
              <h3 className="kxd-os-staff-docs-template-editor__panel-title">Edit document</h3>
              <div className="kxd-os-staff-docs-template-editor__fields-grid">
                <label
                  className="kxd-os-field kxd-os-staff-docs-template-editor__field kxd-os-staff-docs-template-editor__field--kind"
                >
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
                <label className="kxd-os-field kxd-os-staff-docs-template-editor__field">
                  <span className="kxd-os-field__label">Title</span>
                  <input
                    className="kxd-os-input"
                    value={title}
                    disabled={!editable}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
                <label className="kxd-os-field kxd-os-staff-docs-template-editor__field">
                  <span className="kxd-os-field__label">Legal entity</span>
                  <input
                    className="kxd-os-input"
                    value={legalEntityName}
                    disabled={!editable}
                    onChange={(e) => setLegalEntityName(e.target.value)}
                  />
                </label>
              </div>
              <label className="kxd-os-staff-docs-template-editor__body-label">
                <span className="kxd-os-field__label">Agreement body</span>
                <textarea
                  className="kxd-os-input kxd-os-staff-docs-template-editor__body"
                  value={body}
                  disabled={!editable}
                  spellCheck={false}
                  onChange={(e) => setBody(e.target.value)}
                />
              </label>

              {initial ? (
                <details className="kxd-os-staff-docs-template-editor__audit">
                  <summary>Record details</summary>
                  <dl className="kxd-os-staff-docs-template-meta">
                    <div>
                      <dt>Content hash</dt>
                      <dd className="kxd-os-meta">{initial.contentHash || "—"}</dd>
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
                  </dl>
                </details>
              ) : null}
            </OpsCard>

            {showPreview && title.trim() && body ? (
              <div
                className="kxd-os-staff-docs-template-editor__preview-sticky"
                aria-label="KXD Classic preview"
              >
                <h3 className="kxd-os-staff-docs-template-editor__panel-title">KXD Classic preview</h3>
                <div
                  className="kxd-os-staff-docs-template-editor__preview-doc kxd-agreement-doc-card kxd-agreement-doc-island"
                  tabIndex={0}
                  role="document"
                  aria-label="Agreement preview"
                >
                  <div className="kxd-agreement-doc-card__header">
                    <p className="kxd-agreement-doc-card__title">Document preview</p>
                    <p className="kxd-agreement-doc-card__hint">
                      Not executed · Ivory surface matches PDF
                    </p>
                  </div>
                  <div className="kxd-agreement-doc-card__scroll">
                    <KxdAgreementDocument
                      variant="workspace"
                      eyebrow={previewEyebrow(kind, signingMode)}
                      showDocumentFooter
                      documentFooterLabel="Template preview · Not executed"
                    >
                      <h1 className="kxd-agreement-doc__title">{title}</h1>
                      <p className="kxd-agreement-doc__meta-line">
                        {legalEntityName} · Version {initial?.version ?? 1}
                      </p>
                      <AgreementDocumentBody text={body} variant="workspace" />
                    </KxdAgreementDocument>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

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
