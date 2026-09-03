"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CommercialRecurringServiceTarget } from "@/lib/client-command/commercial/types";

function dollarsFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function periodLabel(period: string): string {
  const [y, m] = period.split("-");
  const month = Number(m);
  if (!y || !month) return period;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(y), month - 1, 1)));
}

export function RegisterRecurringDueForm(props: {
  clientId: number;
  targets: CommercialRecurringServiceTarget[];
}) {
  const router = useRouter();
  const agreementTargets = useMemo(() => {
    const map = new Map<number, CommercialRecurringServiceTarget[]>();
    for (const target of props.targets) {
      const list = map.get(target.agreementId) ?? [];
      list.push(target);
      map.set(target.agreementId, list);
    }
    return map;
  }, [props.targets]);

  const agreementIds = [...agreementTargets.keys()];
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    wouldCreate: boolean;
    sourceKey: string;
    label: string;
    amountCents: number;
    dueDate: string;
    existingObligationId: string | null;
  } | null>(null);

  const [agreementId, setAgreementId] = useState(String(agreementIds[0] ?? ""));
  const servicesForAgreement = agreementTargets.get(Number(agreementId)) ?? [];
  const [serviceKey, setServiceKey] = useState(servicesForAgreement[0]?.serviceKey ?? "");
  const selectedService =
    servicesForAgreement.find((s) => s.serviceKey === serviceKey) ??
    servicesForAgreement[0] ??
    null;

  const [serviceTitle, setServiceTitle] = useState(
    selectedService?.isOperatorDefined ? "" : selectedService?.serviceTitle ?? "",
  );
  const [amountDollars, setAmountDollars] = useState(
    selectedService && selectedService.amountCents > 0
      ? dollarsFromCents(selectedService.amountCents)
      : "",
  );
  const [cadence, setCadence] = useState<"monthly" | "quarterly" | "annual">(
    selectedService?.cadence ?? "monthly",
  );
  const [billDay, setBillDay] = useState(String(selectedService?.billDay ?? 1));
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [effectiveDate, setEffectiveDate] = useState(
    selectedService?.effectiveDate ?? "",
  );

  if (!props.targets.length) return null;

  function applyService(next: CommercialRecurringServiceTarget | null) {
    if (!next) return;
    setServiceKey(next.serviceKey);
    if (next.isOperatorDefined) {
      setServiceTitle("");
      setAmountDollars("");
      setCadence("monthly");
      setBillDay("1");
      setEffectiveDate("");
    } else {
      setServiceTitle(next.serviceTitle);
      setAmountDollars(
        next.amountCents > 0 ? dollarsFromCents(next.amountCents) : "",
      );
      setCadence(next.cadence);
      setBillDay(String(next.billDay));
      setEffectiveDate(next.effectiveDate ?? "");
    }
    setPreview(null);
  }

  async function runPreview() {
    if (!selectedService) {
      setError("Select a recurring service.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/sales/contracts/${selectedService.agreementId}/lifecycle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "preview-recurring-due-occurrence",
            serviceKey: selectedService.isOperatorDefined
              ? serviceTitle || selectedService.serviceKey
              : selectedService.serviceKey,
            serviceTitle,
            amountCents: Math.round(Number(amountDollars) * 100),
            currency: selectedService.currency,
            cadence,
            billDay: Number(billDay),
            periodYearMonth: period,
            effectiveDate: effectiveDate || null,
          }),
        },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        preview?: typeof preview;
      };
      if (!res.ok || !data.ok || !data.preview) {
        throw new Error(data.error || "Could not preview recurring occurrence.");
      }
      setPreview(data.preview);
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "Could not preview.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!selectedService || !preview) {
      setError("Preview the occurrence before registering.");
      return;
    }
    if (!preview.wouldCreate) {
      setError("This period is already registered.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/sales/contracts/${selectedService.agreementId}/lifecycle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "ensure-recurring-due-occurrence",
            serviceKey: selectedService.isOperatorDefined
              ? serviceTitle || selectedService.serviceKey
              : selectedService.serviceKey,
            serviceTitle,
            amountCents: Math.round(Number(amountDollars) * 100),
            currency: selectedService.currency,
            cadence,
            billDay: Number(billDay),
            periodYearMonth: period,
            effectiveDate: effectiveDate || null,
            label: preview.label,
            dueDate: preview.dueDate,
            sourceKey: preview.sourceKey,
          }),
        },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        created?: boolean;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not register recurring occurrence.");
      }
      setOpen(false);
      setPreview(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kxd-os-commercial-record-payment">
      {!open ? (
        <div className="kxd-os-commercial-record-payment__cta">
          <div>
            <h3>Register recurring due occurrence</h3>
            <p>
              Create the currently due period for a recurring client service. Does not create a
              Stripe subscription or charge the client. Does not rewrite accepted legal amendments.
            </p>
          </div>
          <button
            type="button"
            className="kxd-os-btn kxd-os-btn--primary"
            onClick={() => setOpen(true)}
          >
            Register Recurring Due
          </button>
        </div>
      ) : (
        <form
          className="kxd-os-commercial-record-payment__form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <header className="kxd-os-commercial-record-payment__header">
            <h3>Register recurring due occurrence</h3>
            <p>
              Preview before commit. Duplicate periods are blocked. No Stripe subscription is
              created.
            </p>
          </header>

          <div className="kxd-os-commercial-record-payment__grid">
            <label className="kxd-os-commercial-field">
              <span className="kxd-os-commercial-field__label">
                Agreement <em>Required</em>
              </span>
              <select
                className="kxd-os-commercial-control"
                value={agreementId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setAgreementId(nextId);
                  const nextServices = agreementTargets.get(Number(nextId)) ?? [];
                  applyService(nextServices[0] ?? null);
                }}
                required
              >
                {agreementIds.map((id) => {
                  const first = agreementTargets.get(id)?.[0];
                  return (
                    <option key={id} value={id}>
                      {first?.agreementTitle ?? `Agreement ${id}`}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="kxd-os-commercial-field">
              <span className="kxd-os-commercial-field__label">
                Recurring service <em>Required</em>
              </span>
              <select
                className="kxd-os-commercial-control"
                value={serviceKey}
                onChange={(e) => {
                  const next =
                    servicesForAgreement.find((s) => s.serviceKey === e.target.value) ?? null;
                  applyService(next);
                }}
                required
              >
                {servicesForAgreement.map((s) => (
                  <option key={s.serviceKey} value={s.serviceKey}>
                    {s.isOperatorDefined
                      ? "Operator-defined current service…"
                      : `${s.serviceTitle} · $${(s.amountCents / 100).toFixed(2)}/${s.cadence === "monthly" ? "mo" : s.cadence}`}
                  </option>
                ))}
              </select>
              {selectedService ? (
                <span className="kxd-os-commercial-field__help">{selectedService.sourceLabel}</span>
              ) : null}
            </label>

            <label className="kxd-os-commercial-field">
              <span className="kxd-os-commercial-field__label">
                Service title <em>Required</em>
              </span>
              <input
                className="kxd-os-commercial-control"
                value={serviceTitle}
                onChange={(e) => {
                  setServiceTitle(e.target.value);
                  setPreview(null);
                }}
                required
              />
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
                onChange={(e) => {
                  setAmountDollars(e.target.value);
                  setPreview(null);
                }}
                required
              />
            </label>

            <label className="kxd-os-commercial-field">
              <span className="kxd-os-commercial-field__label">
                Cadence <em>Required</em>
              </span>
              <select
                className="kxd-os-commercial-control"
                value={cadence}
                onChange={(e) => {
                  setCadence(e.target.value as typeof cadence);
                  setPreview(null);
                }}
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </label>

            <label className="kxd-os-commercial-field">
              <span className="kxd-os-commercial-field__label">
                Billing day <em>Required</em>
              </span>
              <input
                className="kxd-os-commercial-control"
                type="number"
                min={1}
                max={28}
                value={billDay}
                onChange={(e) => {
                  setBillDay(e.target.value);
                  setPreview(null);
                }}
                required
              />
            </label>

            <label className="kxd-os-commercial-field">
              <span className="kxd-os-commercial-field__label">
                Period (YYYY-MM) <em>Required</em>
              </span>
              <input
                className="kxd-os-commercial-control"
                type="month"
                value={period}
                onChange={(e) => {
                  setPeriod(e.target.value);
                  setPreview(null);
                }}
                required
              />
            </label>

            <label className="kxd-os-commercial-field">
              <span className="kxd-os-commercial-field__label">
                Effective / start date <em>Optional</em>
              </span>
              <input
                className="kxd-os-commercial-control"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </label>
          </div>

          <div className="kxd-os-commercial-allocation-preview" aria-live="polite">
            <h4>Occurrence preview</h4>
            {preview ? (
              <ul>
                <li>
                  <strong>{preview.label}</strong>
                </li>
                <li>
                  Amount ${(preview.amountCents / 100).toFixed(2)} · Due {preview.dueDate} (
                  {periodLabel(period)})
                </li>
                <li>Key {preview.sourceKey}</li>
                <li>
                  {preview.wouldCreate
                    ? "Will create a new payable obligation"
                    : `Already registered (${preview.existingObligationId})`}
                </li>
              </ul>
            ) : (
              <p className="kxd-os-commercial-muted">Preview before registering.</p>
            )}
          </div>

          {error ? (
            <p className="kxd-os-commercial-record-payment__error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="kxd-os-commercial-record-payment__actions">
            <button
              type="button"
              className="kxd-os-btn kxd-os-btn--ghost"
              disabled={busy}
              onClick={() => void runPreview()}
            >
              {busy ? "Working…" : "Preview"}
            </button>
            <button
              type="submit"
              className="kxd-os-btn kxd-os-btn--primary"
              disabled={busy || !preview?.wouldCreate}
            >
              Register occurrence
            </button>
            <button
              type="button"
              className="kxd-os-btn kxd-os-btn--ghost"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setError(null);
                setPreview(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
