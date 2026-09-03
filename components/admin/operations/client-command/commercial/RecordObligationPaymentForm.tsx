"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CommercialInvoiceRow,
  CommercialObligationPaymentTarget,
} from "@/lib/client-command/commercial/types";

type AllocationPreviewLeg = {
  obligationId: string;
  label: string;
  amountCents: number;
  remainingBeforeCents: number;
  remainingAfterCents: number;
};

type AllocationPreview = {
  totalAmountCents: number;
  unallocatedCents: number;
  legs: AllocationPreviewLeg[];
};

function dollarsFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function methodLabel(method: string): string {
  const map: Record<string, string> = {
    stripe: "Stripe",
    "cash-app": "Cash App",
    zelle: "Zelle",
    ach: "ACH",
    check: "Check",
    cash: "Cash",
    other: "Other",
    wire: "Wire",
  };
  return map[method] ?? method;
}

function initialAmount(
  invoices: CommercialInvoiceRow[],
  targets: CommercialObligationPaymentTarget[],
  initialObligationId?: string | null,
): string {
  if (initialObligationId) {
    const row = invoices.find((i) => i.obligationId === initialObligationId);
    if (row) return dollarsFromCents(row.remainingCents);
  }
  const defaults = targets[0];
  return defaults ? dollarsFromCents(Math.min(defaults.openRemainingCents, 35000)) : "";
}

export function RecordObligationPaymentForm(props: {
  clientId: number;
  targets: CommercialObligationPaymentTarget[];
  invoices: CommercialInvoiceRow[];
  initialObligationId?: string | null;
  initialAgreementId?: number | null;
  onClose?: () => void;
}) {
  const router = useRouter();
  const defaults = props.targets[0];
  const startOpen = Boolean(props.initialObligationId || props.onClose);
  const [open, setOpen] = useState(startOpen);
  const [busy, setBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AllocationPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [agreementId, setAgreementId] = useState(
    String(props.initialAgreementId ?? defaults?.agreementId ?? ""),
  );
  const selected =
    props.targets.find((t) => String(t.agreementId) === agreementId) ?? defaults ?? null;

  const openInvoices = props.invoices.filter(
    (row) =>
      row.source === "obligation" &&
      row.agreementId === selected?.agreementId &&
      row.canRecordPayment,
  );

  const [allocationMode, setAllocationMode] = useState<"fifo" | "single">(
    props.initialObligationId ? "single" : "fifo",
  );
  const [obligationId, setObligationId] = useState(props.initialObligationId ?? "");
  const [amountDollars, setAmountDollars] = useState(
    initialAmount(props.invoices, props.targets, props.initialObligationId),
  );
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<
    "stripe" | "cash-app" | "zelle" | "ach" | "check" | "cash" | "other" | "wire"
  >("cash-app");
  const [externalReference, setExternalReference] = useState("");
  const [operatorNote, setOperatorNote] = useState("");

  useEffect(() => {
    if (!startOpen || !selected) return;
    let cancelled = false;
    void (async () => {
      const amountCents = Math.round(Number(amountDollars) * 100);
      if (!Number.isFinite(amountCents) || amountCents <= 0) return;
      setPreviewBusy(true);
      try {
        const body: Record<string, unknown> = {
          action: "preview-obligation-payment-allocation",
          amountCents,
          allocationMode: allocationMode === "single" ? "explicit" : "fifo",
        };
        if (allocationMode === "single" && obligationId) {
          body.allocations = [{ obligationId, amountCents }];
        }
        const res = await fetch(
          `/api/admin/sales/contracts/${selected.agreementId}/lifecycle`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        if (cancelled) return;
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          preview?: AllocationPreview;
        };
        if (!res.ok || !data.ok || !data.preview) {
          setPreview(null);
          setPreviewError(data.error || "Could not preview allocation.");
          return;
        }
        setPreview(data.preview);
        setPreviewError(null);
      } catch {
        if (!cancelled) {
          setPreview(null);
          setPreviewError("Could not preview allocation.");
        }
      } finally {
        if (!cancelled) setPreviewBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally once on mount when opened from a row action / prefilled CTA.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshPreview(next: {
    amountDollars: string;
    allocationMode: "fifo" | "single";
    obligationId: string;
    agreementId: number;
  }) {
    const amountCents = Math.round(Number(next.amountDollars) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    setPreviewBusy(true);
    try {
      const body: Record<string, unknown> = {
        action: "preview-obligation-payment-allocation",
        amountCents,
        allocationMode: "fifo",
      };
      if (next.allocationMode === "single" && next.obligationId) {
        body.allocationMode = "explicit";
        body.allocations = [{ obligationId: next.obligationId, amountCents }];
      }
      const res = await fetch(`/api/admin/sales/contracts/${next.agreementId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        preview?: AllocationPreview;
      };
      if (!res.ok || !data.ok || !data.preview) {
        setPreview(null);
        setPreviewError(data.error || "Could not preview allocation.");
        return;
      }
      setPreview(data.preview);
      setPreviewError(null);
    } catch {
      setPreview(null);
      setPreviewError("Could not preview allocation.");
    } finally {
      setPreviewBusy(false);
    }
  }

  if (!props.targets.length && !open) {
    return null;
  }

  async function submit() {
    if (!selected) {
      setError("Select an agreement.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const amountCents = Math.round(Number(amountDollars) * 100);
      const body: Record<string, unknown> = {
        action: "record-obligation-external-payment",
        amountCents,
        currency: selected.currency,
        paidAt,
        externalPaymentMethod: method,
        externalReference: externalReference.trim() || null,
        operatorNote: operatorNote.trim() || null,
        paidOutsideStripe: true,
      };

      if (allocationMode === "single" && obligationId) {
        body.obligationId = obligationId;
      } else if (allocationMode === "fifo") {
        body.allocationMode = "fifo";
      } else if (preview?.legs?.length) {
        body.allocationMode = "explicit";
        body.allocations = preview.legs.map((leg) => ({
          obligationId: leg.obligationId,
          amountCents: leg.amountCents,
        }));
      }

      const res = await fetch(
        `/api/admin/sales/contracts/${selected.agreementId}/lifecycle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not record payment.");
      }
      setOpen(false);
      props.onClose?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kxd-os-commercial-record-payment">
      {!open ? (
        <div className="kxd-os-commercial-record-payment__cta">
          <div>
            <h3>Record payment</h3>
            <p>
              Apply an already-received external payment to open obligations. Supports partial
              amounts and FIFO allocation. Does not charge Stripe.
            </p>
          </div>
          <button
            type="button"
            className="kxd-os-btn kxd-os-btn--primary"
            onClick={() => {
              setOpen(true);
              if (selected) {
                void refreshPreview({
                  amountDollars,
                  allocationMode,
                  obligationId,
                  agreementId: selected.agreementId,
                });
              }
            }}
          >
            Record Payment
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
            <h3>Record Payment</h3>
            <p>
              Reconciliation only. Review the allocation preview before submitting. No Stripe
              charge or invoice will be created.
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
                  setObligationId("");
                  setAllocationMode("fifo");
                  const next = props.targets.find((t) => String(t.agreementId) === nextId);
                  if (next) {
                    void refreshPreview({
                      amountDollars,
                      allocationMode: "fifo",
                      obligationId: "",
                      agreementId: next.agreementId,
                    });
                  }
                }}
                required
              >
                {props.targets.map((t) => (
                  <option key={t.agreementId} value={t.agreementId}>
                    {t.agreementTitle} · {t.openObligationCount} open · $
                    {(t.openRemainingCents / 100).toFixed(2)} remaining
                  </option>
                ))}
              </select>
            </label>

            <label className="kxd-os-commercial-field">
              <span className="kxd-os-commercial-field__label">
                Application <em>Required</em>
              </span>
              <select
                className="kxd-os-commercial-control"
                value={allocationMode}
                onChange={(e) => {
                  const mode = e.target.value as "fifo" | "single";
                  setAllocationMode(mode);
                  if (selected) {
                    void refreshPreview({
                      amountDollars,
                      allocationMode: mode,
                      obligationId,
                      agreementId: selected.agreementId,
                    });
                  }
                }}
              >
                <option value="fifo">FIFO across earliest open obligations</option>
                <option value="single">Single obligation</option>
              </select>
            </label>

            {allocationMode === "single" ? (
              <label className="kxd-os-commercial-field">
                <span className="kxd-os-commercial-field__label">
                  Obligation <em>Required</em>
                </span>
                <select
                  className="kxd-os-commercial-control"
                  value={obligationId}
                  onChange={(e) => {
                    const nextObl = e.target.value;
                    setObligationId(nextObl);
                    const row = openInvoices.find((i) => i.obligationId === nextObl);
                    const nextAmount = row
                      ? dollarsFromCents(row.remainingCents)
                      : amountDollars;
                    if (row) setAmountDollars(nextAmount);
                    if (selected) {
                      void refreshPreview({
                        amountDollars: nextAmount,
                        allocationMode: "single",
                        obligationId: nextObl,
                        agreementId: selected.agreementId,
                      });
                    }
                  }}
                  required
                >
                  <option value="">Select…</option>
                  {openInvoices.map((row) => (
                    <option key={row.id} value={row.obligationId ?? ""}>
                      {row.title} · remaining {row.remainingLabel}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

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
                onBlur={() => {
                  if (selected) {
                    void refreshPreview({
                      amountDollars,
                      allocationMode,
                      obligationId,
                      agreementId: selected.agreementId,
                    });
                  }
                }}
                required
              />
            </label>

            <label className="kxd-os-commercial-field">
              <span className="kxd-os-commercial-field__label">
                Received date <em>Required</em>
              </span>
              <input
                className="kxd-os-commercial-control"
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                required
              />
            </label>

            <label className="kxd-os-commercial-field">
              <span className="kxd-os-commercial-field__label">
                Method <em>Required</em>
              </span>
              <select
                className="kxd-os-commercial-control"
                value={method}
                onChange={(e) => setMethod(e.target.value as typeof method)}
                required
              >
                <option value="cash-app">Cash App</option>
                <option value="zelle">Zelle</option>
                <option value="ach">ACH</option>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
                <option value="stripe">Stripe (already collected)</option>
                <option value="wire">Wire</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="kxd-os-commercial-field">
              <span className="kxd-os-commercial-field__label">
                External reference / transaction ID <em>Optional</em>
              </span>
              <input
                className="kxd-os-commercial-control"
                type="text"
                value={externalReference}
                onChange={(e) => setExternalReference(e.target.value)}
                placeholder="Never store card numbers or credentials"
              />
            </label>
          </div>

          <label className="kxd-os-commercial-field">
            <span className="kxd-os-commercial-field__label">
              Internal note <em>Optional</em>
            </span>
            <textarea
              className="kxd-os-commercial-control kxd-os-commercial-control--textarea"
              rows={2}
              value={operatorNote}
              onChange={(e) => setOperatorNote(e.target.value)}
            />
          </label>

          <div className="kxd-os-commercial-allocation-preview" aria-live="polite">
            <h4>Allocation preview</h4>
            {previewBusy ? (
              <p className="kxd-os-commercial-muted">Updating preview…</p>
            ) : null}
            {previewError ? (
              <p className="kxd-os-commercial-record-payment__error">{previewError}</p>
            ) : null}
            {preview ? (
              <ul>
                {preview.legs.map((leg) => (
                  <li key={leg.obligationId}>
                    <strong>{leg.label}</strong>
                    {" · "}
                    apply ${(leg.amountCents / 100).toFixed(2)}
                    {" · "}
                    remaining after ${(leg.remainingAfterCents / 100).toFixed(2)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="kxd-os-commercial-muted">
                Enter an amount and leave the field to preview where funds apply.
              </p>
            )}
            {preview && preview.unallocatedCents > 0 ? (
              <p className="kxd-os-commercial-record-payment__error">
                ${(preview.unallocatedCents / 100).toFixed(2)} would remain unallocated.
              </p>
            ) : null}
            {selected && open && !preview && !previewBusy && !previewError ? (
              <button
                type="button"
                className="kxd-os-link-quiet"
                onClick={() =>
                  void refreshPreview({
                    amountDollars,
                    allocationMode,
                    obligationId,
                    agreementId: selected.agreementId,
                  })
                }
              >
                Preview allocation
              </button>
            ) : null}
          </div>

          {error ? (
            <p className="kxd-os-commercial-record-payment__error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="kxd-os-commercial-record-payment__actions">
            <button
              type="submit"
              className="kxd-os-btn kxd-os-btn--primary"
              disabled={busy || !preview || (preview?.unallocatedCents ?? 0) > 0}
            >
              {busy ? "Recording…" : `Record ${methodLabel(method)} payment`}
            </button>
            <button
              type="button"
              className="kxd-os-btn kxd-os-btn--ghost"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setError(null);
                props.onClose?.();
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
