"use client";

import { useCallback, useEffect, useState } from "react";
import { KxdButton } from "@/components/os";
import { OpsCard, OpsSectionHead } from "@/components/admin/operations/shared/OpsBriefing";
import { formatUsdFromCents } from "@/lib/staff-pay/money";
import type { StaffDiscretionaryBonusView } from "@/lib/staff-pay/bonuses/types";

export function StaffDiscretionaryBonusCard({
  staffUserId,
  staffLabel,
  onMessage,
  onError,
}: {
  staffUserId: number;
  staffLabel: string;
  onMessage: (text: string) => void;
  onError: (text: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [bonuses, setBonuses] = useState<StaffDiscretionaryBonusView[]>([]);
  const [amountDollars, setAmountDollars] = useState("");
  const [reason, setReason] = useState("");
  const [bonusDate, setBonusDate] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/staff/payroll/bonuses?staffUserId=${staffUserId}`,
        { credentials: "same-origin" },
      );
      const data = (await res.json()) as {
        success?: boolean;
        bonuses?: StaffDiscretionaryBonusView[];
        error?: string;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Could not load bonuses.");
      }
      setBonuses(data.bonuses ?? []);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not load bonuses.");
    } finally {
      setLoading(false);
    }
  }, [onError, staffUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function recordBonus() {
    setBusy(true);
    try {
      const amountCents = Math.round(Number(amountDollars) * 100);
      if (!Number.isFinite(amountCents) || amountCents <= 0) {
        throw new Error("Enter a positive dollar amount.");
      }
      const res = await fetch("/api/admin/staff/payroll/bonuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          staffUserId,
          amountCents,
          reason,
          bonusDate,
          idempotencyKey,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        idempotent?: boolean;
        error?: string;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Could not record bonus.");
      }
      onMessage(
        data.idempotent
          ? "Bonus already recorded for this idempotency key."
          : "Discretionary bonus recorded.",
      );
      setAmountDollars("");
      setReason("");
      setIdempotencyKey("");
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not record bonus.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <OpsCard className="kxd-os-staff-docs-operator__section">
      <OpsSectionHead label={`Discretionary bonuses · ${staffLabel}`} />
      <p className="kxd-os-meta">
        Owner-only. Separate from hourly wage payment allocations. Use a stable idempotency key to prevent duplicate
        payouts.
      </p>
      {loading ? (
        <p className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
          Loading…
        </p>
      ) : (
        <>
          <ul className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
            {bonuses.length === 0 ? (
              <li>No bonuses recorded yet.</li>
            ) : (
              bonuses.map((b) => (
                <li key={b.id} style={{ marginBottom: "0.35rem" }}>
                  {b.bonusDate} · {formatUsdFromCents(b.amountCents)} · {b.reason}
                </li>
              ))
            )}
          </ul>
          <div className="kxd-os-staff-time__form" style={{ marginTop: "1rem" }}>
            <label className="kxd-os-field">
              <span className="kxd-os-meta">Amount (USD)</span>
              <input
                className="kxd-os-input"
                type="number"
                min="0"
                step="0.01"
                value={amountDollars}
                onChange={(e) => setAmountDollars(e.target.value)}
              />
            </label>
            <label className="kxd-os-field">
              <span className="kxd-os-meta">Bonus date</span>
              <input
                className="kxd-os-input"
                type="date"
                value={bonusDate}
                onChange={(e) => setBonusDate(e.target.value)}
              />
            </label>
            <label className="kxd-os-field">
              <span className="kxd-os-meta">Reason</span>
              <textarea
                className="kxd-os-input"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <label className="kxd-os-field">
              <span className="kxd-os-meta">Idempotency key</span>
              <input
                className="kxd-os-input"
                value={idempotencyKey}
                onChange={(e) => setIdempotencyKey(e.target.value)}
                placeholder="e.g. harlow-2026-11-welcome-bonus"
              />
            </label>
            <div className="kxd-os-staff-time__actions">
              <KxdButton type="button" variant="primary" disabled={busy} onClick={() => void recordBonus()}>
                Record bonus
              </KxdButton>
            </div>
          </div>
        </>
      )}
    </OpsCard>
  );
}