"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { AgreementDocumentBody } from "@/components/agreement/AgreementDocumentBody";
import { KxdAgreementDocument } from "@/components/agreement/KxdAgreementDocument";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { OpsCard, OpsStatusBadge } from "@/components/admin/operations/shared/OpsBriefing";
import { KxdButton, KxdPage } from "@/components/os";
import { STAFF_AGREEMENT_ESIGN_CONSENT_TEXT } from "@/lib/staff-documents/constants";
import { STAFF_DOCUMENT_DEFAULT_LEGAL_ENTITY } from "@/lib/staff-documents/types";
import { staffDocumentKindLabel, staffDocumentStatusBadge } from "@/lib/staff-documents/display";
import type { StaffDocumentDetail } from "@/lib/staff-documents/types";

export function StaffDocumentOperatorDetailScreen(props: {
  document: StaffDocumentDetail;
  staffLabel: string;
}) {
  const router = useRouter();
  const formId = useId();
  const [legalName, setLegalName] = useState("");
  const [title, setTitle] = useState("Authorized representative");
  const [entityName, setEntityName] = useState(STAFF_DOCUMENT_DEFAULT_LEGAL_ENTITY);
  const [typed, setTyped] = useState("");
  const [consent, setConsent] = useState(false);
  const [authority, setAuthority] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const badge = staffDocumentStatusBadge({
    status: props.document.status,
    signingMode: props.document.signingMode,
  });

  async function onCountersign(e: FormEvent) {
    e.preventDefault();
    if (!props.document.canCountersign) return;
    setBusy("sign");
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/staff/documents/operator/${props.document.id}/countersign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            legalName,
            title,
            entityName,
            typedAcknowledgment: typed,
            authorityConfirmed: authority,
            electronicRecordsConsent: consent,
          }),
        },
      );
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error ?? "Countersign failed.");
      router.refresh();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Countersign failed.");
    } finally {
      setBusy(null);
    }
  }

  async function onRetry() {
    setBusy("retry");
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/staff/documents/operator/${props.document.id}/retry-execution`,
        { method: "POST" },
      );
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error ?? "Retry failed.");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed.");
    } finally {
      setBusy(null);
    }
  }

  async function onRevoke() {
    if (!props.document.canRevoke || !window.confirm("Revoke this assignment?")) return;
    setBusy("revoke");
    setError(null);
    try {
      const res = await fetch(`/api/admin/staff/documents/operator/${props.document.id}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "operator-revocation" }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error ?? "Revoke failed.");
      router.refresh();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed.");
    } finally {
      setBusy(null);
    }
  }

  const executedDownload =
    props.document.executedAgreementFileId != null
      ? `/api/admin/staff/documents/${props.document.id}/files/${props.document.executedAgreementFileId}/download`
      : null;

  return (
    <OperationsShell activeId="staff" variant="full">
      <KxdPage className="kxd-os-page--ops kxd-os-page--staff-documents-operator">
        <OperationsPageHero
          eyebrow="Staff documents · countersignature"
          title={props.document.title}
          lead={`${props.staffLabel} · ${staffDocumentKindLabel(props.document.kind)}`}
        />

        <div style={{ marginBottom: "1rem" }}>
          <OpsStatusBadge label={badge.label} variant={badge.variant} />
        </div>

        {error ? (
          <p className="kxd-os-meta" style={{ color: "var(--kxd-os-critical)", marginBottom: "1rem" }}>
            {error}
          </p>
        ) : null}

        <div className="kxd-agreement-doc-island">
          <KxdAgreementDocument
            variant="signing"
            eyebrow="Employee-signed agreement"
            showDocumentFooter
            documentFooterLabel="Countersignature review · Employee-signed copy"
          >
            <AgreementDocumentBody text={props.document.bodySnapshot} variant="signing" />
          </KxdAgreementDocument>
        </div>

        {props.document.employeeSignature ? (
          <OpsCard className="kxd-os-ops-card-padding kxd-os-staff-docs-operator__detail-card">
            <p className="kxd-os-card__title">Employee signature</p>
            <p className="kxd-os-meta" style={{ marginTop: "0.5rem" }}>
              {props.document.employeeSignature.legalName} ·{" "}
              {new Date(props.document.employeeSignature.signedAt).toLocaleString()}
            </p>
            <p className="kxd-os-meta">Hash {props.document.employeeSignature.signatureHash}</p>
          </OpsCard>
        ) : null}

        {executedDownload ? (
          <OpsCard className="kxd-os-ops-card-padding kxd-os-staff-docs-operator__detail-card">
            <a href={executedDownload} className="kxd-os-btn kxd-os-btn--primary">
              Download executed agreement
            </a>
          </OpsCard>
        ) : null}

        {props.document.canCountersign ? (
          <form
            id={formId}
            onSubmit={onCountersign}
            className="kxd-os-card kxd-os-ops-card-padding"
            style={{ marginTop: "1.25rem" }}
          >
            <p className="kxd-os-card__title">KXD countersignature</p>
            <p className="kxd-os-meta" style={{ marginTop: "0.5rem" }}>
              {STAFF_AGREEMENT_ESIGN_CONSENT_TEXT}
            </p>
            <label className="kxd-os-field" style={{ marginTop: "1rem", display: "block" }}>
              <span className="kxd-os-field__label">Legal name</span>
              <input
                className="kxd-os-input"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                required
              />
            </label>
            <label className="kxd-os-field" style={{ marginTop: "0.75rem", display: "block" }}>
              <span className="kxd-os-field__label">Title</span>
              <input
                className="kxd-os-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>
            <label className="kxd-os-field" style={{ marginTop: "0.75rem", display: "block" }}>
              <span className="kxd-os-field__label">Entity</span>
              <input
                className="kxd-os-input"
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
                required
              />
            </label>
            <label className="kxd-os-field" style={{ marginTop: "0.75rem", display: "block" }}>
              <span className="kxd-os-field__label">Type your legal name to countersign</span>
              <input
                className="kxd-os-input"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                required
              />
            </label>
            <label style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
              <input
                type="checkbox"
                checked={authority}
                onChange={(e) => setAuthority(e.target.checked)}
                required
              />
              <span className="kxd-os-meta">I am authorized to sign for Kreate by Design.</span>
            </label>
            <label style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                required
              />
              <span className="kxd-os-meta">I agree to electronic records and signatures.</span>
            </label>
            <KxdButton
              type="submit"
              variant="primary"
              style={{ marginTop: "1rem" }}
              disabled={busy === "sign"}
            >
              {busy === "sign" ? "Countersigning…" : "Countersign and execute"}
            </KxdButton>
          </form>
        ) : null}

        {props.document.canRetryExecution ? (
          <OpsCard className="kxd-os-ops-card-padding kxd-os-staff-docs-operator__detail-card">
            <p className="kxd-os-card__title">Execution recovery</p>
            <p className="kxd-os-meta" style={{ marginTop: "0.5rem" }}>
              Final PDF generation did not complete. Retry after verifying storage.
            </p>
            <KxdButton
              type="button"
              variant="secondary"
              style={{ marginTop: "0.75rem" }}
              disabled={busy === "retry"}
              onClick={() => void onRetry()}
            >
              Retry execution finalize
            </KxdButton>
          </OpsCard>
        ) : null}

        {props.document.canRevoke ? (
          <div style={{ marginTop: "1.25rem" }}>
            <KxdButton
              type="button"
              variant="secondary"
              disabled={busy === "revoke"}
              onClick={() => void onRevoke()}
            >
              Revoke assignment
            </KxdButton>
          </div>
        ) : null}

        <p className="kxd-os-meta" style={{ marginTop: "1.25rem" }}>
          <Link href="/admin/operations/staff/oversight/documents" className="kxd-os-link-quiet">
            Back to staff documents
          </Link>
        </p>
      </KxdPage>
    </OperationsShell>
  );
}
