"use client";

import { useId, useState, type FormEvent } from "react";
import { AgreementDocumentBody } from "@/components/agreement/AgreementDocumentBody";
import { KxdAgreementDocument } from "@/components/agreement/KxdAgreementDocument";
import { STAFF_AGREEMENT_ESIGN_CONSENT_TEXT } from "@/lib/staff-documents/constants";
import { staffDocumentKindLabel } from "@/lib/staff-documents/display";
import type { StaffDocumentDetail } from "@/lib/staff-documents/types";

export function StaffDocumentSignForm(props: {
  document: StaffDocumentDetail;
  canSign: boolean;
  canDecline: boolean;
}) {
  const formId = useId();
  const [legalName, setLegalName] = useState("");
  const [title, setTitle] = useState("");
  const [entityName, setEntityName] = useState("");
  const [typed, setTyped] = useState("");
  const [consent, setConsent] = useState(false);
  const [authority, setAuthority] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const awaitingKxd = props.document.status === "awaiting-operator-signature";
  const executed = props.document.status === "executed";
  const declined = props.document.status === "declined";

  async function onSign(e: FormEvent) {
    e.preventDefault();
    if (!props.canSign) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/staff/documents/${props.document.id}/sign`, {
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
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error ?? "Unable to sign.");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signing failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onDecline() {
    if (!props.canDecline || !window.confirm("Decline this agreement? This cannot be undone.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/staff/documents/${props.document.id}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error ?? "Unable to decline.");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decline failed.");
    } finally {
      setBusy(false);
    }
  }

  const policyDownload =
    props.document.policyFileId != null
      ? `/api/admin/staff/documents/${props.document.id}/files/${props.document.policyFileId}/download`
      : null;
  const executedDownload =
    props.document.executedAgreementFileId != null
      ? `/api/admin/staff/documents/${props.document.id}/files/${props.document.executedAgreementFileId}/download`
      : null;

  return (
    <div className="kxd-agreement-doc-island">
      <KxdAgreementDocument
        variant="signing"
        eyebrow={staffDocumentKindLabel(props.document.kind)}
        showDocumentFooter
        documentFooterLabel="Staff agreement · Review in full before signing"
      >
        <h1 className="kxd-agreement-doc__title" style={{ fontFamily: "Georgia, serif" }}>
          {props.document.title}
        </h1>
        <p className="kxd-os-meta" style={{ marginBottom: "1rem" }}>
          {props.document.legalEntityName} · Version {props.document.templateVersion}
          {props.document.expiresAt
            ? ` · Expires ${new Date(props.document.expiresAt).toLocaleString()}`
            : ""}
        </p>
        <AgreementDocumentBody text={props.document.bodySnapshot} variant="signing" />
      </KxdAgreementDocument>

      <div className="kxd-os-card kxd-os-ops-card-padding" style={{ marginTop: "1.25rem" }}>
        <p className="kxd-os-card__title">Downloads</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "0.75rem" }}>
          {policyDownload ? (
            <a href={policyDownload} className="kxd-os-btn kxd-os-btn--secondary">
              Download agreement PDF
            </a>
          ) : null}
          {executedDownload ? (
            <a href={executedDownload} className="kxd-os-btn kxd-os-btn--primary">
              Download executed agreement
            </a>
          ) : null}
        </div>
      </div>

      {executed ? (
        <div className="kxd-os-card kxd-os-ops-card-padding" style={{ marginTop: "1.25rem" }} role="status">
          <p className="kxd-os-card__title">Fully executed</p>
          <p className="kxd-os-meta" style={{ marginTop: "0.5rem" }}>
            Executed{" "}
            {props.document.executedAt
              ? new Date(props.document.executedAt).toLocaleString()
              : "and on file for this version."}
          </p>
        </div>
      ) : awaitingKxd ? (
        <div className="kxd-os-card kxd-os-ops-card-padding" style={{ marginTop: "1.25rem" }} role="status">
          <p className="kxd-os-card__title">Awaiting KXD signature</p>
          <p className="kxd-os-meta" style={{ marginTop: "0.5rem" }}>
            Your signature is recorded. An authorized KXD representative will countersign to complete
            execution.
          </p>
        </div>
      ) : declined ? (
        <div className="kxd-os-card kxd-os-ops-card-padding" style={{ marginTop: "1.25rem" }} role="status">
          <p className="kxd-os-card__title">Declined</p>
          <p className="kxd-os-meta" style={{ marginTop: "0.5rem" }}>
            You declined this agreement assignment.
          </p>
        </div>
      ) : props.canSign ? (
        <form
          id={formId}
          onSubmit={onSign}
          className="kxd-os-card kxd-os-ops-card-padding"
          style={{ marginTop: "1.25rem" }}
        >
          <p className="kxd-os-card__title">Electronic signature</p>
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
              autoComplete="name"
            />
          </label>
          <label className="kxd-os-field" style={{ marginTop: "0.75rem", display: "block" }}>
            <span className="kxd-os-field__label">Title / role</span>
            <input
              className="kxd-os-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
          <label className="kxd-os-field" style={{ marginTop: "0.75rem", display: "block" }}>
            <span className="kxd-os-field__label">Signing entity (your legal name or employer)</span>
            <input
              className="kxd-os-input"
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              required
            />
          </label>
          <label className="kxd-os-field" style={{ marginTop: "0.75rem", display: "block" }}>
            <span className="kxd-os-field__label">Type your legal name to sign</span>
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
            <span className="kxd-os-meta">I am authorized to sign for the named party.</span>
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
          {error ? (
            <p className="kxd-os-meta" style={{ color: "var(--kxd-os-critical)", marginTop: "0.75rem" }}>
              {error}
            </p>
          ) : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "1rem" }}>
            <button type="submit" className="kxd-os-btn kxd-os-btn--primary" disabled={busy}>
              {busy ? "Signing…" : "Sign agreement"}
            </button>
            {props.canDecline ? (
              <button
                type="button"
                className="kxd-os-btn kxd-os-btn--secondary"
                disabled={busy}
                onClick={() => void onDecline()}
              >
                Decline
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <p className="kxd-os-meta" style={{ marginTop: "1rem" }}>
          This agreement is not available for signature in its current state.
        </p>
      )}
    </div>
  );
}
