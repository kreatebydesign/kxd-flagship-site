"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  formatClientFacingBilling,
  formatClientFacingCreditAmount,
  formatClientFacingCreditType,
  formatClientFacingLineAmount,
  formatClientFacingMonthlyInvestment,
} from "@/lib/proposal-builder/client-facing-labels";
import { formatCents } from "@/lib/proposal-builder/money";
import {
  distinctScopeOrganizationName,
  formatCoverPreparedForLine,
  shouldShowRecurringInvestment,
} from "@/lib/proposal-builder/presentation";
import type { CanonicalProposal } from "@/lib/proposal-builder/types";

type ViewData = {
  accepted: boolean;
  canonical: CanonicalProposal;
  clientCanSelect: boolean;
  scheduleCallUrl: string | null;
  totals: CanonicalProposal["totals"];
};

export function PublicProposalBuilderExperience({ publicToken }: { publicToken: string }) {
  const [data, setData] = useState<ViewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"view" | "changes" | "accept" | "done">("view");
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const [changeForm, setChangeForm] = useState({
    name: "",
    email: "",
    organization: "",
    message: "",
  });
  const [acceptForm, setAcceptForm] = useState({
    name: "",
    title: "",
    organization: "",
    email: "",
    typedAcknowledgment: "",
    authorityConfirmed: false,
    reviewedConfirmed: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/proposal/${publicToken}/builder`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          if (!cancelled) setError(json.error ?? "Proposal not available.");
          return;
        }
        if (!cancelled) {
          setData(json);
          setSelectedLineIds(json.canonical.selectedLineIds ?? []);
          if (json.accepted) setMode("done");
        }
        await fetch(`/api/proposal/${publicToken}/builder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "view" }),
        });
      } catch {
        if (!cancelled) setError("Proposal not available.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicToken]);

  const optionalLines = useMemo(
    () =>
      data?.canonical.pricingLines.filter(
        (l) => l.inclusion === "optional" || l.isAddon,
      ) ?? [],
    [data],
  );

  async function submitChanges() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/proposal/${publicToken}/builder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request-changes", ...changeForm }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Could not submit change request.");
        return;
      }
      setMessage("Change request submitted. Kreate by Design will follow up.");
      setMode("view");
    } catch {
      setError("Could not submit change request.");
    } finally {
      setBusy(false);
    }
  }

  async function submitAccept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/proposal/${publicToken}/builder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accept",
          ...acceptForm,
          selectedLineIds,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Could not accept proposal.");
        return;
      }
      setMode("done");
      setMessage(
        json.alreadyAccepted
          ? "This proposal was already accepted."
          : "Proposal accepted. Kreate by Design will prepare the final agreement for review. This acceptance is not a signed contract.",
      );
    } catch {
      setError("Could not accept proposal.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) {
    return (
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "4rem 1.25rem" }}>
        <p>{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "4rem 1.25rem" }}>
        <p>Loading proposal…</p>
      </main>
    );
  }

  const p = data.canonical;
  const currency = p.currency || "USD";

  return (
    <main style={{ background: "#f7f1e6", minHeight: "100vh", color: "#0c0c0c" }}>
      <header
        style={{
          background: "#080808",
          color: "#f7f1e6",
          padding: "4.5rem 1.5rem 3.5rem",
        }}
      >
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/migrated-assets/brand/kxd-logo-transparent.png"
            alt="Kreate by Design"
            width={88}
            height={83}
            style={{ width: "5.5rem", height: "auto", margin: "0 0 1.75rem", display: "block" }}
          />
          <p
            style={{
              fontFamily: "system-ui,sans-serif",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontSize: 11,
              color: "#a39e93",
            }}
          >
            Proposal
          </p>
          <div style={{ width: 42, height: 1, background: "#c5a65c", margin: "16px 0 20px" }} />
          <h1
            style={{
              fontFamily: "Georgia, 'Iowan Old Style', Palatino, serif",
              fontWeight: 500,
              fontSize: "clamp(2rem, 5vw, 3rem)",
              lineHeight: 1.15,
              margin: "0 0 1rem",
            }}
          >
            {p.title}
          </h1>
          <p style={{ fontFamily: "system-ui,sans-serif", color: "#d9d2c5", lineHeight: 1.7 }}>
            {formatCoverPreparedForLine(p.primaryOrganization, p.organizations)}
            {p.primaryContact &&
            [p.primaryContact.name, p.primaryContact.title, p.primaryContact.email, p.primaryContact.phone]
              .map((part) => (typeof part === "string" ? part.trim() : ""))
              .filter(Boolean).length > 0 ? (
              <>
                <br />
                Primary contact ·{" "}
                {[
                  p.primaryContact.name,
                  p.primaryContact.title,
                  p.primaryContact.email,
                  p.primaryContact.phone,
                ]
                  .map((part) => (typeof part === "string" ? part.trim() : ""))
                  .filter(Boolean)
                  .join(" · ")}
              </>
            ) : null}
            <br />
            {p.proposalNumber} · Version {p.version}
            <br />
            Prepared by Kreate by Design
          </p>
        </div>
      </header>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "2.5rem 1.25rem 5rem" }}>
        {message ? (
          <p role="status" style={{ marginBottom: "1.25rem", color: "#2f6b4f" }}>
            {message}
          </p>
        ) : null}
        {error ? (
          <p role="alert" style={{ marginBottom: "1.25rem", color: "#8b2e2e" }}>
            {error}
          </p>
        ) : null}

        {p.executive.executiveSummary ? (
          <section style={{ marginBottom: "2rem" }}>
            <p style={eyebrow}>Executive summary</p>
            <h2 style={h2}>Where this begins</h2>
            <p style={body}>{p.executive.executiveSummary}</p>
          </section>
        ) : null}

        {p.executive.objectives ? (
          <section style={{ marginBottom: "2rem" }}>
            <p style={eyebrow}>Objectives</p>
            <h2 style={h2}>What success requires</h2>
            <p style={body}>{p.executive.objectives}</p>
          </section>
        ) : null}

        {p.executive.recommendedDirection ? (
          <section style={{ marginBottom: "2rem" }}>
            <p style={eyebrow}>Direction</p>
            <h2 style={h2}>Recommended path</h2>
            <p style={body}>{p.executive.recommendedDirection}</p>
          </section>
        ) : null}

        {p.scopeGroups.map((g) => {
          const scopeOrg = distinctScopeOrganizationName(g.organizationName, p.primaryOrganization);
          return (
          <section key={g.id} style={{ marginBottom: "2rem" }}>
            <p style={eyebrow}>Included work</p>
            <h2 style={h2}>{g.title}</h2>
            {scopeOrg ? <p style={meta}>{scopeOrg}</p> : null}
            {g.overview ? <p style={body}>{g.overview}</p> : null}
            {g.deliverables.length > 0 ? (
              <ul style={{ lineHeight: 1.6 }}>
                {g.deliverables.map((d) => (
                  <li key={d.id}>
                    <strong>{d.title}</strong>
                    {d.description ? `: ${d.description}` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
          );
        })}

        <section style={{ marginBottom: "2rem" }}>
          <p style={eyebrow}>Investment</p>
          <h2 style={h2}>Pricing</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "system-ui,sans-serif", fontSize: 14 }}>
              <tbody>
                {p.pricingLines.map((line) => (
                  <tr key={line.id}>
                    <td style={td}>
                      {data.clientCanSelect && (line.inclusion === "optional" || line.isAddon) ? (
                        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input
                            type="checkbox"
                            disabled={data.accepted}
                            checked={selectedLineIds.includes(line.id)}
                            onChange={(e) => {
                              setSelectedLineIds((prev) =>
                                e.target.checked
                                  ? [...prev, line.id]
                                  : prev.filter((id) => id !== line.id),
                              );
                            }}
                          />
                          {line.title}
                        </label>
                      ) : (
                        line.title
                      )}
                    </td>
                    <td style={td}>
                      {line.inclusion === "optional" || line.isAddon
                        ? "Optional"
                        : formatClientFacingBilling(line.cadence)}
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      {formatClientFacingLineAmount(
                        line.unitPriceCents * (line.quantity || 1),
                        line.cadence,
                        currency,
                      )}
                    </td>
                  </tr>
                ))}
                {p.credits.map((c) => (
                  <tr key={c.id}>
                    <td style={td}>{c.label}</td>
                    <td style={td}>{formatClientFacingCreditType(c.kind)}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      {formatClientFacingCreditAmount(c, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            style={{
              marginTop: 16,
              padding: 16,
              background: "#f3ebe0",
              border: "1px solid #e2d8c8",
              borderRadius: 2,
              fontFamily: "system-ui,sans-serif",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span>One-time total</span>
              <strong>{formatCents(data.totals.oneTimeTotalCents, currency)}</strong>
            </div>
            {shouldShowRecurringInvestment(data.totals.monthlyTotalCents) ? (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Monthly total</span>
                <strong>
                  {formatClientFacingMonthlyInvestment(data.totals.monthlyTotalCents, currency)}
                </strong>
              </div>
            ) : null}
          </div>
          {optionalLines.length > 0 && data.clientCanSelect ? (
            <p style={{ ...meta, marginTop: 10 }}>
              Optional items selected before acceptance update the final accepted total.
            </p>
          ) : null}
        </section>

        <section
          style={{
            marginBottom: "2rem",
            padding: 16,
            background: "#f3ebe0",
            borderLeft: "2px solid #c5a65c",
          }}
        >
          <p style={body}>{p.disclosures.acceptance}</p>
          <p style={body}>{p.disclosures.contractRequired}</p>
        </section>

        {mode === "done" || data.accepted ? (
          <section>
            <h2 style={h2}>Accepted. Contract pending.</h2>
            <p style={body}>
              Thank you. Kreate by Design will prepare the final agreement for review. No payment
              has been collected and no contract has been signed through this step.
            </p>
          </section>
        ) : mode === "changes" ? (
          <section>
            <h2 style={h2}>Request changes</h2>
            <FormField label="Name" value={changeForm.name} onChange={(v) => setChangeForm({ ...changeForm, name: v })} />
            <FormField label="Email" value={changeForm.email} onChange={(v) => setChangeForm({ ...changeForm, email: v })} />
            <FormField label="Organization" value={changeForm.organization} onChange={(v) => setChangeForm({ ...changeForm, organization: v })} />
            <label style={{ display: "block", marginBottom: 12 }}>
              <span style={eyebrow}>Message</span>
              <textarea
                value={changeForm.message}
                onChange={(e) => setChangeForm({ ...changeForm, message: e.target.value })}
                style={input}
              />
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" style={btn} disabled={busy} onClick={() => void submitChanges()}>
                Submit request
              </button>
              <button type="button" style={btnGhost} onClick={() => setMode("view")}>
                Cancel
              </button>
            </div>
          </section>
        ) : mode === "accept" ? (
          <section>
            <h2 style={h2}>Accept and proceed to contract</h2>
            <p style={body}>
              Final one-time: {formatCents(data.totals.oneTimeTotalCents, currency)}
              {shouldShowRecurringInvestment(data.totals.monthlyTotalCents)
                ? ` · Monthly: ${formatClientFacingMonthlyInvestment(data.totals.monthlyTotalCents, currency)}`
                : ""}{" "}
              · Version {p.version}
            </p>
            <FormField label="Full legal name" value={acceptForm.name} onChange={(v) => setAcceptForm({ ...acceptForm, name: v })} />
            <FormField label="Title" value={acceptForm.title} onChange={(v) => setAcceptForm({ ...acceptForm, title: v })} />
            <FormField label="Organization" value={acceptForm.organization} onChange={(v) => setAcceptForm({ ...acceptForm, organization: v })} />
            <FormField label="Email" value={acceptForm.email} onChange={(v) => setAcceptForm({ ...acceptForm, email: v })} />
            <FormField
              label="Type your legal name to acknowledge"
              value={acceptForm.typedAcknowledgment}
              onChange={(v) => setAcceptForm({ ...acceptForm, typedAcknowledgment: v })}
            />
            <p style={{ ...body, fontSize: 13, opacity: 0.85 }}>
              Typing your legal name is an electronic acknowledgment that authorizes Kreate by Design
              to prepare the final agreement. It is not a substitute for the signed contract.
            </p>
            <label style={{ display: "flex", gap: 8, marginBottom: 10, fontFamily: "system-ui,sans-serif" }}>
              <input
                type="checkbox"
                checked={acceptForm.authorityConfirmed}
                onChange={(e) =>
                  setAcceptForm({ ...acceptForm, authorityConfirmed: e.target.checked })
                }
              />
              I confirm I have authority to approve this proposal.
            </label>
            <label style={{ display: "flex", gap: 8, marginBottom: 16, fontFamily: "system-ui,sans-serif" }}>
              <input
                type="checkbox"
                checked={acceptForm.reviewedConfirmed}
                onChange={(e) =>
                  setAcceptForm({ ...acceptForm, reviewedConfirmed: e.target.checked })
                }
              />
              I confirm I have reviewed this proposal.
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" style={btn} disabled={busy} onClick={() => void submitAccept()}>
                Accept and proceed
              </button>
              <button type="button" style={btnGhost} onClick={() => setMode("view")}>
                Cancel
              </button>
            </div>
          </section>
        ) : (
          <section style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a href={`/api/proposal/${publicToken}/builder?download=pdf`} style={btn}>
              Download PDF
            </a>
            <button type="button" style={btnGhost} onClick={() => setMode("changes")}>
              Request changes
            </button>
            <button type="button" style={btn} onClick={() => setMode("accept")}>
              Accept proposal
            </button>
            {data.scheduleCallUrl ? (
              <a href={data.scheduleCallUrl} target="_blank" rel="noreferrer" style={btnGhost}>
                Schedule a call
              </a>
            ) : null}
          </section>
        )}
      </div>
    </main>
  );
}

function FormField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span style={eyebrow}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} style={input} />
    </label>
  );
}

const eyebrow: CSSProperties = {
  fontFamily: "system-ui,sans-serif",
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "#6f6a62",
  marginBottom: 8,
  display: "block",
};
const h2: CSSProperties = {
  fontFamily: "Georgia, 'Iowan Old Style', Palatino, serif",
  fontWeight: 500,
  fontSize: "1.55rem",
  margin: "0 0 12px",
};
const body: CSSProperties = { lineHeight: 1.65, fontSize: "1.05rem" };
const meta: CSSProperties = { fontFamily: "system-ui,sans-serif", color: "#6f6a62" };
const td: CSSProperties = {
  padding: "10px 8px",
  borderBottom: "1px solid #e2d8c8",
  verticalAlign: "top",
};
const input: CSSProperties = {
  width: "100%",
  marginTop: 6,
  border: "1px solid #e2d8c8",
  borderRadius: 2,
  padding: "0.65rem 0.75rem",
  background: "#fffdf8",
  font: "inherit",
};
const btn: CSSProperties = {
  display: "inline-block",
  border: "1px solid #080808",
  background: "#080808",
  color: "#f7f1e6",
  borderRadius: 2,
  padding: "0.7rem 1rem",
  fontFamily: "system-ui,sans-serif",
  textDecoration: "none",
  cursor: "pointer",
};
const btnGhost: CSSProperties = {
  ...btn,
  background: "transparent",
  color: "#080808",
};
