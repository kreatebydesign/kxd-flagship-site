"use client";

import { useId, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";

export function ContractSigningClient(props: {
  /** Capability token from the URL — required to POST the signature. */
  publicToken: string;
  title: string;
  /** Optional client / party name for the agreement header (display only). */
  clientName?: string;
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
  const clientLabel = (props.clientName ?? "").trim();

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
          <header style={agreementHeader}>
            <p style={eyebrow}>Agreement complete</p>
            <h1 style={h1}>Signed and sealed</h1>
            {clientLabel ? <p style={clientLine}>{clientLabel}</p> : null}
          </header>
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

        <header style={agreementHeader}>
          <p style={eyebrow}>Electronic signature</p>
          <h1 style={h1}>{props.title}</h1>
          {clientLabel ? <p style={clientLine}>{clientLabel}</p> : null}
          <p style={statusPill} role="status">
            Ready for Signature
          </p>
        </header>

        <p style={operatorConfirm}>
          Already signed by KXD · {props.operatorSignedBy}
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
          <div style={documentScroll} tabIndex={0}>
            <div style={documentMeasure}>
              <AgreementDocumentBody text={props.body} />
            </div>
          </div>
        </section>

        <form
          onSubmit={onSubmit}
          style={signCard}
          aria-labelledby={`${formId}-sign`}
          aria-describedby={error ? errorId : undefined}
        >
          <h2 id={`${formId}-sign`} style={cardTitle}>
            Your Signature
          </h2>
          <p style={cardBody}>
            Sign as an authorized representative of the named organization.
          </p>
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
          <label style={checkConsent}>
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

/** Presentation-only: preserve exact wording while styling headings and bullets. */
function AgreementDocumentBody({ text }: { text: string }) {
  const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let key = 0;

  function flushBullets() {
    if (!bulletBuffer.length) return;
    blocks.push(
      <ul key={`ul-${key++}`} style={bulletList}>
        {bulletBuffer.map((item, i) => (
          <li key={`li-${key}-${i}`} style={bulletItem}>
            {item}
          </li>
        ))}
      </ul>,
    );
    bulletBuffer = [];
  }

  for (const raw of lines) {
    const line = raw;
    const trimmed = line.trim();
    if (!trimmed) {
      flushBullets();
      blocks.push(<div key={`sp-${key++}`} style={sectionGap} aria-hidden />);
      continue;
    }
    const bulletMatch = trimmed.match(/^[•\-\*]\s+(.*)$/);
    if (bulletMatch) {
      bulletBuffer.push(bulletMatch[1] ?? "");
      continue;
    }
    flushBullets();
    if (isSectionHeading(trimmed)) {
      blocks.push(
        <h3 key={`h-${key++}`} style={sectionHeading}>
          {trimmed}
        </h3>,
      );
      continue;
    }
    blocks.push(
      <p key={`p-${key++}`} style={paragraph}>
        {line}
      </p>,
    );
  }
  flushBullets();

  return <div style={documentInner}>{blocks}</div>;
}

function isSectionHeading(line: string): boolean {
  if (line.length < 2 || line.length > 64) return false;
  if (/[.!?]$/.test(line)) return false;
  if (line.includes(":")) return false;
  // ALL-CAPS section labels used in KXD agreement drafts (PARTIES, SCOPE, …).
  return /^[A-Z0-9][A-Z0-9 &/\-]{0,62}$/.test(line);
}

function BrandHeader() {
  return (
    <div style={brandHeader}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/migrated-assets/brand/kxd-logo-transparent.png"
        alt="Kreate by Design"
        width={96}
        height={90}
        style={brandLogo}
      />
    </div>
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
const GOLD_BORDER = "rgba(194, 170, 114, 0.28)";
const INK = "#f4efe6";
const MUTED = "rgba(244, 239, 230, 0.58)";
const PAGE_BG = "#0a0a0a";
const DOC_INK = "#2c2824";
const DOC_MUTED = "#6e675e";
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
  maxWidth: 680,
  margin: "0 auto",
};

const brandHeader: CSSProperties = {
  marginBottom: "1.5rem",
};

const brandLogo: CSSProperties = {
  width: "4.75rem",
  height: "auto",
  display: "block",
};

const agreementHeader: CSSProperties = {
  marginBottom: "1.15rem",
  paddingBottom: "1.15rem",
  borderBottom: `1px solid ${GOLD_BORDER}`,
};

const eyebrow: CSSProperties = {
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  fontSize: 10,
  color: GOLD,
  fontFamily: SANS,
  fontWeight: 500,
  margin: "0 0 0.55rem",
};

const h1: CSSProperties = {
  fontFamily: SERIF,
  fontWeight: 500,
  fontSize: "clamp(1.35rem, 3.6vw, 1.75rem)",
  lineHeight: 1.25,
  margin: "0 0 0.45rem",
  color: INK,
  letterSpacing: "-0.01em",
};

const clientLine: CSSProperties = {
  fontFamily: SANS,
  fontSize: 14,
  color: MUTED,
  margin: "0 0 0.75rem",
};

const statusPill: CSSProperties = {
  display: "inline-block",
  margin: 0,
  fontFamily: SANS,
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: GOLD,
  border: `1px solid ${GOLD_BORDER}`,
  padding: "0.35rem 0.65rem",
  borderRadius: 1,
  background: "rgba(194, 170, 114, 0.07)",
};

const operatorConfirm: CSSProperties = {
  fontFamily: SANS,
  fontSize: 12.5,
  lineHeight: 1.5,
  color: MUTED,
  margin: "0 0 1rem",
  padding: "0.55rem 0 0.55rem 0.75rem",
  borderLeft: `2px solid ${GOLD_BORDER}`,
};

const lede: CSSProperties = {
  fontFamily: SANS,
  fontSize: 13.5,
  lineHeight: 1.6,
  color: MUTED,
  margin: "0 0 1.5rem",
};

const muted: CSSProperties = {
  fontFamily: SANS,
  fontSize: 13.5,
  lineHeight: 1.55,
  color: MUTED,
  margin: "0 0 1.5rem",
};

const strong: CSSProperties = {
  color: INK,
  fontWeight: 600,
};

const documentCard: CSSProperties = {
  background: "#f7f3eb",
  color: DOC_INK,
  borderRadius: 2,
  border: "1px solid rgba(194, 170, 114, 0.22)",
  boxShadow: "0 10px 28px rgba(0, 0, 0, 0.28)",
  marginBottom: "1.75rem",
  overflow: "hidden",
};

const documentHeader: CSSProperties = {
  padding: "0.95rem 1.25rem 0.75rem",
  borderBottom: "1px solid rgba(44, 40, 36, 0.08)",
  background: "#faf7f1",
};

const documentTitle: CSSProperties = {
  fontFamily: SERIF,
  fontWeight: 500,
  fontSize: 15,
  margin: "0 0 0.25rem",
  color: DOC_INK,
  letterSpacing: "0.02em",
};

const scrollHint: CSSProperties = {
  fontSize: 11.5,
  color: DOC_MUTED,
  margin: 0,
  fontFamily: SANS,
};

const documentScroll: CSSProperties = {
  maxHeight: "min(62vh, 560px)",
  overflow: "auto",
  WebkitOverflowScrolling: "touch",
  outlineOffset: 2,
};

const documentMeasure: CSSProperties = {
  padding: "1.15rem 1.25rem 1.5rem",
};

const documentInner: CSSProperties = {
  maxWidth: 560,
  margin: "0 auto",
};

const sectionHeading: CSSProperties = {
  fontFamily: SANS,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#1f1c19",
  margin: "1.15rem 0 0.45rem",
  paddingBottom: "0.3rem",
  borderBottom: "1px solid rgba(44, 40, 36, 0.1)",
};

const paragraph: CSSProperties = {
  fontFamily: SERIF,
  fontSize: 15.5,
  lineHeight: 1.6,
  color: DOC_INK,
  margin: "0 0 0.55rem",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
};

const sectionGap: CSSProperties = {
  height: "0.55rem",
};

const bulletList: CSSProperties = {
  margin: "0.15rem 0 0.7rem",
  padding: "0 0 0 1.15rem",
  listStyleType: "disc",
};

const bulletItem: CSSProperties = {
  fontFamily: SERIF,
  fontSize: 15.5,
  lineHeight: 1.55,
  color: DOC_INK,
  marginBottom: "0.3rem",
  paddingLeft: "0.15rem",
};

const signCard: CSSProperties = {
  background: "#121212",
  border: `1px solid ${GOLD_BORDER}`,
  borderRadius: 2,
  padding: "1.25rem 1.25rem 1.4rem",
  marginBottom: "1.25rem",
  boxShadow: "0 10px 28px rgba(0, 0, 0, 0.24)",
};

const cardTitle: CSSProperties = {
  fontFamily: SERIF,
  fontWeight: 500,
  fontSize: 17,
  margin: "0 0 0.35rem",
  color: INK,
};

const cardBody: CSSProperties = {
  fontFamily: SANS,
  fontSize: 12.5,
  lineHeight: 1.55,
  color: MUTED,
  margin: "0 0 1.05rem",
};

const fieldWrap: CSSProperties = {
  marginBottom: 13,
};

const fieldLabel: CSSProperties = {
  display: "block",
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: MUTED,
  marginBottom: 5,
  fontFamily: SANS,
  fontWeight: 500,
};

const input: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: 44,
  padding: "0.65rem 0.8rem",
  border: "1px solid rgba(244, 239, 230, 0.14)",
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
  fontSize: 13,
  lineHeight: 1.45,
  marginBottom: 10,
  fontFamily: SANS,
  color: MUTED,
  cursor: "pointer",
};

const checkConsent: CSSProperties = {
  ...check,
  fontSize: 12,
  lineHeight: 1.5,
  marginBottom: 14,
  color: "rgba(244, 239, 230, 0.5)",
};

const checkbox: CSSProperties = {
  marginTop: 2,
  width: 15,
  height: 15,
  flexShrink: 0,
  accentColor: GOLD,
};

const errorText: CSSProperties = {
  color: "#e8a0a0",
  fontFamily: SANS,
  fontSize: 13.5,
  lineHeight: 1.45,
  margin: "0.25rem 0 0.85rem",
};

const btn: CSSProperties = {
  marginTop: 4,
  width: "100%",
  background: GOLD,
  color: "#0a0a0a",
  border: 0,
  padding: "0.9rem 1.15rem",
  borderRadius: 2,
  cursor: "pointer",
  fontFamily: SANS,
  fontSize: 14.5,
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
  borderBottom: "1px solid rgba(194, 170, 114, 0.18)",
};

const downloadLink: CSSProperties = {
  color: GOLD,
  textDecoration: "none",
};
