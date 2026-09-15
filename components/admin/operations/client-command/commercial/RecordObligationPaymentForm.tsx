"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CommercialInvoiceRow,
  CommercialObligationPaymentTarget,
} from "@/lib/client-command/commercial/types";
import {
  amountAfterApplicationModeChange,
  amountAfterObligationSelection,
  initialRecordPaymentAmountDollars,
} from "@/lib/client-command/commercial/record-payment-amount";

type ApplicationMode = "fifo" | "single" | "selected";

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
  const row = initialObligationId
    ? invoices.find((i) => i.obligationId === initialObligationId)
    : undefined;
  return initialRecordPaymentAmountDollars({
    initialObligationRemainingCents: row?.remainingCents ?? null,
    defaultOpenRemainingCents: targets[0]?.openRemainingCents ?? null,
  });
}

function buildPreviewBody(input: {
  amountCents: number;
  allocationMode: ApplicationMode;
  obligationId: string;
  selectedObligationIds: string[];
}): { ok: true; body: Record<string, unknown> } | { ok: false; error: string } {
  const body: Record<string, unknown> = {
    action: "preview-obligation-payment-allocation",
    amountCents: input.amountCents,
    allocationMode: "fifo",
  };
  if (input.allocationMode === "single") {
    if (!input.obligationId) return { ok: false, error: "Select an obligation." };
    body.allocationMode = "explicit";
    body.allocations = [{ obligationId: input.obligationId, amountCents: input.amountCents }];
  } else if (input.allocationMode === "selected") {
    if (!input.selectedObligationIds.length) {
      return { ok: false, error: "Select at least one obligation." };
    }
    body.allocationMode = "fifo";
    body.allowedObligationIds = input.selectedObligationIds;
  }
  return { ok: true, body };
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

  const [allocationMode, setAllocationMode] = useState<ApplicationMode>(
    props.initialObligationId ? "single" : "fifo",
  );
  const [obligationId, setObligationId] = useState(props.initialObligationId ?? "");
  const [selectedObligationIds, setSelectedObligationIds] = useState<string[]>([]);
  const [amountDollars, setAmountDollars] = useState(
    initialAmount(props.invoices, props.targets, props.initialObligationId),
  );
  const [obligationRemainingHelp, setObligationRemainingHelp] = useState<string | null>(
    (() => {
      if (!props.initialObligationId) return null;
      const row = props.invoices.find((i) => i.obligationId === props.initialObligationId);
      if (!row) return null;
      return amountAfterObligationSelection({
        currentAmountDollars: "",
        selectedRemainingCents: row.remainingCents,
      }).remainingHelp;
    })(),
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
      const built = buildPreviewBody({
        amountCents,
        allocationMode,
        obligationId,
        selectedObligationIds,
      });
      if (!built.ok) {
        setPreview(null);
        setPreviewError(built.error);
        return;
      }
      setPreviewBusy(true);
      try {
        const res = await fetch(
          `/api/admin/sales/contracts/${selected.agreementId}/lifecycle`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(built.body),
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
    allocationMode: ApplicationMode;
    obligationId: string;
    selectedObligationIds: string[];
    agreementId: number;
  }) {
    const amountCents = Math.round(Number(next.amountDollars) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    const built = buildPreviewBody({
      amountCents,
      allocationMode: next.allocationMode,
      obligationId: next.obligationId,
      selectedObligationIds: next.selectedObligationIds,
    });
    if (!built.ok) {
      setPreview(null);
      setPreviewError(built.error);
      return;
    }
    setPreviewBusy(true);
    try {
      const res = await fetch(`/api/admin/sales/contracts/${next.agreementId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(built.body),
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
    if (!preview || preview.unallocatedCents > 0) {
      setError("Preview a complete allocation before recording.");
      return;
    }
    if (allocationMode === "selected" && selectedObligationIds.length === 0) {
      setError("Select at least one obligation.");
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
      } else if (allocationMode === "selected") {
        // One payment transaction; legs from preview (FIFO within selected set only).
        body.allocationMode = "explicit";
        body.allowedObligationIds = selectedObligationIds;
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

  function toggleSelected(obligationIdValue: string) {
    setSelectedObligationIds((prev) => {
      const next = prev.includes(obligationIdValue)
        ? prev.filter((id) => id !== obligationIdValue)
        : [...prev, obligationIdValue];
      if (selected) {
        void refreshPreview({
          amountDollars,
          allocationMode: "selected",
          obligationId,
          selectedObligationIds: next,
          agreementId: selected.agreementId,
        });
      }
      return next;
    });
  }

  const selectedRemainingCents = openInvoices
    .filter((row) => row.obligationId && selectedObligationIds.includes(row.obligationId))
    .reduce((sum, row) => sum + row.remainingCents, 0);

  return (
    <div className="kxd-os-commercial-record-payment">
      {!open ? (
        <div className="kxd-os-commercial-record-payment__cta">
          <div>
            <h3>Record payment</h3>
            <p>
              Apply an already-received external payment to open obligations. Supports FIFO,
              single obligation, or selected obligations. Does not charge Stripe.
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
                  selectedObligationIds,
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
              charge or invoice will be created. One payment stays one transaction even when it
              covers multiple obligations.
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
                  setSelectedObligationIds([]);
                  setAllocationMode("fifo");
                  const next = props.targets.find((t) => String(t.agreementId) === nextId);
                  if (next) {
                    void refreshPreview({
                      amountDollars,
                      allocationMode: "fifo",
                      obligationId: "",
                      selectedObligationIds: [],
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
                  const mode = e.target.value as ApplicationMode;
                  setAllocationMode(mode);
                  const preserved = amountAfterApplicationModeChange(amountDollars);
                  if (preserved !== amountDollars) setAmountDollars(preserved);
                  if (selected) {
                    void refreshPreview({
                      amountDollars: preserved,
                      allocationMode: mode,
                      obligationId,
                      selectedObligationIds,
                      agreementId: selected.agreementId,
                    });
                  }
                }}
              >
                <option value="fifo">FIFO across earliest open obligations</option>
                <option value="single">Single obligation</option>
                <option value="selected">Selected obligations</option>
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
                    const next = amountAfterObligationSelection({
                      currentAmountDollars: amountDollars,
                      selectedRemainingCents: row?.remainingCents ?? null,
                    });
                    // Never overwrite operator amount with obligation remaining.
                    setObligationRemainingHelp(next.remainingHelp);
                    if (selected) {
                      void refreshPreview({
                        amountDollars: next.amountDollars,
                        allocationMode: "single",
                        obligationId: nextObl,
                        selectedObligationIds,
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
                {obligationRemainingHelp ? (
                  <span className="kxd-os-commercial-field__help">
                    {obligationRemainingHelp}. Amount stays as entered.
                  </span>
                ) : null}
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
                      selectedObligationIds,
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

          {allocationMode === "selected" ? (
            <fieldset className="kxd-os-commercial-obligation-select">
              <legend>Selected obligations</legend>
              <p className="kxd-os-commercial-field__help">
                Payment allocates FIFO only within the checked set. Unselected obligations are
                never touched.
              </p>
              <ul className="kxd-os-commercial-obligation-select__list">
                {openInvoices.map((row) => {
                  const id = row.obligationId ?? "";
                  if (!id) return null;
                  const checked = selectedObligationIds.includes(id);
                  return (
                    <li key={row.id}>
                      <label className="kxd-os-commercial-obligation-select__row">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelected(id)}
                        />
                        <span className="kxd-os-commercial-obligation-select__copy">
                          <strong>{row.title}</strong>
                          <span>
                            Original {row.amountLabel} · Paid {row.amountPaidLabel} · Remaining{" "}
                            {row.remainingLabel}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              {selectedObligationIds.length > 0 ? (
                <p className="kxd-os-commercial-muted">
                  Selected remaining capacity ${(selectedRemainingCents / 100).toFixed(2)}
                </p>
              ) : null}
            </fieldset>
          ) : null}

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
              <>
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
                <p className="kxd-os-commercial-muted">
                  Total allocated $
                  {((preview.totalAmountCents - preview.unallocatedCents) / 100).toFixed(2)}
                  {preview.unallocatedCents > 0
                    ? ` · Unallocated $${(preview.unallocatedCents / 100).toFixed(2)}`
                    : " · Unallocated $0.00"}
                </p>
              </>
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
                    selectedObligationIds,
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
              disabled={
                busy ||
                !preview ||
                (preview?.unallocatedCents ?? 0) > 0 ||
                (allocationMode === "selected" && selectedObligationIds.length === 0)
              }
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
