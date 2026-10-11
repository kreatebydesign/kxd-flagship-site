"use client";

import { useEffect, useMemo, useState } from "react";
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

const SOURCE_OPTIONS = [
  { value: "project-overage", label: "Project payment overage" },
  { value: "referral-credit", label: "Referral credit" },
] as const;

function dollarsToCents(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function RecordAccountCreditForm(props: {
  clientId: number;
  targets: CommercialObligationPaymentTarget[];
  invoices: CommercialInvoiceRow[];
}) {
  const router = useRouter();
  const defaults = props.targets[0];
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AllocationPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const [agreementId, setAgreementId] = useState(defaults?.agreementId ?? 0);
  const [amountDollars, setAmountDollars] = useState("");
  const [creditedAt, setCreditedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [sourceType, setSourceType] = useState<"project-overage" | "referral-credit">(
    "project-overage",
  );
  const [label, setLabel] = useState("Project payment overage");
  const [reason, setReason] = useState("Project payment overage");
  const [note, setNote] = useState("");

  const openInvoices = useMemo(
    () =>
      props.invoices.filter(
        (row) =>
          row.agreementId === agreementId &&
          row.canRecordPayment &&
          row.remainingCents > 0 &&
          Boolean(row.obligationId),
      ),
    [props.invoices, agreementId],
  );

  const [selectedObligationIds, setSelectedObligationIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedObligationIds(
      openInvoices
        .map((row) => row.obligationId)
        .filter((id): id is string => Boolean(id)),
    );
  }, [agreementId, openInvoices]);

  useEffect(() => {
    if (sourceType === "project-overage") {
      setLabel((current) =>
        current === "Referral credit" || current.startsWith("KXD Referral Credit")
          ? "Project payment overage"
          : current,
      );
      setReason("Project payment overage");
    } else {
      setLabel((current) =>
        current === "Project payment overage" ? "Referral credit" : current,
      );
      setReason("Referral credit");
    }
  }, [sourceType]);

  useEffect(() => {
    if (!open) return;
    const amountCents = dollarsToCents(amountDollars);
    if (!amountCents || !agreementId || !selectedObligationIds.length) {
      setPreview(null);
      setPreviewError(null);
      return;
    }

    let cancelled = false;
    setPreviewBusy(true);
    setPreviewError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/admin/sales/contracts/${agreementId}/lifecycle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "preview-account-credit-allocation",
            amountCents,
            allocationMode: "fifo",
            allowedObligationIds: selectedObligationIds,
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          preview?: AllocationPreview;
        };
        if (cancelled) return;
        if (!res.ok || !data.ok || !data.preview) {
          setPreview(null);
          setPreviewError(data.error || "Could not preview credit allocation.");
          return;
        }
        setPreview(data.preview);
      } catch (err) {
        if (!cancelled) {
          setPreview(null);
          setPreviewError(
            err instanceof Error ? err.message : "Could not preview credit allocation.",
          );
        }
      } finally {
        if (!cancelled) setPreviewBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, agreementId, amountDollars, selectedObligationIds]);

  async function submit() {
    setError(null);
    const amountCents = dollarsToCents(amountDollars);
    if (!agreementId) {
      setError("Select an agreement.");
      return;
    }
    if (!amountCents) {
      setError("Enter a valid credit amount.");
      return;
    }
    if (!creditedAt) {
      setError("Effective date is required.");
      return;
    }
    if (!label.trim() || !reason.trim()) {
      setError("Label and reason are required.");
      return;
    }
    if (!selectedObligationIds.length) {
      setError("Select at least one obligation for allocation.");
      return;
    }
    if (!confirmed) {
      setError("Confirm this is an account credit, not a cash payment.");
      return;
    }
    if (preview && preview.unallocatedCents > 0) {
      setError(
        `Credit leaves ${formatCents(preview.unallocatedCents)} unallocated. Adjust amount or obligations.`,
      );
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/sales/contracts/${agreementId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record-account-credit",
          amountCents,
          currency: "USD",
          creditedAt,
          sourceType,
          label: label.trim(),
          reason: reason.trim(),
          note: note.trim() || null,
          allocationMode: "fifo",
          allowedObligationIds: selectedObligationIds,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not record account credit.");
      }
      setOpen(false);
      setConfirmed(false);
      setAmountDollars("");
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record account credit.");
    } finally {
      setBusy(false);
    }
  }

  if (!props.targets.length) return null;

  return (
    <div className="kxd-os-commercial-inline-form">
      {!open ? (
        <button type="button" className="kxd-os-btn kxd-os-btn--ghost" onClick={() => setOpen(true)}>
          Record account credit
        </button>
      ) : (
        <div className="kxd-os-commercial-card" data-testid="account-credit-form">
          <div className="kxd-os-commercial-card__main">
            <h3 className="kxd-os-commercial-card__title">Record account credit</h3>
            <p className="kxd-os-commercial-lead">
              Non-cash balance reduction — project overage or referral credits. Does not record
              cash received and does not charge a card.
            </p>

            <label className="kxd-os-field">
              <span>Agreement</span>
              <select
                value={agreementId || ""}
                onChange={(e) => setAgreementId(Number(e.target.value))}
              >
                {props.targets.map((t) => (
                  <option key={t.agreementId} value={t.agreementId}>
                    {t.agreementTitle}
                  </option>
                ))}
              </select>
            </label>

            <label className="kxd-os-field">
              <span>Source / type</span>
              <select
                value={sourceType}
                onChange={(e) =>
                  setSourceType(e.target.value as "project-overage" | "referral-credit")
                }
              >
                {SOURCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="kxd-os-field">
              <span>Amount (USD)</span>
              <input
                type="text"
                inputMode="decimal"
                value={amountDollars}
                onChange={(e) => setAmountDollars(e.target.value)}
                placeholder="100.00"
              />
            </label>

            <label className="kxd-os-field">
              <span>Effective date</span>
              <input
                type="date"
                value={creditedAt}
                onChange={(e) => setCreditedAt(e.target.value)}
              />
            </label>

            <label className="kxd-os-field">
              <span>Label</span>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="KXD Referral Credit — Cody Thompson"
              />
            </label>

            <label className="kxd-os-field">
              <span>Source / reason</span>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Project payment overage"
              />
            </label>

            <label className="kxd-os-field">
              <span>Note</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Optional operator / client-facing note"
              />
            </label>

            <fieldset className="kxd-os-field">
              <legend>Allocate to obligations</legend>
              <div className="kxd-os-commercial-check-list">
                {openInvoices.map((row) => {
                  const obligationId = row.obligationId!;
                  const checked = selectedObligationIds.includes(obligationId);
                  return (
                    <label key={obligationId} className="kxd-os-check">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedObligationIds((current) =>
                            checked
                              ? current.filter((id) => id !== obligationId)
                              : [...current, obligationId],
                          );
                        }}
                      />
                      <span>
                        {row.title} · open {row.remainingLabel}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="kxd-os-commercial-preview" data-testid="account-credit-preview">
              <h4>Allocation preview</h4>
              {previewBusy ? <p>Calculating…</p> : null}
              {previewError ? <p className="kxd-os-error">{previewError}</p> : null}
              {preview ? (
                <ul>
                  {preview.legs.map((leg) => (
                    <li key={leg.obligationId}>
                      {leg.label}: {formatCents(leg.amountCents)} → remaining{" "}
                      {formatCents(leg.remainingAfterCents)}
                    </li>
                  ))}
                  {preview.unallocatedCents > 0 ? (
                    <li>Unallocated: {formatCents(preview.unallocatedCents)}</li>
                  ) : null}
                </ul>
              ) : null}
            </div>

            <label className="kxd-os-check">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span>
                I confirm this is an audited account credit — not a Cash App / cash payment.
              </span>
            </label>

            {error ? <p className="kxd-os-error">{error}</p> : null}

            <div className="kxd-os-commercial-card__actions">
              <button
                type="button"
                className="kxd-os-btn"
                disabled={busy}
                onClick={() => void submit()}
              >
                {busy ? "Recording…" : "Record account credit"}
              </button>
              <button
                type="button"
                className="kxd-os-btn kxd-os-btn--ghost"
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  setError(null);
                  setConfirmed(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
