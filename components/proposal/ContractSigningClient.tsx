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
      <main style={page}>
        <div style={container}>
          <BrandHeader />
          <p style={eyebrow}>Agreement complete</p>
          <h1 style={h1}>Signed and sealed</h1>
          <p style={lede} role="status">
            Thank you. Your electronic signature has been recorded. Agreement{" "}
            <strong style={strong}>{done.agreementId}</strong>
            {done.verificationId ? (
              <>
                {" "}
                · verification <strong style={strong}>{done.verificationId}</strong>
              </>
            ) : null}
            . Typed signatures are electronic acknowledgments with consent — not biometric identity
            verification.
          </p>
          <p style={muted}>
            Kreate by Design will follow up regarding next steps. No payment was collected on this
            page.
          </p>
          {done.completionToken && done.documentRefs.length > 0 ? (
            <section style={signCard} aria-label="Executed package downloads">
              <h2 style={cardTitle}>Executed package</h2>
              <p style={cardBody}>
                Authorized downloads for this agreement only. Keep this page private — the access
                token is not stored in plaintext after you leave.
              </p>
              <ul style={downloadList}>
                {done.documentRefs.map((d) => (
                  <li key={d.id} style={downloadItem}>
                    <a
                      href={`/api/contract/package/${d.id}/download?token=${encodeURIComponent(done.completionToken!)}`}
                      style={downloadLink}
                    >
                      {d.kind}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main style={page}>
      <div style={container}>
        <BrandHeader />
        <p style={eyebrow}>Electronic signature</p>
        <h1 style={h1}>{props.title}</h1>
        <p style={operatorConfirm}>
          Already signed by KXD: {props.operatorSignedBy}
          {operatorSignedLabel ? ` · ${operatorSignedLabel}` : null}
        </p>
        <p style={lede}>
          Signing this agreement creates a binding contract. Review the full terms carefully before
          submitting your typed electronic signature.
        </p>

        <section style={documentCard} aria-labelledby={`${formId}-agreement`}>
          <div style={documentHeader}>
            <h2 id={`${formId}-agreement`} style={documentTitle}>
              Agreement
            </h2>
            <p style={scrollHint}>Scroll to review the complete agreement text.</p>
          </div>
          <pre style={documentBody} tabIndex={0}>
            {props.body}
          </pre>
        </section>

        <form
          onSubmit={onSubmit}
          style={signCard}
          aria-labelledby={`${formId}-sign`}
          aria-describedby={error ? errorId : undefined}
        >
          <h2 id={`${formId}-sign`} style={cardTitle}>
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
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
              style={checkbox}
            />
            <span>I reviewed the agreement and Exhibit terms.</span>
          </label>
          <label style={check}>
            <input
              type="checkbox"
              checked={authority}
              onChange={(e) => setAuthority(e.target.checked)}
              style={checkbox}
            />
            <span>I am authorized to sign for the named organization.</span>
          </label>
          <label style={check}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={checkbox}
            />
            <span>{props.consentText}</span>
          </label>
          {error ? (
            <p id={errorId} role="alert" style={errorText}>
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={busy} aria-busy={busy} style={busy ? btnDisabled : btn}>
            {busy ? "Submitting…" : "Sign agreement"}
          </button>
        </form>
      </div>
    </main>
  );
}

function BrandHeader() {
  return (
    <header style={brandHeader}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/migrated-assets/brand/kxd-logo-transparent.png"
        alt="Kreate by Design"
        width={96}
        height={90}
        style={brandLogo}
      />
      <div style={brandRule} aria-hidden />
    </header>
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
    <div style={fieldWrap}>
      <label htmlFor={id} style={fieldLabel}>
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

const GOLD = "#c2aa72";
const GOLD_SOFT = "rgba(194, 170, 114, 0.22)";
const GOLD_BORDER = "rgba(194, 170, 114, 0.32)";
const INK = "#f4efe6";
const MUTED = "rgba(244, 239, 230, 0.62)";
const PAGE_BG = "#0a0a0a";
const SERIF = "Georgia, 'Iowan Old Style', Palatino, 'Times New Roman', serif";
const SANS = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const page: CSSProperties = {
  minHeight: "100vh",
  background: PAGE_BG,
  color: INK,
  padding: "2rem 1.15rem 3.5rem",
};

const container: CSSProperties = {
  width: "100%",
  maxWidth: 720,
  margin: "0 auto",
};

const brandHeader: CSSProperties = {
  marginBottom: "1.75rem",
};

const brandLogo: CSSProperties = {
  width: "5.25rem",
  height: "auto",
  display: "block",
  marginBottom: "1rem",
};

const brandRule: CSSProperties = {
  width: 40,
  height: 1,
  background: GOLD,
  opacity: 0.7,
};

const eyebrow: CSSProperties = {
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  fontSize: 11,
  color: GOLD,
  fontFamily: SANS,
  fontWeight: 500,
  margin: "0 0 0.65rem",
};

const h1: CSSProperties = {
  fontFamily: SERIF,
  fontWeight: 500,
  fontSize: "clamp(1.65rem, 4.5vw, 2.15rem)",
  lineHeight: 1.2,
  margin: "0 0 0.85rem",
  color: INK,
  letterSpacing: "-0.01em",
};

const operatorConfirm: CSSProperties = {
  fontFamily: SANS,
  fontSize: 13,
  lineHeight: 1.5,
  color: MUTED,
  margin: "0 0 1rem",
  padding: "0.65rem 0.85rem",
  borderLeft: `2px solid ${GOLD_BORDER}`,
  background: "rgba(194, 170, 114, 0.06)",
};

const lede: CSSProperties = {
  fontFamily: SANS,
  fontSize: 15,
  lineHeight: 1.65,
  color: MUTED,
  margin: "0 0 1.75rem",
};

const muted: CSSProperties = {
  fontFamily: SANS,
  fontSize: 14,
  lineHeight: 1.55,
  color: MUTED,
  margin: "0 0 1.5rem",
};

const strong: CSSProperties = {
  color: INK,
  fontWeight: 600,
};

const documentCard: CSSProperties = {
  background: "#fbf8f2",
  color: "#1a1714",
  borderRadius: 2,
  border: "1px solid rgba(255, 255, 255, 0.08)",
  boxShadow: "0 18px 48px rgba(0, 0, 0, 0.35)",
  marginBottom: "1.5rem",
  overflow: "hidden",
};

const documentHeader: CSSProperties = {
  padding: "1.15rem 1.35rem 0.85rem",
  borderBottom: "1px solid rgba(26, 23, 20, 0.08)",
};

const documentTitle: CSSProperties = {
  fontFamily: SERIF,
  fontWeight: 500,
  fontSize: 18,
  margin: "0 0 0.35rem",
  color: "#1a1714",
};

const scrollHint: CSSProperties = {
  fontSize: 12,
  color: "#7a7166",
  margin: 0,
  fontFamily: SANS,
};

const documentBody: CSSProperties = {
  whiteSpace: "pre-wrap",
  fontFamily: SERIF,
  fontSize: 14.5,
  lineHeight: 1.7,
  color: "#2a2622",
  maxHeight: "min(58vh, 520px)",
  overflow: "auto",
  margin: 0,
  padding: "1.25rem 1.35rem 1.5rem",
  outlineOffset: 2,
  WebkitOverflowScrolling: "touch",
};

const signCard: CSSProperties = {
  background: "#121212",
  border: `1px solid ${GOLD_BORDER}`,
  borderRadius: 2,
  padding: "1.35rem 1.35rem 1.5rem",
  marginBottom: "1.25rem",
  boxShadow: "0 12px 36px rgba(0, 0, 0, 0.28)",
};

const cardTitle: CSSProperties = {
  fontFamily: SERIF,
  fontWeight: 500,
  fontSize: 18,
  margin: "0 0 1.15rem",
  color: INK,
};

const cardBody: CSSProperties = {
  fontFamily: SANS,
  fontSize: 14,
  lineHeight: 1.6,
  color: MUTED,
  margin: "0 0 1rem",
};

const fieldWrap: CSSProperties = {
  marginBottom: 14,
};

const fieldLabel: CSSProperties = {
  display: "block",
  fontSize: 12,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: MUTED,
  marginBottom: 6,
  fontFamily: SANS,
  fontWeight: 500,
};

const input: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: 46,
  padding: "0.7rem 0.85rem",
  border: "1px solid rgba(244, 239, 230, 0.16)",
  borderRadius: 2,
  background: "#0d0d0d",
  color: INK,
  fontSize: 16,
  fontFamily: SANS,
  outline: "none",
};

const check: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  fontSize: 13.5,
  lineHeight: 1.5,
  marginBottom: 12,
  fontFamily: SANS,
  color: MUTED,
  cursor: "pointer",
};

const checkbox: CSSProperties = {
  marginTop: 3,
  width: 16,
  height: 16,
  flexShrink: 0,
  accentColor: GOLD,
};

const errorText: CSSProperties = {
  color: "#e8a0a0",
  fontFamily: SANS,
  fontSize: 14,
  lineHeight: 1.45,
  margin: "0.35rem 0 0.85rem",
};

const btn: CSSProperties = {
  marginTop: 10,
  width: "100%",
  background: GOLD,
  color: "#0a0a0a",
  border: 0,
  padding: "0.95rem 1.2rem",
  borderRadius: 2,
  cursor: "pointer",
  fontFamily: SANS,
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: "0.02em",
};

const btnDisabled: CSSProperties = {
  ...btn,
  opacity: 0.65,
  cursor: "wait",
};

const downloadList: CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  fontFamily: SANS,
  fontSize: 14,
};

const downloadItem: CSSProperties = {
  marginBottom: 8,
  paddingBottom: 8,
  borderBottom: `1px solid ${GOLD_SOFT}`,
};

const downloadLink: CSSProperties = {
  color: GOLD,
  textDecoration: "none",
};
