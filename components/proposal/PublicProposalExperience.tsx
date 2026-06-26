"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fmtMoney } from "@/components/admin/sales/shared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

interface FaqItem {
  question: string;
  answer: string;
}

const DEFAULT_FAQS: FaqItem[] = [
  {
    question: "How long does a typical project take?",
    answer: "Most website engagements run 8–14 weeks depending on scope, content readiness, and feedback cycles.",
  },
  {
    question: "What happens after approval?",
    answer: "We activate your Client HQ portal, schedule onboarding, and begin discovery immediately.",
  },
  {
    question: "Can we adjust scope later?",
    answer: "Yes. Optional services and phased expansions can be added without disrupting the core engagement.",
  },
];

export function PublicProposalExperience({
  publicToken,
  initial,
}: {
  publicToken: string;
  initial: {
    proposal: AnyDoc;
    agreement: AnyDoc | null;
    depositAmount: number;
  };
}) {
  const [proposal] = useState(initial.proposal);
  const [agreement, setAgreement] = useState(initial.agreement);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [company, setCompany] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [changeRequest, setChangeRequest] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const sessionStart = useRef(Date.now());

  const sections = (proposal.sectionBlocks as AnyDoc[]) ?? [];
  const optionalServices = (proposal.optionalServices as AnyDoc[]) ?? [];
  const faqs = ((proposal.faqs as FaqItem[]) ?? DEFAULT_FAQS).filter((f) => f.question && f.answer);
  const recurring = Number(proposal.recurringAmount ?? 0);
  const investment = Number(proposal.investment ?? 0);
  const isApproved = proposal.status === "approved";
  const isRejected = proposal.status === "rejected";
  const paymentStatus = String(proposal.paymentStatus ?? "none");
  const depositPaid = paymentStatus === "deposit-paid" || paymentStatus === "paid";

  const trackView = useCallback(
    async (eventType: string, sectionId?: string, durationSeconds?: number) => {
      try {
        await fetch(`/api/proposal/${publicToken}/view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventType, sectionId, durationSeconds }),
        });
      } catch {
        /* non-blocking */
      }
    },
    [publicToken],
  );

  useEffect(() => {
    trackView("page-view");
    const interval = setInterval(() => trackView("heartbeat", undefined, 30), 30_000);
    return () => {
      clearInterval(interval);
      const elapsed = Math.round((Date.now() - sessionStart.current) / 1000);
      trackView("session-end", undefined, elapsed);
    };
  }, [trackView]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            trackView("section-view", entry.target.id);
          }
        }
      },
      { threshold: 0.4 },
    );
    document.querySelectorAll("[data-proposal-section]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [trackView]);

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    drawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const point = pointer(e, canvas);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const point = pointer(e, canvas);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#f5f0e8";
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  function endDraw() {
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) setSignatureData(canvas.toDataURL("image/png"));
  }

  function pointer(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e && e.touches[0]) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    const me = e as React.MouseEvent;
    return { x: me.clientX - rect.left, y: me.clientY - rect.top };
  }

  async function signAgreement() {
    if (!signerName || !signerEmail || !signatureData || !termsAccepted) {
      setMessage("Complete the agreement, signature, and terms acceptance.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/proposal/${publicToken}/agreement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName, signerEmail, company, signatureImage: signatureData }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error ?? "Failed to sign agreement.");
        return;
      }
      setAgreement({ hasSignature: true, signerName, signerEmail, company });
      setMessage("Agreement signed successfully.");
    } finally {
      setBusy(false);
    }
  }

  async function startCheckout() {
    setBusy(true);
    try {
      const res = await fetch(`/api/proposal/${publicToken}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signerEmail }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error ?? "Payment unavailable.");
        return;
      }
      window.location.href = json.url;
    } finally {
      setBusy(false);
    }
  }

  async function handleAction(action: "approve" | "decline" | "request-changes") {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/proposal/${publicToken}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, message: changeRequest }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.errors?.join(" ") ?? json.error ?? "Action failed.");
        return;
      }
      if (action === "approve") {
        setMessage("Proposal approved. Welcome to KXD — your Client HQ invitation is being prepared.");
      } else if (action === "decline") {
        setMessage("Proposal declined. Our team has been notified.");
      } else {
        setMessage("Change request submitted. We will follow up shortly.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kxd-proposal">
      <section className="kxd-proposal-hero" data-proposal-section id="hero">
        <p className="kxd-proposal-eyebrow">Kreate by Design</p>
        <h1 className="kxd-proposal-title">{String(proposal.title ?? "Proposal")}</h1>
        <p className="kxd-proposal-meta">{String(proposal.proposalNumber ?? "")}</p>
        {proposal.executiveSummary ? (
          <p className="kxd-proposal-lead">{String(proposal.executiveSummary)}</p>
        ) : null}
      </section>

      <section className="kxd-proposal-section" data-proposal-section id="executive-summary">
        <h2>Executive Summary</h2>
        <p>{String(proposal.executiveSummary ?? "A tailored engagement designed for premium brand execution and long-term partnership.")}</p>
      </section>

      <section className="kxd-proposal-section" data-proposal-section id="about-kxd">
        <h2>About KXD</h2>
        <p>
          Kreate by Design is a creative operations studio built for brands that expect precision, velocity, and
          enduring partnership. We design and build luxury digital experiences with senior-level execution.
        </p>
      </section>

      {proposal.scope ? (
        <section className="kxd-proposal-section" data-proposal-section id="scope">
          <h2>Scope</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{String(proposal.scope)}</p>
        </section>
      ) : null}

      {proposal.deliverables ? (
        <section className="kxd-proposal-section" data-proposal-section id="deliverables">
          <h2>Deliverables</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{String(proposal.deliverables)}</p>
        </section>
      ) : null}

      {proposal.timeline ? (
        <section className="kxd-proposal-section" data-proposal-section id="timeline">
          <h2>Timeline</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{String(proposal.timeline)}</p>
        </section>
      ) : null}

      {sections.map((block, i) => (
        <section key={i} className="kxd-proposal-section" data-proposal-section id={`section-${i}`}>
          <h2>{String(block.title ?? "Section")}</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{String(block.content ?? "")}</p>
        </section>
      ))}

      <section className="kxd-proposal-section" data-proposal-section id="investment">
        <h2>Investment</h2>
        <p className="kxd-proposal-price">{fmtMoney(investment)}</p>
        {proposal.investmentSummary ? <p>{String(proposal.investmentSummary)}</p> : null}
        {initial.depositAmount > 0 ? (
          <p className="kxd-proposal-meta">Deposit due at approval: {fmtMoney(initial.depositAmount)}</p>
        ) : null}
      </section>

      {recurring > 0 ? (
        <section className="kxd-proposal-section" data-proposal-section id="monthly-services">
          <h2>Monthly Services</h2>
          <p className="kxd-proposal-price">{fmtMoney(recurring)}<span>/mo</span></p>
        </section>
      ) : null}

      {optionalServices.length > 0 ? (
        <section className="kxd-proposal-section" data-proposal-section id="optional-services">
          <h2>Optional Services</h2>
          {optionalServices.map((svc, i) => (
            <div key={i} className="kxd-proposal-card">
              <strong>{String(svc.title)}</strong>
              <p>{fmtMoney(Number(svc.price ?? 0))}{svc.isRecurring ? "/mo" : ""}</p>
            </div>
          ))}
        </section>
      ) : null}

      <section className="kxd-proposal-section" data-proposal-section id="faqs">
        <h2>FAQs</h2>
        {faqs.map((faq, i) => (
          <div key={i} className="kxd-proposal-card">
            <strong>{faq.question}</strong>
            <p>{faq.answer}</p>
          </div>
        ))}
      </section>

      {!isApproved && !isRejected ? (
        <>
          <section className="kxd-proposal-section" data-proposal-section id="agreement">
            <h2>Agreement</h2>
            <p style={{ whiteSpace: "pre-wrap" }}>{String(proposal.agreementText ?? "")}</p>
            {!agreement?.hasSignature ? (
              <div className="kxd-proposal-form">
                <input className="kxd-proposal-input" placeholder="Full name" value={signerName} onChange={(e) => setSignerName(e.target.value)} />
                <input className="kxd-proposal-input" placeholder="Email" type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} />
                <input className="kxd-proposal-input" placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
                <label className="kxd-proposal-check">
                  <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
                  I accept the terms outlined in this proposal.
                </label>
                <p className="kxd-proposal-meta">Draw your signature below</p>
                <canvas
                  ref={canvasRef}
                  className="kxd-proposal-signature"
                  width={600}
                  height={160}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                />
                <button type="button" className="kxd-proposal-btn kxd-proposal-btn--ghost" onClick={signAgreement} disabled={busy}>
                  Sign agreement
                </button>
              </div>
            ) : (
              <p className="kxd-proposal-success">Signed by {agreement.signerName}</p>
            )}
          </section>

          <section className="kxd-proposal-section" data-proposal-section id="payment">
            <h2>Payment</h2>
            {initial.depositAmount > 0 && !depositPaid ? (
              <>
                <p>Secure deposit via Stripe Checkout.</p>
                <button type="button" className="kxd-proposal-btn" onClick={startCheckout} disabled={busy}>
                  Pay {fmtMoney(initial.depositAmount)}
                </button>
              </>
            ) : depositPaid ? (
              <p className="kxd-proposal-success">Payment received — thank you.</p>
            ) : (
              <p>No deposit required for this proposal.</p>
            )}
          </section>

          <section className="kxd-proposal-section" data-proposal-section id="next-steps">
            <h2>Next Steps</h2>
            <div className="kxd-proposal-actions">
              <button type="button" className="kxd-proposal-btn" onClick={() => handleAction("approve")} disabled={busy}>
                Approve Proposal
              </button>
              <button type="button" className="kxd-proposal-btn kxd-proposal-btn--ghost" onClick={() => handleAction("request-changes")} disabled={busy}>
                Request Changes
              </button>
              <button type="button" className="kxd-proposal-btn kxd-proposal-btn--ghost" onClick={() => handleAction("decline")} disabled={busy}>
                Decline
              </button>
            </div>
            <textarea
              className="kxd-proposal-input kxd-proposal-textarea"
              placeholder="Optional message for change requests"
              value={changeRequest}
              onChange={(e) => setChangeRequest(e.target.value)}
            />
          </section>
        </>
      ) : (
        <section className="kxd-proposal-section" data-proposal-section id="status">
          <h2>Status</h2>
          <p className="kxd-proposal-success">
            {isApproved ? "This proposal has been approved." : "This proposal is no longer active."}
          </p>
        </section>
      )}

      {message ? <p className="kxd-proposal-message">{message}</p> : null}
    </div>
  );
}
