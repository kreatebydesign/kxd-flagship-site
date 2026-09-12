"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Area = {
  area: string;
  status: string;
  summary: string;
};

/**
 * Minimal operator control: ensure post-acceptance commercial materialization.
 * Never invites portal users. Never writes Stripe/payments/invoices.
 */
export function EnsureCommercialMaterializationForm(props: {
  clientId: number;
  agreementIds: number[];
}) {
  const router = useRouter();
  const ids = useMemo(
    () => [...new Set(props.agreementIds.filter((id) => Number.isFinite(id)))],
    [props.agreementIds],
  );
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreementId, setAgreementId] = useState(String(ids[0] ?? ""));
  const [report, setReport] = useState<{
    persisted: boolean;
    areas: Area[];
    conflicts: string[];
    warnings: string[];
  } | null>(null);

  if (!ids.length) return null;

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
            action: "ensure-post-acceptance-materialization",
            dryRun,
          }),
        },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        persisted?: boolean;
        areas?: Area[];
        conflicts?: Array<{ message: string }>;
        warnings?: string[];
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Materialization failed.");
      }
      setReport({
        persisted: Boolean(json.persisted),
        areas: json.areas ?? [],
        conflicts: (json.conflicts ?? []).map((c) => c.message),
        warnings: json.warnings ?? [],
      });
      if (!dryRun && json.persisted) router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Materialization failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kxd-os-commercial-record-payment__cta">
      <div>
        <p className="kxd-os-eyebrow">Commercial relationship</p>
        <h3>Materialize commercial relationship</h3>
        <p>
          Ensure obligations, ancillary services, recurring definitions, and
          onboarding readiness from the accepted agreement. No Stripe. No portal
          invitations.
        </p>
      </div>
      {!open ? (
        <button
          type="button"
          className="kxd-os-btn kxd-os-btn--ghost"
          onClick={() => setOpen(true)}
        >
          Ensure client setup
        </button>
      ) : (
        <div className="kxd-os-stack" style={{ gap: 8, minWidth: 280 }}>
          {ids.length > 1 ? (
            <label className="kxd-os-field">
              <span>Agreement</span>
              <select
                value={agreementId}
                onChange={(e) => setAgreementId(e.target.value)}
              >
                {ids.map((id) => (
                  <option key={id} value={id}>
                    Contract {id}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
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
                {report.persisted ? "Persisted" : "Dry run / no write"} ·{" "}
                {report.conflicts.length
                  ? `${report.conflicts.length} conflict(s)`
                  : "no conflicts"}
              </p>
              {report.areas.map((area) => (
                <p key={area.area}>
                  {area.status === "created"
                    ? "✓"
                    : area.status === "already-present"
                      ? "✓"
                      : area.status === "conflict"
                        ? "⚠"
                        : "○"}{" "}
                  {area.area}: {area.summary}
                </p>
              ))}
              {report.conflicts.map((msg) => (
                <p key={msg.slice(0, 40)}>⚠ {msg}</p>
              ))}
              {report.warnings.map((w) => (
                <p key={w.slice(0, 40)}>{w}</p>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
