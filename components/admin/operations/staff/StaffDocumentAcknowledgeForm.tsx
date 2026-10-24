"use client";

import { useId, useState, type FormEvent } from "react";
import "@/design-system/os/styles/kxd-staff-documents.css";
import { STAFF_ACKNOWLEDGMENT_CONSENT_TEXT } from "@/lib/staff-documents/constants";
import type { StaffDocumentDetail } from "@/lib/staff-documents/types";
import { StaffDocumentReviewPane } from "./StaffDocumentReviewPane";

export function StaffDocumentAcknowledgeForm(props: {
  document: StaffDocumentDetail;
  canAcknowledge: boolean;
}) {
  const formId = useId();
  const reviewedId = useId();
  const consentId = useId();
  const [legalName, setLegalName] = useState("");
  const [typed, setTyped] = useState("");
  const [consent, setConsent] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(props.document.status === "acknowledged");

  const metaLine = `${props.document.legalEntityName} · Version ${props.document.templateVersion}`;

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
    <div className="kxd-staff-doc-detail">
      <StaffDocumentReviewPane
        eyebrow="Staff policy"
        title={props.document.title}
        metaLine={metaLine}
        bodySnapshot={props.document.bodySnapshot}
        footerLabel="Staff policy · Review in full before acknowledging"
        scrollHint="Scroll through the complete policy. Acknowledgment controls appear below when you are ready."
      />

      {(policyDownload || ackDownload) && (
        <div className="kxd-os-card kxd-os-ops-card-padding kxd-staff-doc-detail__panel">
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
      )}

      {done || props.document.status === "acknowledged" ? (
        <div
          className="kxd-os-card kxd-os-ops-card-padding kxd-staff-doc-detail__panel"
          role="status"
        >
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
          className="kxd-os-card kxd-os-ops-card-padding kxd-staff-doc-detail__panel"
          aria-labelledby={`${formId}-legend`}
        >
          <ol className="kxd-staff-doc-steps" aria-label="Acknowledgment steps">
            <li className="kxd-staff-doc-steps__item">1. Review policy</li>
            <li className="kxd-staff-doc-steps__item kxd-staff-doc-steps__item--current">
              2. Complete acknowledgment
            </li>
          </ol>
          <fieldset className="kxd-staff-doc-sign-fieldset">
            <legend id={`${formId}-legend`} className="kxd-os-card__title">
              Electronic acknowledgment
            </legend>
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
            <label className="kxd-staff-doc-consent" htmlFor={reviewedId}>
              <input
                id={reviewedId}
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
                required
              />
              <span className="kxd-os-meta">I read the full policy document above.</span>
            </label>
            <label className="kxd-staff-doc-consent" htmlFor={consentId}>
              <input
                id={consentId}
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                required
              />
              <span className="kxd-os-meta">I agree to electronic records for this acknowledgment.</span>
            </label>
          </fieldset>
          {error ? (
            <p
              className="kxd-os-meta"
              style={{ color: "var(--kxd-os-critical)", marginTop: "0.75rem" }}
              role="alert"
            >
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
        <p className="kxd-os-meta kxd-staff-doc-detail__panel">
          Acknowledgment is not available in preview mode or for this document state.
        </p>
      )}
    </div>
  );
}
