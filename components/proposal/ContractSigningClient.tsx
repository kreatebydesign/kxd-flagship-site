"use client";

import { useId, useState, type CSSProperties, type FormEvent } from "react";

export function ContractSigningClient(props: {
  /** Capability token from the URL — required to POST the signature. */
  publicToken: string;
  title: string;
  body: string;
  consentText: string;
  consentVersion: string;
  operatorSignedBy: string;
  operatorSignedAt: string;
}) {
  const formId = useId();
  const errorId = `${formId}-error`;
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [typedAcknowledgment, setTyped] = useState("");
  const [authority, setAuthority] = useState(false);
  const [consent, setConsent] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    agreementId: string;
    verificationId: string;
    completionToken: string | null;
    documentRefs: Array<{ id: number; kind: string }>;
  } | null>(null);

  const operatorSignedLabel = formatOperatorSignedAt(props.operatorSignedAt);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/contract/${encodeURIComponent(props.publicToken)}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          title,
          organization,
          email,
          typedAcknowledgment,
          authorityConfirmed: authority,
          reviewedConfirmed: reviewed,
          electronicRecordsConsent: consent,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        certificate?: { agreementId: string; verificationId: string };
        completionToken?: string | null;
        documentRefs?: Array<{ id: number; kind: string }>;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Unable to sign agreement.");
      }
      setDone({
        agreementId: data.certificate?.agreementId ?? "executed",
        verificationId: data.certificate?.verificationId ?? "",
        completionToken: data.completionToken ?? null,
        documentRefs: data.documentRefs ?? [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signing failed.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <main style={shell}>
        <p style={eyebrow}>Agreement complete</p>
        <h1 style={h1}>Signed and sealed</h1>
        <p style={body} role="status">
          Thank you. Your electronic signature has been recorded. Agreement{" "}
          <strong>{done.agreementId}</strong>
          {done.verificationId ? (
            <>
              {" "}
              · verification <strong>{done.verificationId}</strong>
            </>
          ) : null}
          . Typed signatures are electronic acknowledgments with consent — not biometric identity
          verification.
        </p>
        <p style={meta}>
          Kreate by Design will follow up regarding next steps. No payment was collected on this
          page.
        </p>
        {done.completionToken && done.documentRefs.length > 0 ? (
          <section style={panel} aria-label="Executed package downloads">
            <h2 style={h2}>Executed package</h2>
            <p style={body}>
              Authorized downloads for this agreement only. Keep this page private — the access
              token is not stored in plaintext after you leave.
            </p>
            <ul style={{ paddingLeft: 18, fontFamily: "system-ui, sans-serif", fontSize: 14 }}>
              {done.documentRefs.map((d) => (
                <li key={d.id} style={{ marginBottom: 6 }}>
                  <a
                    href={`/api/contract/package/${d.id}/download?token=${encodeURIComponent(done.completionToken!)}`}
                  >
                    {d.kind}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    );
  }

  return (
    <main style={shell}>
      <p style={eyebrow}>Electronic signature</p>
      <h1 style={h1}>{props.title}</h1>
      <p style={meta}>
        Already signed by KXD: {props.operatorSignedBy}
        {operatorSignedLabel ? ` · ${operatorSignedLabel}` : null}
      </p>
      <p style={body}>
        Signing this agreement creates a binding contract. Review the full terms carefully before
        submitting your typed electronic signature.
      </p>

      <section style={panel} aria-labelledby={`${formId}-agreement`}>
        <h2 id={`${formId}-agreement`} style={h2}>
          Agreement
        </h2>
        <p style={scrollHint}>Scroll to review the complete agreement text.</p>
        <pre style={pre} tabIndex={0}>
          {props.body}
        </pre>
      </section>

      <form
        onSubmit={onSubmit}
        style={panel}
        aria-labelledby={`${formId}-sign`}
        aria-describedby={error ? errorId : undefined}
      >
        <h2 id={`${formId}-sign`} style={h2}>
          Sign as authorized representative
        </h2>
        <Field id={`${formId}-name`} label="Legal name" value={name} onChange={setName} required />
        <Field id={`${formId}-title`} label="Title" value={title} onChange={setTitle} required />
        <Field
          id={`${formId}-org`}
          label="Organization"
          value={organization}
          onChange={setOrganization}
          required
        />
        <Field
          id={`${formId}-email`}
          label="Email"
          value={email}
          onChange={setEmail}
          required
          type="email"
        />
        <Field
          id={`${formId}-ack`}
          label="Type your legal name to sign"
          value={typedAcknowledgment}
          onChange={setTyped}
          required
        />
        <label style={check}>
          <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
          I reviewed the agreement and Exhibit terms.
        </label>
        <label style={check}>
          <input
            type="checkbox"
            checked={authority}
            onChange={(e) => setAuthority(e.target.checked)}
          />
          I am authorized to sign for the named organization.
        </label>
        <label style={check}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          {props.consentText}
        </label>
        {error ? (
          <p id={errorId} role="alert" style={{ color: "#8b2e2e" }}>
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={busy} aria-busy={busy} style={btn}>
          {busy ? "Submitting…" : "Sign agreement"}
        </button>
      </form>
    </main>
  );
}

function formatOperatorSignedAt(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(ms));
  } catch {
    return iso.slice(0, 16);
  }
}

function Field({
  id,
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={id} style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        style={input}
      />
    </div>
  );
}

const shell: CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  padding: "2.5rem 1.25rem 4rem",
  fontFamily: "Georgia, 'Iowan Old Style', serif",
  color: "#1c1916",
};
const eyebrow: CSSProperties = {
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontSize: 11,
  color: "#7a7166",
  fontFamily: "system-ui, sans-serif",
};
const h1: CSSProperties = { fontSize: 28, margin: "0.35rem 0 0.75rem" };
const h2: CSSProperties = { fontSize: 18, margin: "0 0 0.75rem" };
const body: CSSProperties = { lineHeight: 1.55, marginBottom: "1rem" };
const meta: CSSProperties = { color: "#7a7166", fontSize: 14, marginBottom: "1.25rem" };
const panel: CSSProperties = {
  border: "1px solid #e2d8c8",
  background: "#fff",
  padding: "1.1rem 1.2rem",
  marginBottom: "1.25rem",
};
const scrollHint: CSSProperties = {
  fontSize: 12,
  color: "#7a7166",
  marginBottom: 8,
  fontFamily: "system-ui, sans-serif",
};
const pre: CSSProperties = {
  whiteSpace: "pre-wrap",
  fontFamily: "ui-monospace, monospace",
  fontSize: 12,
  lineHeight: 1.5,
  maxHeight: 420,
  overflow: "auto",
  margin: 0,
  outlineOffset: 2,
};
const input: CSSProperties = {
  width: "100%",
  padding: "0.55rem 0.65rem",
  border: "1px solid #d4c8b8",
  borderRadius: 2,
  fontSize: 14,
  fontFamily: "system-ui, sans-serif",
};
const check: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "flex-start",
  fontSize: 13,
  lineHeight: 1.45,
  marginBottom: 10,
  fontFamily: "system-ui, sans-serif",
};
const btn: CSSProperties = {
  marginTop: 8,
  background: "#111",
  color: "#f7f1e8",
  border: 0,
  padding: "0.7rem 1.1rem",
  borderRadius: 2,
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
};
