"use client";

import { useId, useState, type FormEvent } from "react";
import { AgreementDocumentBody } from "@/components/agreement/AgreementDocumentBody";
import { KxdAgreementDocument } from "@/components/agreement/KxdAgreementDocument";
import { STAFF_ACKNOWLEDGMENT_CONSENT_TEXT } from "@/lib/staff-documents/constants";
import type { StaffDocumentDetail } from "@/lib/staff-documents/types";

export function StaffDocumentAcknowledgeForm(props: {
  document: StaffDocumentDetail;
  canAcknowledge: boolean;
}) {
  const formId = useId();
  const [legalName, setLegalName] = useState("");
  const [typed, setTyped] = useState("");
  const [consent, setConsent] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(props.document.status === "acknowledged");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!props.canAcknowledge) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/staff/documents/${props.document.id}/acknowledge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            legalName,
            typedAcknowledgment: typed,
            electronicRecordsConsent: consent,
            reviewedConfirmed: reviewed,
          }),
        },
      );
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Unable to acknowledge.");
      }
      setDone(true);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Acknowledgment failed.");
    } finally {
      setBusy(false);
    }
  }

  const policyDownload =
    props.document.policyFileId != null
      ? `/api/admin/staff/documents/${props.document.id}/files/${props.document.policyFileId}/download`
      : null;
  const ackDownload =
    props.document.acknowledgmentFileId != null
      ? `/api/admin/staff/documents/${props.document.id}/files/${props.document.acknowledgmentFileId}/download`
      : null;

  return (
    <div className="kxd-agreement-doc-island">
      <KxdAgreementDocument
        variant="signing"
        eyebrow="Staff policy"
        showDocumentFooter
        documentFooterLabel="Staff policy · Review in full before acknowledging"
      >
        <h1 className="kxd-agreement-doc__title" style={{ fontFamily: "Georgia, serif" }}>
          {props.document.title}
        </h1>
        <p className="kxd-os-meta" style={{ marginBottom: "1rem" }}>
          {props.document.legalEntityName} · Version {props.document.templateVersion}
        </p>
        <AgreementDocumentBody text={props.document.bodySnapshot} variant="signing" />
      </KxdAgreementDocument>

      <div className="kxd-os-card kxd-os-ops-card-padding" style={{ marginTop: "1.25rem" }}>
        <p className="kxd-os-card__title">Downloads</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "0.75rem" }}>
          {policyDownload ? (
            <a href={policyDownload} className="kxd-os-btn kxd-os-btn--secondary">
              Download policy PDF
            </a>
          ) : null}
          {ackDownload ? (
            <a href={ackDownload} className="kxd-os-btn kxd-os-btn--secondary">
              Download acknowledgment record
            </a>
          ) : null}
        </div>
      </div>

      {done || props.document.status === "acknowledged" ? (
        <div className="kxd-os-card kxd-os-ops-card-padding" style={{ marginTop: "1.25rem" }} role="status">
          <p className="kxd-os-card__title">Acknowledgment on file</p>
          <p className="kxd-os-meta" style={{ marginTop: "0.5rem" }}>
            Recorded{" "}
            {props.document.acknowledgedAt
              ? new Date(props.document.acknowledgedAt).toLocaleString()
              : "for this document version."}
          </p>
        </div>
      ) : props.canAcknowledge ? (
        <form
          id={formId}
          onSubmit={onSubmit}
          className="kxd-os-card kxd-os-ops-card-padding"
          style={{ marginTop: "1.25rem" }}
        >
          <p className="kxd-os-card__title">Electronic acknowledgment</p>
          <p className="kxd-os-meta" style={{ marginTop: "0.5rem" }}>
            {STAFF_ACKNOWLEDGMENT_CONSENT_TEXT}
          </p>
          <label className="kxd-os-field" style={{ marginTop: "1rem", display: "block" }}>
            <span className="kxd-os-field__label">Legal name</span>
            <input
              className="kxd-os-input"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              required
              autoComplete="name"
            />
          </label>
          <label className="kxd-os-field" style={{ marginTop: "0.75rem", display: "block" }}>
            <span className="kxd-os-field__label">Type your legal name to acknowledge</span>
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
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
              required
            />
            <span className="kxd-os-meta">I read the full policy document above.</span>
          </label>
          <label style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
            />
            <span className="kxd-os-meta">I agree to electronic records for this acknowledgment.</span>
          </label>
          {error ? (
            <p className="kxd-os-meta" style={{ color: "var(--kxd-os-critical)", marginTop: "0.75rem" }}>
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="kxd-os-btn kxd-os-btn--primary"
            style={{ marginTop: "1rem" }}
            disabled={busy}
          >
            {busy ? "Recording…" : "Acknowledge policy"}
          </button>
        </form>
      ) : (
        <p className="kxd-os-meta" style={{ marginTop: "1rem" }}>
          Acknowledgment is not available in preview mode or for this document state.
        </p>
      )}
    </div>
  );
}
