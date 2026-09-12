"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  composeClosingPresentation,
  composeCoverPresentation,
  composeInvestmentPresentation,
  composeOpeningSections,
  composeScopeWorkstream,
  composeTermsSectionPlan,
  proseKindForTermsKey,
  shouldShowRecurringInvestment,
  structureProposalProse,
  type ProposalProseBlock,
} from "@/lib/proposal-builder/presentation";
import type { CanonicalProposal } from "@/lib/proposal-builder/types";
import { publicBookingUrl } from "@/lib/proposal-builder/booking-url";
import { formatCents } from "@/lib/proposal-builder/money";
import {
  formatClientFacingCreditAmount,
  formatClientFacingCreditType,
  formatClientFacingMonthlyInvestment,
} from "@/lib/proposal-builder/client-facing-labels";

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
  const bookingHref = publicBookingUrl(data.scheduleCallUrl);
  const cover = composeCoverPresentation(p);
  const opening = composeOpeningSections(p);
  const investment = composeInvestmentPresentation(p);
  const terms = composeTermsSectionPlan(p);
  const closing = composeClosingPresentation(p);
  const workstreams = p.scopeGroups.map((group, index) =>
    composeScopeWorkstream(group, index, p.scopeGroups.length),
  );

  return (
    <main style={{ background: "#f7f1e6", minHeight: "100vh", color: "#0c0c0c" }}>
      <header
        style={{
          background: "#080808",
          color: "#f7f1e6",
          padding: "clamp(2.75rem, 6vw, 4.5rem) clamp(1.25rem, 4vw, 2rem) clamp(3rem, 7vw, 5rem)",
        }}
      >
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/migrated-assets/brand/kxd-logo-transparent.png"
            alt="Kreate by Design"
            width={104}
            height={98}
            style={{ width: "5.75rem", height: "auto", margin: "0 0 2rem", display: "block" }}
          />
          <p
            style={{
              fontFamily: "system-ui,sans-serif",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              fontSize: 11,
              color: "#a39e93",
              marginBottom: 14,
            }}
          >
            {cover.docType}
          </p>
          <div style={{ width: 48, height: 1, background: "#c5a65c", margin: "0 0 2rem" }} />
          {cover.organizationLines.map((line, index) => (
            <div key={`${index}-${line}`}>
              {index > 0 && cover.organizationJoiner ? (
                <p
                  style={{
                    fontFamily: "system-ui,sans-serif",
                    color: "#c5a65c",
                    letterSpacing: "0.18em",
                    margin: "0.85rem 0",
                    fontSize: 14,
                  }}
                >
                  {cover.organizationJoiner}
                </p>
              ) : null}
              <h1
                style={{
                  fontFamily: "Georgia, 'Iowan Old Style', Palatino, serif",
                  fontWeight: 500,
                  fontSize: "clamp(2.1rem, 5vw, 3.15rem)",
                  lineHeight: 1.12,
                  margin: 0,
                  maxWidth: "16ch",
                }}
              >
                {line}
              </h1>
            </div>
          ))}
          <p
            style={{
              fontFamily: "system-ui,sans-serif",
              color: "#a39e93",
              marginTop: "1.75rem",
              marginBottom: "2.25rem",
              maxWidth: 420,
              lineHeight: 1.55,
              fontSize: 15,
            }}
          >
            {cover.engagementTitle}
          </p>
          {cover.preparedForName ? (
            <>
              <p
                style={{
                  fontFamily: "system-ui,sans-serif",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fontSize: 11,
                  color: "#a39e93",
                  marginBottom: 6,
                }}
              >
                Prepared for
              </p>
              <p
                style={{
                  fontFamily: "Georgia, 'Iowan Old Style', Palatino, serif",
                  fontSize: 20,
                  margin: "0 0 0.35rem",
                }}
              >
                {cover.preparedForName}
              </p>
            </>
          ) : null}
          {cover.preparedForDetail ? (
            <p style={{ fontFamily: "system-ui,sans-serif", color: "#d9d2c5", marginBottom: "1.5rem" }}>
              {cover.preparedForDetail}
            </p>
          ) : null}
          <div style={{ fontFamily: "system-ui,sans-serif", color: "#a39e93", lineHeight: 1.7, fontSize: 14 }}>
            {cover.metaLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
            <div style={{ marginTop: 18, color: "#f7f1e6", fontFamily: "Georgia, serif", fontSize: 16 }}>
              {cover.studioLine}
            </div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "clamp(2.5rem, 5vw, 4rem) 1.25rem 5rem" }}>
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

        {opening.map((section) => (
          <section
            key={section.id}
            style={{
              marginBottom: section.emphasis === "lead" ? "3rem" : "2.25rem",
              maxWidth: section.emphasis === "supporting" ? 640 : 720,
            }}
          >
            <p style={eyebrow}>{section.eyebrow}</p>
            <h2 style={h2}>{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 48)} style={{ ...body, marginBottom: "1rem" }}>
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        {workstreams.map((workstream) => (
          <section
            key={`${workstream.indexLabel}-${workstream.title}`}
            style={{
              marginBottom: "3.25rem",
              paddingTop: "0.5rem",
              borderTop: "1px solid #e2d8c8",
            }}
          >
            <p style={{ ...eyebrow, color: "#9a8244", letterSpacing: "0.22em" }}>
              {workstream.indexLabel}
            </p>
            <h2 style={{ ...h2, fontSize: "clamp(1.7rem, 3vw, 2.1rem)", marginBottom: 6 }}>
              {workstream.title}
            </h2>
            {workstream.subtitle ? (
              <p
                style={{
                  fontFamily: "system-ui,sans-serif",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontSize: 12,
                  color: "#6f6a62",
                  marginBottom: 14,
                }}
              >
                {workstream.subtitle}
              </p>
            ) : null}
            <div style={{ width: 36, height: 1, background: "#c5a65c", marginBottom: 16 }} />
            {workstream.overview ? <p style={{ ...body, marginBottom: "1.25rem" }}>{workstream.overview}</p> : null}
            {workstream.deliverables.length > 0 ? (
              <>
                <p style={{ ...eyebrow, color: "#9a8244" }}>Deliverables</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {workstream.deliverables.map((item) => (
                    <li
                      key={item.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "14px 1fr",
                        gap: 10,
                        marginBottom: 14,
                        lineHeight: 1.55,
                        maxWidth: 640,
                      }}
                    >
                      <span style={{ color: "#9a8244" }}>•</span>
                      <span>
                        <strong style={{ fontWeight: 600 }}>{item.title}</strong>
                        {item.description ? ` — ${item.description}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        ))}

        <section
          style={{
            marginBottom: "3rem",
            paddingTop: "1rem",
            borderTop: "1px solid #e2d8c8",
          }}
        >
          <p style={eyebrow}>{investment.eyebrow}</p>
          <h2 style={h2}>{investment.title}</h2>
          <div
            style={{
              background: "#f3ebe0",
              borderLeft: "2px solid #c5a65c",
              padding: "1.35rem 1.25rem",
              marginBottom: "1.5rem",
            }}
          >
            <p style={{ ...eyebrow, marginBottom: 10 }}>{investment.heroEyebrow}</p>
            <p
              style={{
                fontFamily: "Georgia, 'Iowan Old Style', Palatino, serif",
                fontSize: "clamp(2rem, 4vw, 2.6rem)",
                margin: "0 0 0.35rem",
                lineHeight: 1.1,
              }}
            >
              {investment.heroAmount}
            </p>
            <p style={{ ...meta, marginBottom: 8 }}>Total project investment</p>
            {investment.paymentSummary ? (
              <p style={{ fontFamily: "system-ui,sans-serif", fontWeight: 600, margin: 0 }}>
                {investment.paymentSummary}
              </p>
            ) : null}
          </div>

          {investment.annualLines.length > 0 ? (
            <div style={{ marginBottom: "1.5rem" }}>
              <p style={{ ...eyebrow, color: "#9a8244" }}>Annual hosting</p>
              {investment.annualLines.map((line) => (
                <div
                  key={line.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "0.7rem 0",
                    borderBottom: "1px solid #e2d8c8",
                    fontFamily: "system-ui,sans-serif",
                  }}
                >
                  <span>{line.title}</span>
                  <strong>{line.amountLabel}</strong>
                </div>
              ))}
              {investment.annualTotalLabel ? (
                <p style={{ ...meta, marginTop: 10 }}>{investment.annualTotalLabel}</p>
              ) : null}
            </div>
          ) : null}

          {investment.monthlyLines.length > 0 ? (
            <div style={{ marginBottom: "1.5rem" }}>
              <p style={{ ...eyebrow, color: "#9a8244" }}>Monthly</p>
              {investment.monthlyLines.map((line) => (
                <div
                  key={line.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "0.7rem 0",
                    borderBottom: "1px solid #e2d8c8",
                    fontFamily: "system-ui,sans-serif",
                  }}
                >
                  <span>
                    {data.clientCanSelect && line.optional ? (
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
                  </span>
                  <strong>{line.amountLabel}</strong>
                </div>
              ))}
            </div>
          ) : investment.monthlyNoneLabel ? (
            <div style={{ marginBottom: "1.5rem" }}>
              <p style={{ ...eyebrow, color: "#9a8244" }}>Monthly management</p>
              <p style={meta}>{investment.monthlyNoneLabel}</p>
            </div>
          ) : null}

          {investment.quarterlyLines.length > 0 ? (
            <div style={{ marginBottom: "1.5rem" }}>
              <p style={{ ...eyebrow, color: "#9a8244" }}>Quarterly</p>
              {investment.quarterlyLines.map((line) => (
                <div
                  key={line.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "0.7rem 0",
                    borderBottom: "1px solid #e2d8c8",
                    fontFamily: "system-ui,sans-serif",
                  }}
                >
                  <span>{line.title}</span>
                  <strong>{line.amountLabel}</strong>
                </div>
              ))}
            </div>
          ) : null}

          {p.credits.length > 0 ? (
            <div style={{ marginBottom: "1.5rem" }}>
              <p style={{ ...eyebrow, color: "#9a8244" }}>Credits & adjustments</p>
              {p.credits.map((credit) => (
                <div
                  key={credit.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "0.7rem 0",
                    borderBottom: "1px solid #e2d8c8",
                    fontFamily: "system-ui,sans-serif",
                  }}
                >
                  <span>
                    {credit.label} · {formatClientFacingCreditType(credit.kind)}
                  </span>
                  <strong>{formatClientFacingCreditAmount(credit, currency)}</strong>
                </div>
              ))}
            </div>
          ) : null}

          {investment.showDetailedSchedule ? (
            <div style={{ marginBottom: "1rem" }}>
              <p style={{ ...eyebrow, color: "#9a8244" }}>Payment schedule</p>
              {investment.scheduleRows.map((row) => (
                <div
                  key={row.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "0.7rem 0",
                    borderBottom: "1px solid #e2d8c8",
                    fontFamily: "system-ui,sans-serif",
                  }}
                >
                  <span>
                    {row.label}
                    <br />
                    <span style={{ color: "#6f6a62" }}>{row.timing}</span>
                  </span>
                  <strong>{row.amount}</strong>
                </div>
              ))}
            </div>
          ) : null}

          {optionalLines.length > 0 && data.clientCanSelect ? (
            <p style={{ ...meta, marginTop: 10 }}>
              Optional items selected before acceptance update the final accepted total.
            </p>
          ) : null}
        </section>

        {terms.map((section) => (
          <section
            key={section.key}
            style={{
              marginBottom: "2.5rem",
              maxWidth: section.layout === "editorial" ? 880 : 720,
            }}
          >
            <p style={eyebrow}>{section.eyebrow}</p>
            <h2 style={h2}>{section.title}</h2>
            <StructuredProseBlocks
              blocks={structureProposalProse(
                section.text,
                proseKindForTermsKey(
                  section.key as
                    | "clientResponsibilities"
                    | "exclusions"
                    | "nextSteps"
                    | "proposalTerms"
                    | "paymentAssumptions"
                    | "timelineAssumptions"
                    | "expirationLanguage"
                    | "changeRequestLanguage",
                ),
              )}
              editorial={section.layout === "editorial"}
            />
          </section>
        ))}

        <section
          style={{
            marginBottom: "2.5rem",
            padding: "clamp(1.5rem, 4vw, 2.25rem)",
            background: "#f3ebe0",
            minHeight: 280,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p style={eyebrow}>{closing.eyebrow}</p>
            <h2 style={h2}>{closing.title}</h2>
            <StructuredProseBlocks
              blocks={structureProposalProse(closing.nextSteps, proseKindForTermsKey("nextSteps"))}
            />
            {closing.closingNote ? <p style={body}>{closing.closingNote}</p> : null}
            {closing.acceptance ? (
              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  background: "#fffdf8",
                  borderLeft: "2px solid #c5a65c",
                }}
              >
                <p style={{ ...eyebrow, marginBottom: 8 }}>Proposal acceptance</p>
                <p style={{ ...body, fontSize: "0.98rem", margin: 0 }}>{closing.acceptance}</p>
              </div>
            ) : null}
          </div>
          <p
            style={{
              marginTop: 28,
              fontFamily: "Georgia, 'Iowan Old Style', Palatino, serif",
              fontSize: 18,
            }}
          >
            Kreate by Design
          </p>
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
            {bookingHref ? (
              <a
                href={bookingHref}
                target="_blank"
                rel="noopener noreferrer"
                style={btnGhost}
              >
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

function StructuredProseBlocks({
  blocks,
  editorial = false,
}: {
  blocks: ProposalProseBlock[];
  editorial?: boolean;
}) {
  if (editorial) {
    const paragraphs = blocks.filter((block) => block.type === "paragraph");
    const items = blocks.flatMap((block) => (block.type === "paragraph" ? [] : block.items));
    if (items.length >= 4) {
      const midpoint = Math.ceil(items.length / 2);
      const left = items.slice(0, midpoint);
      const right = items.slice(midpoint);
      return (
        <>
          {paragraphs.map((block, index) =>
            block.type === "paragraph" ? (
              <p key={`p-${index}`} style={{ ...body, margin: "0 0 0.85rem" }}>
                {block.text}
              </p>
            ) : null,
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1rem 2rem",
            }}
          >
            <ul style={structuredList}>
              {left.map((item, index) => (
                <li key={`l-${index}`} style={structuredListItem}>
                  {item}
                </li>
              ))}
            </ul>
            <ul style={structuredList}>
              {right.map((item, index) => (
                <li key={`r-${index}`} style={structuredListItem}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </>
      );
    }
  }

  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === "paragraph") {
          return (
            <p key={`p-${index}`} style={{ ...body, margin: "0 0 0.85rem" }}>
              {block.text}
            </p>
          );
        }
        if (block.type === "numbered") {
          return (
            <ol key={`ol-${index}`} style={structuredList}>
              {block.items.map((item, itemIndex) => (
                <li key={`ol-${index}-${itemIndex}`} style={structuredListItem}>
                  {item}
                </li>
              ))}
            </ol>
          );
        }
        return (
          <ul key={`ul-${index}`} style={structuredList}>
            {block.items.map((item, itemIndex) => (
              <li key={`ul-${index}-${itemIndex}`} style={structuredListItem}>
                {item}
              </li>
            ))}
          </ul>
        );
      })}
    </>
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
const structuredList: CSSProperties = {
  margin: "0 0 0.95rem",
  paddingLeft: "1.2rem",
  lineHeight: 1.55,
  fontSize: "1.05rem",
};
const structuredListItem: CSSProperties = {
  marginBottom: "0.55rem",
  paddingLeft: "0.15rem",
};
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
