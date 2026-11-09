"use client";

import { useCallback, useEffect, useState } from "react";
import { KxdButton } from "@/components/os";
import { OpsCard, OpsSectionHead } from "@/components/admin/operations/shared/OpsBriefing";
import { formatUsdFromCents } from "@/lib/staff-pay/money";
import type {
  StaffWagePayableSourceRef,
  StaffWagePaymentMethod,
  StaffWagePaymentView,
} from "@/lib/staff-pay/wage-payments/types";

const TYLER_USER_ID = 3;

type SettlementPayload = {
  documentedGrossCents: number;
  settledGrossCents: number;
  outstandingGrossCents: number;
  ledgerReady: boolean;
};

type UnsettledSource = StaffWagePayableSourceRef & {
  localDateKey: string;
  payableMinutes: number;
  grossCents: number;
  label: string;
};

export function StaffWagePaymentCard({
  onMessage,
  onError,
}: {
  onMessage: (text: string) => void;
  onError: (text: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [settlement, setSettlement] = useState<SettlementPayload | null>(null);
  const [payments, setPayments] = useState<StaffWagePaymentView[]>([]);
  const [unsettled, setUnsettled] = useState<UnsettledSource[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [externalReference, setExternalReference] = useState("");
  const [officialPayrollDate, setOfficialPayrollDate] = useState("");
  const [settledAt, setSettledAt] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<StaffWagePaymentMethod>("zelle");

  const sourceKey = (s: StaffWagePayableSourceRef) =>
    s.sourceKind === "time_shift" ? `shift:${s.shiftId}` : `hist:${s.historicalEntryId}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/staff/payroll/wage-payments?staffUserId=${TYLER_USER_ID}`,
        { credentials: "same-origin" },
      );
      const data = (await res.json()) as {
        success?: boolean;
        settlement?: SettlementPayload;
        payments?: StaffWagePaymentView[];
        unsettled?: UnsettledSource[];
        error?: string;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Could not load wage settlement.");
      }
      setSettlement(data.settlement ?? null);
      setPayments(data.payments ?? []);
      setUnsettled(data.unsettled ?? []);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not load wage settlement.");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedGross = unsettled
    .filter((s) => selected.has(sourceKey(s)))
    .reduce((sum, s) => sum + s.grossCents, 0);

  async function recordPayment() {
    setBusy(true);
    try {
      const allocations: StaffWagePayableSourceRef[] = unsettled
        .filter((s) => selected.has(sourceKey(s)))
        .map((s) =>
          s.sourceKind === "time_shift"
            ? { sourceKind: "time_shift", shiftId: s.shiftId }
            : { sourceKind: "historical_entry", historicalEntryId: s.historicalEntryId },
        );
      const res = await fetch("/api/admin/staff/payroll/wage-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          staffUserId: TYLER_USER_ID,
          paymentMethod,
          officialPayrollDate,
          settledAt: settledAt || new Date().toISOString(),
          externalReference,
          allocations,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        idempotent?: boolean;
        error?: string;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Could not record wage payment.");
      }
      onMessage(
        data.idempotent
          ? "Payment reference already on file (no duplicate created)."
          : "External wage payment recorded with entry-level allocations.",
      );
      setSelected(new Set());
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not record wage payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <OpsCard>
      <OpsSectionHead label="External wage settlements" />
      <p className="kxd-os-meta">
        Records off-platform wage payments with allocations to shifts and historical durations. Not
        tax withholding or net pay.
      </p>
      {loading ? <p className="kxd-os-meta">Loading settlement…</p> : null}
      {settlement ? (
        <ul className="kxd-os-meta" style={{ marginTop: "0.75rem", lineHeight: 1.6 }}>
          <li>
            <strong>Documented gross:</strong> {formatUsdFromCents(settlement.documentedGrossCents)}
          </li>
          <li>
            <strong>Externally settled:</strong> {formatUsdFromCents(settlement.settledGrossCents)}
          </li>
          <li>
            <strong>Outstanding:</strong> {formatUsdFromCents(settlement.outstandingGrossCents)}
          </li>
        </ul>
      ) : null}

      {payments.length > 0 ? (
        <div style={{ marginTop: "1rem" }}>
          <p className="kxd-os-meta">
            <strong>Recorded payments</strong>
          </p>
          <ul className="kxd-os-meta" style={{ paddingLeft: "1.25rem" }}>
            {payments.map((p) => (
              <li key={p.id}>
                {formatUsdFromCents(p.totalCents)} · {p.paymentMethod} · payroll {p.officialPayrollDate}{" "}
                · settled {new Date(p.settledAt).toLocaleDateString()} · {p.status}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {unsettled.length > 0 ? (
        <div style={{ marginTop: "1rem" }}>
          <p className="kxd-os-meta">
            <strong>Unsettled sources</strong> (select for next external payment)
          </p>
          <ul className="kxd-os-meta" style={{ paddingLeft: 0, listStyle: "none" }}>
            {unsettled.map((s) => {
              const key = sourceKey(s);
              const checked = selected.has(key);
              return (
                <li key={key} style={{ marginBottom: "0.35rem" }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = new Set(selected);
                        if (checked) next.delete(key);
                        else next.add(key);
                        setSelected(next);
                      }}
                    />{" "}
                    {s.label} · {formatUsdFromCents(s.grossCents)}
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="kxd-os-meta">Selected total: {formatUsdFromCents(selectedGross)}</p>
        </div>
      ) : null}

      <div style={{ marginTop: "1rem", display: "grid", gap: "0.5rem" }}>
        <label className="kxd-os-meta">
          External reference
          <input
            className="kxd-os-input"
            style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
            value={externalReference}
            onChange={(e) => setExternalReference(e.target.value)}
          />
        </label>
        <label className="kxd-os-meta">
          Official payroll date
          <input
            type="date"
            className="kxd-os-input"
            style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
            value={officialPayrollDate}
            onChange={(e) => setOfficialPayrollDate(e.target.value)}
          />
        </label>
        <label className="kxd-os-meta">
          Settlement date/time (ISO)
          <input
            className="kxd-os-input"
            style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
            value={settledAt}
            onChange={(e) => setSettledAt(e.target.value)}
            placeholder="2026-11-03T17:00:00.000Z"
          />
        </label>
        <label className="kxd-os-meta">
          Method
          <select
            className="kxd-os-input"
            style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as StaffWagePaymentMethod)}
          >
            <option value="zelle">Zelle</option>
            <option value="ach">ACH</option>
            <option value="check">Check</option>
            <option value="cash">Cash</option>
            <option value="wire">Wire</option>
            <option value="cash-app">Cash App</option>
            <option value="other">Other</option>
          </select>
        </label>
        <KxdButton
          type="button"
          disabled={busy || selected.size === 0 || !externalReference.trim() || !officialPayrollDate}
          loading={busy}
          onClick={() => void recordPayment()}
        >
          Record external wage payment
        </KxdButton>
      </div>
    </OpsCard>
  );
}
