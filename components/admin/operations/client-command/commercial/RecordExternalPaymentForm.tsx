"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CommercialExternalPaymentEligibleAgreement } from "@/lib/client-command/commercial/types";

type Confirmation = {
  title: string;
  amountLabel: string;
  sourceLabel: string;
  commercialStatus: "paid";
  recordedAt: string;
  nextAction: "activate-service";
  noStripeChargeCreated: true;
};

function dollarsFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatRecordedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function RecordExternalPaymentForm(props: {
  clientId: number;
  eligibleAgreements: CommercialExternalPaymentEligibleAgreement[];
}) {
  const router = useRouter();
  const defaults = props.eligibleAgreements[0];
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [activated, setActivated] = useState(false);

  const [agreementId, setAgreementId] = useState(String(defaults?.agreementId ?? ""));
  const selected = useMemo(
    () =>
      props.eligibleAgreements.find((a) => String(a.agreementId) === agreementId) ??
      defaults ??
      null,
    [agreementId, defaults, props.eligibleAgreements],
  );

  const [source, setSource] = useState<"imported-external-stripe-payment" | "manual-non-stripe">(
    "imported-external-stripe-payment",
  );
  const [amountDollars, setAmountDollars] = useState(
    defaults ? dollarsFromCents(defaults.obligationAmountCents) : "",
  );
  const [currency, setCurrency] = useState(defaults?.currency ?? "USD");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [livemode, setLivemode] = useState<"live" | "test">("live");
  const [stripeCustomerId, setStripeCustomerId] = useState("");
  const [stripePaymentIntentId, setStripePaymentIntentId] = useState("");
  const [stripeChargeId, setStripeChargeId] = useState("");
  const [stripeInvoiceId, setStripeInvoiceId] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [hostedInvoiceUrl, setHostedInvoiceUrl] = useState("");
  const [operatorNote, setOperatorNote] = useState("");

  if (!props.eligibleAgreements.length && !confirmation) {
    return null;
  }

  async function submit() {
    if (!selected) {
      setError("Select an eligible Direct Agreement.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const amountCents = Math.round(Number(amountDollars) * 100);
      const res = await fetch(
        `/api/admin/sales/contracts/${selected.agreementId}/lifecycle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "record-external-payment",
            source,
            amountCents,
            currency,
            paidAt,
            livemode: source === "imported-external-stripe-payment" ? livemode === "live" : null,
            stripeCustomerId: stripeCustomerId.trim() || null,
            stripePaymentIntentId: stripePaymentIntentId.trim() || null,
            stripeChargeId: stripeChargeId.trim() || null,
            stripeInvoiceId: stripeInvoiceId.trim() || null,
            receiptUrl: receiptUrl.trim() || null,
            hostedInvoiceUrl: hostedInvoiceUrl.trim() || null,
            operatorNote: operatorNote.trim() || null,
          }),
        },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        confirmation?: Confirmation;
      };
      if (!res.ok || !data.ok || !data.confirmation) {
        throw new Error(data.error || "Could not record external payment.");
      }
      setConfirmation(data.confirmation);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record external payment.");
    } finally {
      setBusy(false);
    }
  }

  async function activateService() {
    if (!selected && !confirmation) return;
    const id = selected?.agreementId ?? Number(agreementId);
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sales/contracts/${id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate-direct-agreement-service" }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not activate service.");
      }
      setActivated(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not activate service.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kxd-os-commercial-record-payment">
      {confirmation ? (
        <div
          className="kxd-os-commercial-confirm"
          role="status"
          aria-live="polite"
          data-testid="external-payment-confirmation"
        >
          <p className="kxd-os-commercial-confirm__eyebrow">Commercial payment</p>
          <h3 className="kxd-os-commercial-confirm__title">{confirmation.title}</h3>
          <p className="kxd-os-commercial-confirm__summary">
            {confirmation.amountLabel} · {confirmation.sourceLabel} · Paid
          </p>
          <dl className="kxd-os-commercial-confirm__meta">
            <div>
              <dt>Agreement status</dt>
              <dd>Paid</dd>
            </div>
            <div>
              <dt>Recorded</dt>
              <dd>{formatRecordedAt(confirmation.recordedAt)}</dd>
            </div>
          </dl>
          <p className="kxd-os-commercial-confirm__notice">
            No Stripe charge was created by KXD OS.
          </p>
          <div className="kxd-os-commercial-confirm__actions">
            {!activated ? (
              <button
                type="button"
                className="kxd-os-btn kxd-os-btn--primary"
                disabled={busy}
                onClick={() => void activateService()}
              >
                Activate service
              </button>
            ) : (
              <p className="kxd-os-commercial-confirm__done">Service activated.</p>
            )}
            <a
              className="kxd-os-btn kxd-os-btn--ghost"
              href={`/admin/operations/client-command/${props.clientId}/commercial/agreements/${agreementId || selected?.agreementId || ""}`}
            >
              View agreement
            </a>
          </div>
        </div>
      ) : null}

      {!confirmation && !open ? (
        <div className="kxd-os-commercial-record-payment__cta">
          <div>
            <h3>Record external payment</h3>
            <p>
              Reconcile an already-completed Stripe or manual payment into this client&apos;s
              Direct Agreement. This does not charge a card or create Stripe objects.
            </p>
          </div>
          <button
            type="button"
            className="kxd-os-btn kxd-os-btn--primary"
            onClick={() => {
              if (selected) {
                setAmountDollars(dollarsFromCents(selected.obligationAmountCents));
                setCurrency(selected.currency);
              }
              setOpen(true);
            }}
          >
            Record External Payment
          </button>
        </div>
      ) : null}

      {open && !confirmation ? (
        <form
          className="kxd-os-commercial-record-payment__form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <header className="kxd-os-commercial-record-payment__header">
            <h3>Record External Payment</h3>
            <p>
              Recording / reconciliation only. KXD OS will not create a PaymentIntent, invoice,
              customer, subscription, or charge.
            </p>
          </header>

          <div className="kxd-os-commercial-record-payment__grid">
            <label className="kxd-os-commercial-field">
              <span className="kxd-os-commercial-field__label">
                Direct Agreement <em>Required</em>
              </span>
              <select
                className="kxd-os-commercial-control"
                value={agreementId}
                onChange={(e) => {
                  setAgreementId(e.target.value);
                  const next = props.eligibleAgreements.find(
                    (a) => String(a.agreementId) === e.target.value,
                  );
                  if (next) {
                    setAmountDollars(dollarsFromCents(next.obligationAmountCents));
                    setCurrency(next.currency);
                  }
                }}
                required
              >
                {props.eligibleAgreements.map((a) => (
                  <option key={a.agreementId} value={a.agreementId}>
                    {a.title} · ${(a.obligationAmountCents / 100).toFixed(2)} ·{" "}
                    {a.commercialStatus}
                  </option>
                ))}
              </select>
            </label>

            <label className="kxd-os-commercial-field">
              <span className="kxd-os-commercial-field__label">
                Payment source <em>Required</em>
              </span>
              <select
                className="kxd-os-commercial-control"
                value={source}
                onChange={(e) =>
                  setSource(e.target.value as "imported-external-stripe-payment" | "manual-non-stripe")
                }
                required
              >
                <option value="imported-external-stripe-payment">
                  Imported external Stripe payment
                </option>
                <option value="manual-non-stripe">Manual non-Stripe payment</option>
              </select>
              <span className="kxd-os-commercial-field__help">
                Use Stripe when the payment already succeeded in Stripe outside KXD OS.
              </span>
            </label>

            <label className="kxd-os-commercial-field">
              <span className="kxd-os-commercial-field__label">
                Amount (USD) <em>Required</em>
              </span>
              <input
                className="kxd-os-commercial-control"
                type="number"
                min="0.01"
                step="0.01"
                value={amountDollars}
                onChange={(e) => setAmountDollars(e.target.value)}
                required
              />
              <span className="kxd-os-commercial-field__help">
                Must match the agreement obligation
                {selected ? ` ($${(selected.obligationAmountCents / 100).toFixed(2)})` : ""}.
              </span>
            </label>

            <label className="kxd-os-commercial-field">
              <span className="kxd-os-commercial-field__label">
                Currency <em>Required</em>
              </span>
              <select
                className="kxd-os-commercial-control"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                required
              >
                <option value="USD">USD</option>
              </select>
            </label>

            <label className="kxd-os-commercial-field">
              <span className="kxd-os-commercial-field__label">
                Payment date <em>Required</em>
              </span>
              <input
                className="kxd-os-commercial-control"
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                required
              />
            </label>

            {source === "imported-external-stripe-payment" ? (
              <label className="kxd-os-commercial-field">
                <span className="kxd-os-commercial-field__label">
                  Stripe mode <em>Required</em>
                </span>
                <select
                  className="kxd-os-commercial-control"
                  value={livemode}
                  onChange={(e) => setLivemode(e.target.value as "live" | "test")}
                  required
                >
                  <option value="live">LIVE</option>
                  <option value="test">TEST</option>
                </select>
                <span className="kxd-os-commercial-field__help">
                  Keep LIVE and TEST strictly separated. Robin&apos;s production payment is LIVE.
                </span>
              </label>
            ) : null}
          </div>

          {source === "imported-external-stripe-payment" ? (
            <div className="kxd-os-commercial-record-payment__grid">
              <label className="kxd-os-commercial-field">
                <span className="kxd-os-commercial-field__label">
                  Stripe Customer ID <em>Optional</em>
                </span>
                <input
                  className="kxd-os-commercial-control"
                  placeholder="cus_…"
                  value={stripeCustomerId}
                  onChange={(e) => setStripeCustomerId(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <label className="kxd-os-commercial-field">
                <span className="kxd-os-commercial-field__label">
                  PaymentIntent ID <em>Recommended</em>
                </span>
                <input
                  className="kxd-os-commercial-control"
                  placeholder="pi_…"
                  value={stripePaymentIntentId}
                  onChange={(e) => setStripePaymentIntentId(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <label className="kxd-os-commercial-field">
                <span className="kxd-os-commercial-field__label">
                  Charge ID <em>Recommended</em>
                </span>
                <input
                  className="kxd-os-commercial-control"
                  placeholder="ch_… or py_…"
                  value={stripeChargeId}
                  onChange={(e) => setStripeChargeId(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <label className="kxd-os-commercial-field">
                <span className="kxd-os-commercial-field__label">
                  Invoice ID <em>Optional</em>
                </span>
                <input
                  className="kxd-os-commercial-control"
                  placeholder="in_…"
                  value={stripeInvoiceId}
                  onChange={(e) => setStripeInvoiceId(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <p className="kxd-os-commercial-field__help kxd-os-commercial-field__help--block">
                Provide at least one of PaymentIntent, Charge, or Invoice ID so the Stripe payment
                record is meaningful.
              </p>
              <label className="kxd-os-commercial-field">
                <span className="kxd-os-commercial-field__label">
                  Receipt URL <em>Optional</em>
                </span>
                <input
                  className="kxd-os-commercial-control"
                  type="url"
                  placeholder="https://…"
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                />
              </label>
              <label className="kxd-os-commercial-field">
                <span className="kxd-os-commercial-field__label">
                  Hosted invoice URL <em>Optional</em>
                </span>
                <input
                  className="kxd-os-commercial-control"
                  type="url"
                  placeholder="https://…"
                  value={hostedInvoiceUrl}
                  onChange={(e) => setHostedInvoiceUrl(e.target.value)}
                />
              </label>
            </div>
          ) : null}

          <label className="kxd-os-commercial-field">
            <span className="kxd-os-commercial-field__label">
              Operator note <em>Optional</em>
            </span>
            <textarea
              className="kxd-os-commercial-control kxd-os-commercial-control--textarea"
              rows={3}
              value={operatorNote}
              onChange={(e) => setOperatorNote(e.target.value)}
              placeholder="e.g. Collected in LIVE Stripe Dashboard on Aug 4, 2026"
            />
          </label>

          {error ? (
            <p className="kxd-os-commercial-record-payment__error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="kxd-os-commercial-record-payment__actions">
            <button type="submit" className="kxd-os-btn kxd-os-btn--primary" disabled={busy}>
              {busy ? "Recording…" : "Record payment"}
            </button>
            <button
              type="button"
              className="kxd-os-btn kxd-os-btn--ghost"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {error && confirmation ? (
        <p className="kxd-os-commercial-record-payment__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
