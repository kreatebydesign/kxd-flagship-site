"use client";

import { useRouter } from "next/navigation";
import { useState, type CSSProperties, type FormEvent } from "react";

type Blocker = { code: string; message: string };

export function ContractLifecycleActions(props: {
  contractId: number;
  contractStatus: string;
  agreementSource?: string | null;
  commercialStatus?: string | null;
  hasOperatorSignature: boolean;
  hasClientSignature: boolean;
  hasExternalAcceptance?: boolean;
  onboardingEligible: boolean;
  blockers: Blocker[];
  defaultRecipientName: string;
  defaultRecipientEmail: string;
  documentRefs: Array<{ id: number; kind: string }>;
  externalAcceptanceSummary?: string | null;
  /** When parent surface already shows acceptance, hide the duplicate summary card. */
  suppressAcceptanceSummary?: boolean;
  /** Hide authorization edit form while parent shows a read-only summary. */
  suppressAuthorizationForm?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [deliveryPreview, setDeliveryPreview] = useState<string | null>(null);

  const [signForm, setSignForm] = useState({
    legalName: "",
    title: "Principal",
    entityName: "Kreate by Design",
    email: "",
    typedAcknowledgment: "",
    authorityConfirmed: false,
    electronicRecordsConsent: false,
  });
  const [sendForm, setSendForm] = useState({
    recipientName: props.defaultRecipientName,
    recipientEmail: props.defaultRecipientEmail,
    confirm: false,
  });
  const [readinessForm, setReadinessForm] = useState({
    legalName: "",
    billingEmail: props.defaultRecipientEmail,
    billingAddress: "",
    taxTreatment: "exclusive" as const,
    applyLocalKxdFixture: false,
  });
  const [voidReason, setVoidReason] = useState("");
  const [forceDespiteBillingBlockers, setForceDespiteBillingBlockers] = useState(false);
  const [stripeTestConfirm, setStripeTestConfirm] = useState(false);
  const [stripeHostedUrl, setStripeHostedUrl] = useState<string | null>(null);
  const [extAccept, setExtAccept] = useState({
    acceptedBy: "",
    acceptedAt: "",
    method: "email",
    evidenceNotes: "",
    evidenceReference: "",
    operatorLegalName: "",
  });
  const [payAuth, setPayAuth] = useState({
    authorizedBy: "",
    cardholderName: "",
    authorizationMethod: "email",
    authorizedAt: "",
    scope: "",
    amountDollars: "",
    evidenceNotes: "",
    stripeCustomerId: "",
    stripePaymentMethodId: "",
    cardBrand: "",
    cardLast4: "",
  });
  const [payRefs, setPayRefs] = useState({
    stripeInvoiceId: "",
    stripePaymentIntentId: "",
    stripeChargeId: "",
    hostedInvoiceUrl: "",
    receiptUrl: "",
    paymentStatus: "paid",
  });
  const isDirect = props.agreementSource === "direct-agreement";

  async function run(action: string, payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/sales/contracts/${props.contractId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok || !data.ok) {
        throw new Error(String(data.error ?? "Action failed."));
      }
      if (typeof data.signingUrl === "string") {
        setSigningUrl(data.signingUrl);
      }
      if (typeof data.hostedInvoiceUrl === "string") {
        setStripeHostedUrl(data.hostedInvoiceUrl);
      }
      if (data.preview && typeof data.preview === "object") {
        const p = data.preview as { label?: string; subject?: string; bodyText?: string };
        setDeliveryPreview([p.label, p.subject, p.bodyText].filter(Boolean).join("\n\n"));
      }
      setMessage(`Completed: ${action.replace(/-/g, " ")}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  function onSign(e: FormEvent) {
    e.preventDefault();
    void run("sign-operator", signForm);
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      {error ? (
        <p role="alert" style={errStyle}>
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" style={okStyle}>
          {message}
        </p>
      ) : null}

      {isDirect ? (
        <section style={card}>
          <h3 style={h3}>Direct Agreement</h3>
          <p style={help}>
            Source: direct-agreement (no proposal). Commercial status:{" "}
            <strong>{props.commercialStatus ?? "draft"}</strong>. Acceptance and payment remain
            separate events.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              style={btn}
              disabled={busy}
              onClick={() => void run("finalize-direct-agreement", {})}
            >
              Finalize & file sent PDF
            </button>
            <button
              type="button"
              style={btnGhost}
              disabled={busy || props.commercialStatus === "active"}
              onClick={() => void run("activate-direct-agreement-service", {})}
            >
              Activate service (manual)
            </button>
            {props.hasExternalAcceptance &&
            (props.commercialStatus === "paid" || props.commercialStatus === "active") ? (
              <button
                type="button"
                style={btn}
                disabled={busy}
                onClick={() => void run("generate-courtesy-branded-restatement", {})}
              >
                Generate Branded Restatement
              </button>
            ) : null}
          </div>
          {props.hasExternalAcceptance &&
          (props.commercialStatus === "paid" || props.commercialStatus === "active") ? (
            <p style={help}>
              Branded restatement files a courtesy PDF of the locked terms. It does not create a
              new signature request, certificate, or payment record.
            </p>
          ) : null}
        </section>
      ) : null}

      {isDirect && !props.hasClientSignature && !props.hasExternalAcceptance ? (
        <section style={card}>
          <h3 style={h3}>Record External Acceptance</h3>
          <p style={help}>
            Externally recorded acceptance is <strong>not</strong> an electronic signature. Do not
            invent signature images, IP addresses, or fake signer authentication.
          </p>
          <label style={label}>
            Accepted by
            <input
              style={input}
              value={extAccept.acceptedBy}
              onChange={(e) => setExtAccept((s) => ({ ...s, acceptedBy: e.target.value }))}
            />
          </label>
          <label style={label}>
            Acceptance date
            <input
              style={input}
              type="date"
              value={extAccept.acceptedAt}
              onChange={(e) => setExtAccept((s) => ({ ...s, acceptedAt: e.target.value }))}
            />
          </label>
          <label style={label}>
            Method
            <select
              style={input}
              value={extAccept.method}
              onChange={(e) => setExtAccept((s) => ({ ...s, method: e.target.value }))}
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="in-person">In person</option>
              <option value="existing-signed-document">Existing signed document</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label style={label}>
            Evidence notes
            <textarea
              style={{ ...input, minHeight: 80 }}
              value={extAccept.evidenceNotes}
              onChange={(e) => setExtAccept((s) => ({ ...s, evidenceNotes: e.target.value }))}
            />
          </label>
          <label style={label}>
            Evidence reference (optional)
            <input
              style={input}
              value={extAccept.evidenceReference}
              onChange={(e) => setExtAccept((s) => ({ ...s, evidenceReference: e.target.value }))}
            />
          </label>
          <label style={label}>
            Operator legal name (for KXD acknowledgment)
            <input
              style={input}
              value={extAccept.operatorLegalName}
              onChange={(e) => setExtAccept((s) => ({ ...s, operatorLegalName: e.target.value }))}
            />
          </label>
          <button
            type="button"
            style={btn}
            disabled={busy}
            onClick={() =>
              void run("record-external-acceptance", {
                acceptedBy: extAccept.acceptedBy,
                acceptedAt: extAccept.acceptedAt,
                method: extAccept.method,
                evidenceNotes: extAccept.evidenceNotes,
                evidenceReference: extAccept.evidenceReference || null,
                operatorLegalName: extAccept.operatorLegalName || undefined,
              })
            }
          >
            Record external acceptance
          </button>
        </section>
      ) : null}

      {props.hasExternalAcceptance && !props.suppressAcceptanceSummary ? (
        <section style={card}>
          <h3 style={h3}>External acceptance on file</h3>
          <p style={okStyle}>
            {props.externalAcceptanceSummary ??
              "Externally recorded acceptance is on file (not electronic signature)."}
          </p>
          {props.documentRefs.length > 0 ? (
            <ul style={{ marginTop: 12, paddingLeft: 18 }}>
              {props.documentRefs.map((d) => (
                <li key={`${d.kind}-${d.id}`}>
                  <a href={`/api/admin/commercial-documents/${d.id}/download`}>
                    {d.kind} #{d.id}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {isDirect && (props.hasExternalAcceptance || props.hasClientSignature) ? (
        <section style={card}>
          {!props.suppressAuthorizationForm ? (
            <>
          <h3 style={h3}>Payment authorization (safe metadata only)</h3>
          <p style={help}>
            Store Stripe IDs, brand, and last four only. Never enter PAN, CVC, or raw card numbers.
            Charges remain in Stripe Dashboard for this workflow.
          </p>
          <label style={label}>
            Authorized by
            <input
              style={input}
              value={payAuth.authorizedBy}
              onChange={(e) => setPayAuth((s) => ({ ...s, authorizedBy: e.target.value }))}
            />
          </label>
          <label style={label}>
            Cardholder name (if different)
            <input
              style={input}
              value={payAuth.cardholderName}
              onChange={(e) => setPayAuth((s) => ({ ...s, cardholderName: e.target.value }))}
            />
          </label>
          <label style={label}>
            Authorization date
            <input
              style={input}
              type="date"
              value={payAuth.authorizedAt}
              onChange={(e) => setPayAuth((s) => ({ ...s, authorizedAt: e.target.value }))}
            />
          </label>
          <label style={label}>
            Scope
            <input
              style={input}
              value={payAuth.scope}
              onChange={(e) => setPayAuth((s) => ({ ...s, scope: e.target.value }))}
            />
          </label>
          <label style={label}>
            Amount authorized (USD)
            <input
              style={input}
              inputMode="decimal"
              value={payAuth.amountDollars}
              onChange={(e) => setPayAuth((s) => ({ ...s, amountDollars: e.target.value }))}
            />
          </label>
          <label style={label}>
            Evidence notes
            <textarea
              style={{ ...input, minHeight: 70 }}
              value={payAuth.evidenceNotes}
              onChange={(e) => setPayAuth((s) => ({ ...s, evidenceNotes: e.target.value }))}
            />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <label style={label}>
              Stripe customer ID
              <input
                style={input}
                value={payAuth.stripeCustomerId}
                onChange={(e) => setPayAuth((s) => ({ ...s, stripeCustomerId: e.target.value }))}
              />
            </label>
            <label style={label}>
              PaymentMethod ID
              <input
                style={input}
                value={payAuth.stripePaymentMethodId}
                onChange={(e) =>
                  setPayAuth((s) => ({ ...s, stripePaymentMethodId: e.target.value }))
                }
              />
            </label>
            <label style={label}>
              Card brand
              <input
                style={input}
                value={payAuth.cardBrand}
                onChange={(e) => setPayAuth((s) => ({ ...s, cardBrand: e.target.value }))}
              />
            </label>
            <label style={label}>
              Last four
              <input
                style={input}
                maxLength={4}
                value={payAuth.cardLast4}
                onChange={(e) => setPayAuth((s) => ({ ...s, cardLast4: e.target.value }))}
              />
            </label>
          </div>
          <button
            type="button"
            style={btn}
            disabled={busy}
            onClick={() =>
              void run("record-payment-authorization", {
                authorizationType: "card-charge-authorization",
                authorizedBy: payAuth.authorizedBy,
                cardholderName: payAuth.cardholderName || null,
                authorizationMethod: payAuth.authorizationMethod,
                authorizedAt: payAuth.authorizedAt,
                scope: payAuth.scope,
                amountAuthorizedCents: Math.round(Number(payAuth.amountDollars || 0) * 100),
                evidenceNotes: payAuth.evidenceNotes,
                stripeCustomerId: payAuth.stripeCustomerId || null,
                stripePaymentMethodId: payAuth.stripePaymentMethodId || null,
                cardBrand: payAuth.cardBrand || null,
                cardLast4: payAuth.cardLast4 || null,
              })
            }
          >
            Record authorization
          </button>
            </>
          ) : null}

          <h3 style={{ ...h3, marginTop: props.suppressAuthorizationForm ? 0 : 20 }}>
            Link Stripe payment / mark paid
          </h3>
          <p style={help}>
            After charging in Stripe Dashboard, paste safe IDs and URLs. Does not create MRR.
          </p>
          <label style={label}>
            Invoice ID
            <input
              style={input}
              value={payRefs.stripeInvoiceId}
              onChange={(e) => setPayRefs((s) => ({ ...s, stripeInvoiceId: e.target.value }))}
            />
          </label>
          <label style={label}>
            PaymentIntent ID
            <input
              style={input}
              value={payRefs.stripePaymentIntentId}
              onChange={(e) => setPayRefs((s) => ({ ...s, stripePaymentIntentId: e.target.value }))}
            />
          </label>
          <label style={label}>
            Charge ID
            <input
              style={input}
              value={payRefs.stripeChargeId}
              onChange={(e) => setPayRefs((s) => ({ ...s, stripeChargeId: e.target.value }))}
            />
          </label>
          <label style={label}>
            Hosted invoice URL
            <input
              style={input}
              value={payRefs.hostedInvoiceUrl}
              onChange={(e) => setPayRefs((s) => ({ ...s, hostedInvoiceUrl: e.target.value }))}
            />
          </label>
          <label style={label}>
            Receipt URL
            <input
              style={input}
              value={payRefs.receiptUrl}
              onChange={(e) => setPayRefs((s) => ({ ...s, receiptUrl: e.target.value }))}
            />
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              style={btnGhost}
              disabled={busy}
              onClick={() =>
                void run("link-payment-references", {
                  ...payRefs,
                  stripeCustomerId: payAuth.stripeCustomerId || null,
                  markPaid: false,
                })
              }
            >
              Link payment references
            </button>
            <button
              type="button"
              style={btn}
              disabled={
                busy ||
                props.commercialStatus === "paid" ||
                props.commercialStatus === "active"
              }
              onClick={() =>
                void run("link-payment-references", {
                  ...payRefs,
                  stripeCustomerId: payAuth.stripeCustomerId || null,
                  paymentStatus: "paid",
                  markPaid: true,
                })
              }
            >
              Mark paid
            </button>
          </div>
        </section>
      ) : null}

      <section style={card}>
        <h3 style={h3}>1. Resolve billing readiness (local fixture)</h3>
        <p style={help}>
          Sets reviewed client billing fields and optional local KXD invoice fixture values. Does not
          invent production legal facts.
        </p>
        <label style={label}>
          Client legal name
          <input
            style={input}
            value={readinessForm.legalName}
            onChange={(e) => setReadinessForm({ ...readinessForm, legalName: e.target.value })}
          />
        </label>
        <label style={label}>
          Billing email
          <input
            style={input}
            value={readinessForm.billingEmail}
            onChange={(e) => setReadinessForm({ ...readinessForm, billingEmail: e.target.value })}
          />
        </label>
        <label style={label}>
          Billing address
          <input
            style={input}
            value={readinessForm.billingAddress}
            onChange={(e) => setReadinessForm({ ...readinessForm, billingAddress: e.target.value })}
          />
        </label>
        <label style={check}>
          <input
            type="checkbox"
            checked={readinessForm.applyLocalKxdFixture}
            onChange={(e) =>
              setReadinessForm({ ...readinessForm, applyLocalKxdFixture: e.target.checked })
            }
          />
          Apply local KXD invoice fixture (test only)
        </label>
        <button
          type="button"
          style={btn}
          disabled={busy}
          onClick={() =>
            void run("resolve-readiness-fields", {
              ...readinessForm,
              taxTreatment: "exclusive",
            })
          }
        >
          Save readiness fields
        </button>
      </section>

      {!props.hasOperatorSignature ? (
        <section style={card}>
          <h3 style={h3}>2. Sign as Kreate by Design</h3>
          <p style={help}>
            Typed electronic signature — acknowledgment with consent, not biometric identity
            verification.
          </p>
          <form onSubmit={onSign}>
            <label style={label}>
              Legal name
              <input
                required
                style={input}
                value={signForm.legalName}
                onChange={(e) => setSignForm({ ...signForm, legalName: e.target.value })}
              />
            </label>
            <label style={label}>
              Title
              <input
                style={input}
                value={signForm.title}
                onChange={(e) => setSignForm({ ...signForm, title: e.target.value })}
              />
            </label>
            <label style={label}>
              Entity
              <input
                style={input}
                value={signForm.entityName}
                onChange={(e) => setSignForm({ ...signForm, entityName: e.target.value })}
              />
            </label>
            <label style={label}>
              Email
              <input
                required
                type="email"
                style={input}
                value={signForm.email}
                onChange={(e) => setSignForm({ ...signForm, email: e.target.value })}
              />
            </label>
            <label style={label}>
              Type your legal name
              <input
                required
                style={input}
                value={signForm.typedAcknowledgment}
                onChange={(e) =>
                  setSignForm({ ...signForm, typedAcknowledgment: e.target.value })
                }
              />
            </label>
            <label style={check}>
              <input
                type="checkbox"
                checked={signForm.authorityConfirmed}
                onChange={(e) =>
                  setSignForm({ ...signForm, authorityConfirmed: e.target.checked })
                }
              />
              I am authorized to sign for Kreate by Design
            </label>
            <label style={check}>
              <input
                type="checkbox"
                checked={signForm.electronicRecordsConsent}
                onChange={(e) =>
                  setSignForm({ ...signForm, electronicRecordsConsent: e.target.checked })
                }
              />
              I consent to electronic records and signatures
            </label>
            <button type="submit" style={btn} disabled={busy}>
              Sign agreement (operator)
            </button>
          </form>
        </section>
      ) : null}

      {props.hasOperatorSignature && !props.hasClientSignature ? (
        <section style={card}>
          <h3 style={h3}>3. Prepare client signing link</h3>
          <p style={help}>
            Generates a one-time secure signing URL. <strong>No email is sent.</strong> Copy the
            link and share it with the client manually (for example by text or email).
          </p>
          <label style={label}>
            Recipient name
            <input
              style={input}
              value={sendForm.recipientName}
              onChange={(e) => setSendForm({ ...sendForm, recipientName: e.target.value })}
            />
          </label>
          <label style={label}>
            Recipient email
            <input
              style={input}
              value={sendForm.recipientEmail}
              onChange={(e) => setSendForm({ ...sendForm, recipientEmail: e.target.value })}
            />
          </label>
          <label style={check}>
            <input
              type="checkbox"
              checked={sendForm.confirm}
              onChange={(e) => setSendForm({ ...sendForm, confirm: e.target.checked })}
            />
            I understand no email will be sent — I will share the signing link manually
          </label>
          <label style={check}>
            <input
              type="checkbox"
              checked={forceDespiteBillingBlockers}
              onChange={(e) => setForceDespiteBillingBlockers(e.target.checked)}
            />
            Force prepare despite unresolved KXD billing identity blockers (local QA only)
          </label>
          <button
            type="button"
            style={btn}
            disabled={busy || !sendForm.confirm}
            onClick={() =>
              void run("send-for-client-signature", {
                recipientName: sendForm.recipientName,
                recipientEmail: sendForm.recipientEmail,
                forceDespiteBillingBlockers,
              })
            }
          >
            Prepare client signing link
          </button>
          {signingUrl ? (
            <p style={okStyle}>
              Secure signing URL (copy now — token is not stored in plaintext):{" "}
              <code style={{ wordBreak: "break-all" }}>{signingUrl}</code>
            </p>
          ) : null}
          {deliveryPreview ? (
            <pre style={pre}>{deliveryPreview}</pre>
          ) : null}
        </section>
      ) : null}

      {props.hasClientSignature ? (
        <section style={card}>
          <h3 style={h3}>4. Billing — local mock</h3>
          <p style={help}>
            Local deterministic mock only (`cus_mock_*`). Does not contact Stripe. Keep for offline QA.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              style={btnGhost}
              disabled={busy}
              onClick={() => void run("prepare-mock-stripe", {})}
            >
              Prepare mock Stripe drafts
            </button>
            <button
              type="button"
              style={btn}
              disabled={busy || props.onboardingEligible}
              onClick={() => void run("simulate-mock-payment", { viaWebhook: true })}
            >
              Simulate mock payment webhook
            </button>
            <button
              type="button"
              style={btnGhost}
              disabled={busy}
              onClick={() => void run("regenerate-documents", {})}
            >
              Regenerate document package
            </button>
          </div>
          {props.onboardingEligible ? (
            <p role="status" style={okStyle}>
              Onboarding eligible — use <strong>Start Client Launch</strong> above to open
              the Launch Wizard. Do not use the legacy public-proposal Checkout path for new
              KXD deals.
            </p>
          ) : null}
          {props.documentRefs.length > 0 ? (
            <ul style={{ marginTop: 12, paddingLeft: 18 }}>
              {props.documentRefs.map((d) => (
                <li key={d.id}>
                  <a href={`/api/admin/commercial-documents/${d.id}/download`}>{d.kind}</a>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {props.hasClientSignature ? (
        <section style={{ ...card, borderColor: "#c9a227", background: "#111" }}>
          <p
            style={{
              margin: 0,
              color: "#c9a227",
              letterSpacing: "0.12em",
              fontSize: 11,
              textTransform: "uppercase",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Stripe test mode
          </p>
          <h3 style={{ ...h3, color: "#f7f1e8" }}>5. Controlled Stripe test billing</h3>
          <p style={{ ...help, color: "#cfc6b8" }}>
            Creates real Stripe <strong>test</strong> objects only (`sk_test_`). Live keys are rejected.
            Payment success via signed webhook marks onboarding eligible — activation stays manual. Taxes
            disabled. Recurring schedules remain blocked.
          </p>
          <label style={{ ...check, color: "#f7f1e8" }}>
            <input
              type="checkbox"
              checked={stripeTestConfirm}
              onChange={(e) => setStripeTestConfirm(e.target.checked)}
            />
            I confirm this is Stripe TEST MODE on a disposable fixture (not production)
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              style={btnGold}
              disabled={busy}
              onClick={() => void run("stripe-test-credential-status", {})}
            >
              Check test credentials
            </button>
            <button
              type="button"
              style={btnGold}
              disabled={busy || !stripeTestConfirm}
              onClick={() =>
                void run("stripe-test-ensure-customer", { confirmed: true })
              }
            >
              Create / reuse Stripe test customer
            </button>
            <button
              type="button"
              style={btn}
              disabled={busy || !stripeTestConfirm || props.onboardingEligible}
              onClick={() =>
                void run("stripe-test-prepare-invoice", { confirmed: true })
              }
            >
              Prepare Stripe test invoice
            </button>
          </div>
          {stripeHostedUrl ? (
            <p role="status" style={{ ...okStyle, marginTop: 12 }}>
              TEST MODE — NOT A REAL INVOICE. Pay with Stripe test cards:{" "}
              <a href={stripeHostedUrl} style={{ color: "#c9a227" }} rel="noreferrer">
                Open hosted invoice
              </a>
            </p>
          ) : null}
          {props.onboardingEligible ? (
            <div role="status" style={{ marginTop: 12 }}>
              <p style={{ ...okStyle, margin: 0 }}>Stripe test payment verified</p>
              <p style={{ ...okStyle, margin: "6px 0 0" }}>
                Onboarding eligible — activation still requires operator approval
              </p>
            </div>
          ) : null}
          <p style={{ ...help, color: "#8a8070", marginTop: 10 }}>
            Webhook endpoint (local):{" "}
            <code>/api/stripe/commercial-lifecycle-webhook</code>
          </p>
        </section>
      ) : null}

      <section style={card}>
        <h3 style={h3}>Void contract</h3>
        <label style={label}>
          Reason (required)
          <input
            style={input}
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
          />
        </label>
        <button
          type="button"
          style={btnDanger}
          disabled={busy || !voidReason.trim() || props.contractStatus === "voided"}
          onClick={() => void run("void", { reason: voidReason })}
        >
          Void with reason
        </button>
      </section>
    </div>
  );
}

const card: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.1)",
  padding: "1rem 1.1rem",
  borderRadius: 2,
};
const h3: CSSProperties = { margin: "0 0 0.5rem", fontSize: "1rem", fontWeight: 500 };
const help: CSSProperties = { opacity: 0.75, fontSize: 13, marginBottom: 12, lineHeight: 1.45 };
const label: CSSProperties = { display: "block", marginBottom: 10, fontSize: 13 };
const check: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "flex-start",
  marginBottom: 12,
  fontSize: 13,
};
const input: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: "0.55rem 0.65rem",
  borderRadius: 2,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(0,0,0,0.25)",
  color: "inherit",
};
const btn: CSSProperties = {
  border: "none",
  background: "#c5a65c",
  color: "#111",
  padding: "0.55rem 0.9rem",
  borderRadius: 2,
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
  fontSize: 13,
};
const btnGold: CSSProperties = {
  ...btn,
  background: "#c9a227",
  color: "#111",
  fontWeight: 600,
};
const btnGhost: CSSProperties = {
  ...btn,
  background: "transparent",
  color: "#c5a65c",
  border: "1px solid #c5a65c",
};
const btnDanger: CSSProperties = {
  ...btn,
  background: "transparent",
  color: "#e8a0a0",
  border: "1px solid #e8a0a0",
};
const errStyle: CSSProperties = { color: "#e8a0a0" };
const okStyle: CSSProperties = { color: "#b7d4a8", fontSize: 14, lineHeight: 1.45 };
const pre: CSSProperties = {
  whiteSpace: "pre-wrap",
  fontSize: 12,
  opacity: 0.85,
  marginTop: 12,
  padding: 12,
  background: "rgba(0,0,0,0.3)",
};
