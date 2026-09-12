"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CommercialRecurringServiceTarget } from "@/lib/client-command/commercial/types";

/**
 * Minimal operator control: ensure recurring obligations through a date.
 * Uses authoritative recurring resolution — does not invent Stripe subscriptions.
 */
export function EnsureRecurringThroughDateForm(props: {
  clientId: number;
  targets: CommercialRecurringServiceTarget[];
}) {
  const router = useRouter();
  const agreementIds = useMemo(() => {
    const ids = [...new Set(props.targets.map((t) => t.agreementId))];
    return ids;
  }, [props.targets]);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreementId, setAgreementId] = useState(String(agreementIds[0] ?? ""));
  const [throughDate, setThroughDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [report, setReport] = useState<{
    createdCount: number;
    alreadyPresent: number;
    skipped: number;
    conflicts: number;
    persisted: boolean;
    warnings: string[];
    conflictMessages: string[];
  } | null>(null);

  if (!agreementIds.length) return null;

  async function run(dryRun: boolean) {
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch(
        `/api/admin/sales/contracts/${Number(agreementId)}/lifecycle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "ensure-recurring-obligations-through-date",
            throughDate,
            dryRun,
          }),
        },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        createdCount?: number;
        alreadyPresent?: unknown[];
        skipped?: unknown[];
        conflicts?: Array<{ message: string }>;
        warnings?: string[];
        persisted?: boolean;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Ensure recurring failed.");
      }
      setReport({
        createdCount: json.createdCount ?? 0,
        alreadyPresent: json.alreadyPresent?.length ?? 0,
        skipped: json.skipped?.length ?? 0,
        conflicts: json.conflicts?.length ?? 0,
        persisted: Boolean(json.persisted),
        warnings: json.warnings ?? [],
        conflictMessages: (json.conflicts ?? []).map((c) => c.message),
      });
      if (!dryRun && json.persisted) router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ensure failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kxd-os-commercial-record-payment__cta">
      <div>
        <p className="kxd-os-eyebrow">Recurring obligations</p>
        <h3>Ensure recurring charges through date</h3>
        <p>
          Materialize missing recurring-period obligations from the authoritative
          commercial service definition. No Stripe subscriptions. No invoices. No
          payments.
        </p>
      </div>
      {!open ? (
        <button
          type="button"
          className="kxd-os-btn kxd-os-btn--ghost"
          onClick={() => setOpen(true)}
        >
          Ensure through date
        </button>
      ) : (
        <div className="kxd-os-stack" style={{ gap: 8, minWidth: 260 }}>
          {agreementIds.length > 1 ? (
            <label className="kxd-os-field">
              <span>Agreement</span>
              <select
                value={agreementId}
                onChange={(e) => setAgreementId(e.target.value)}
              >
                {agreementIds.map((id) => (
                  <option key={id} value={id}>
                    Contract {id}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="kxd-os-field">
            <span>Through date</span>
            <input
              type="date"
              value={throughDate}
              onChange={(e) => setThroughDate(e.target.value)}
            />
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="kxd-os-btn kxd-os-btn--ghost"
              disabled={busy}
              onClick={() => void run(true)}
            >
              Dry run
            </button>
            <button
              type="button"
              className="kxd-os-btn kxd-os-btn--primary"
              disabled={busy}
              onClick={() => void run(false)}
            >
              Ensure
            </button>
            <button
              type="button"
              className="kxd-os-btn kxd-os-btn--ghost"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setReport(null);
                setError(null);
              }}
            >
              Close
            </button>
          </div>
          {error ? <p className="kxd-os-form-error">{error}</p> : null}
          {report ? (
            <div className="kxd-os-commercial-card__meta">
              <p>
                {report.persisted ? "Persisted" : "Dry run / no write"} · created{" "}
                {report.createdCount} · already present {report.alreadyPresent} ·
                skipped {report.skipped}
                {report.conflicts ? ` · conflicts ${report.conflicts}` : ""}
              </p>
              {report.conflictMessages.map((msg) => (
                <p key={msg.slice(0, 48)}>{msg}</p>
              ))}
              {report.warnings.map((w) => (
                <p key={w.slice(0, 48)}>{w}</p>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
