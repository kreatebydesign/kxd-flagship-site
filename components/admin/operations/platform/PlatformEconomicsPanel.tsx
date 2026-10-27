"use client";

import { useCallback, useMemo, useState } from "react";
import { KxdMetric, KxdSection } from "@/components/os";
import {
  computePlatformEconomics,
  type PlatformEconomicsDashboardContext,
  type PlatformEconomicsData,
  type PlatformEconomicsInputs,
} from "@/lib/platform/economics";

function usd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function RangeSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format = (v) => String(v),
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <label className="kxd-os-platform-econ-control">
      <span className="kxd-os-platform-econ-control__label">
        <span>{label}</span>
        <span className="kxd-os-platform-econ-control__value">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function HistoryChart({ history }: { history: PlatformEconomicsData["history"] }) {
  if (history.length < 2) {
    return (
      <p className="kxd-os-meta">
        Record snapshots over time to see replacement-cost trends. Historical points only appear
        after you save dated snapshots.
      </p>
    );
  }

  const maxCost = Math.max(...history.map((h) => h.replacementCostMidUsd), 1);

  return (
    <div className="kxd-os-platform-econ-chart" role="img" aria-label="Replacement cost history">
      <ul className="kxd-os-platform-econ-chart__bars">
        {history.map((point) => (
          <li
            key={`${point.capturedAt}-${point.label}`}
            className="kxd-os-platform-econ-chart__bar"
          >
            <div
              className="kxd-os-platform-econ-chart__fill"
              style={{
                height: `${Math.round((point.replacementCostMidUsd / maxCost) * 100)}%`,
              }}
              title={`${point.label}: ${usd(point.replacementCostMidUsd)}`}
            />
            <span className="kxd-os-platform-econ-chart__caption">
              {point.capturedAt.slice(0, 10)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PlatformEconomicsPanel({
  initial,
  dashboardContext,
}: {
  initial: PlatformEconomicsData;
  dashboardContext: PlatformEconomicsDashboardContext;
}) {
  const [inputs, setInputs] = useState<PlatformEconomicsInputs>(initial.defaults);
  const [history, setHistory] = useState(initial.history);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const computed = useMemo(
    () => computePlatformEconomics(dashboardContext, inputs),
    [dashboardContext, inputs],
  );

  const updateTier = useCallback(
    (id: string, patch: Partial<{ monthlyPrice: number; customerCount: number }>) => {
      setInputs((prev) => ({
        ...prev,
        saas: {
          ...prev.saas,
          tiers: prev.saas.tiers.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        },
      }));
    },
    [],
  );

  const saveSnapshot = useCallback(async () => {
    setSaveState("saving");
    try {
      const res = await fetch("/api/admin/platform/economics/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: snapshotLabel.trim() || `Snapshot ${new Date().toISOString().slice(0, 10)}`,
          inputs,
          milestoneNotes: initial.milestoneContext,
        }),
      });
      const json = (await res.json()) as { ok?: boolean };
      if (!res.ok || !json.ok) throw new Error("save failed");
      setSaveState("saved");
      const listRes = await fetch("/api/admin/platform/economics/snapshots");
      const listJson = (await listRes.json()) as {
        ok?: boolean;
        snapshots?: PlatformEconomicsData["recentSnapshots"];
      };
      if (listJson.ok && listJson.snapshots) {
        const sorted = [...listJson.snapshots].sort((a, b) =>
          a.capturedAt.localeCompare(b.capturedAt),
        );
        setHistory(
          sorted.map((s) => ({
            capturedAt: s.capturedAt,
            replacementCostMidUsd: s.replacementCostMidUsd,
            overallCompletionPercent: s.overallCompletionPercent,
            monthlyRecurringRevenue: s.monthlyRecurringRevenue,
            label: s.label,
          })),
        );
      }
    } catch {
      setSaveState("error");
    }
  }, [inputs, snapshotLabel, initial.milestoneContext]);

  const { replacementCost, saas, enterprise } = computed;

  return (
    <div className="kxd-os-platform-econ">
      <header className="kxd-os-platform-econ-hero">
        <p className="kxd-os-platform-econ-hero__eyebrow">Founder only · Hypothetical models</p>
        <h2 className="kxd-os-platform-econ-hero__title">Platform Economics</h2>
        <p className="kxd-os-platform-econ-hero__lead">
          Evidence-based replacement-cost estimates and editable revenue scenarios. Nothing here is
          verified fair market value, live MRR, or a commitment to sell KXD OS.
        </p>
      </header>

      <KxdSection label="Development replacement cost" className="kxd-os-platform-section">
        <p className="kxd-os-platform-econ-disclaimer">{replacementCost.disclaimer}</p>
        <div className="kxd-os-ops-kpi-grid kxd-os-platform-kpi-grid">
          <KxdMetric label="Low estimate" value={usd(replacementCost.replacementCostLowUsd)} />
          <KxdMetric label="Mid estimate" value={usd(replacementCost.replacementCostMidUsd)} />
          <KxdMetric label="High estimate" value={usd(replacementCost.replacementCostHighUsd)} />
          <KxdMetric
            label="Confidence"
            value={replacementCost.confidence.toUpperCase()}
          />
          <KxdMetric
            label="Estimated hours (mid)"
            value={`${replacementCost.estimatedHoursMid.toLocaleString()}h`}
          />
          <KxdMetric
            label="Registry completion"
            value={`${computed.overallCompletionPercent}%`}
          />
        </div>
        <p className="kxd-os-meta">{replacementCost.confidenceRationale}</p>
        <ul className="kxd-os-platform-econ-assumptions">
          {replacementCost.assumptions.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        <div className="kxd-os-platform-econ-grid">
          <RangeSlider
            label="Low hourly rate"
            value={inputs.valuation.hourlyRates.low}
            min={75}
            max={250}
            step={5}
            onChange={(v) =>
              setInputs((p) => ({
                ...p,
                valuation: { ...p.valuation, hourlyRates: { ...p.valuation.hourlyRates, low: v } },
              }))
            }
            format={(v) => usd(v)}
          />
          <RangeSlider
            label="Mid hourly rate"
            value={inputs.valuation.hourlyRates.mid}
            min={125}
            max={350}
            step={5}
            onChange={(v) =>
              setInputs((p) => ({
                ...p,
                valuation: { ...p.valuation, hourlyRates: { ...p.valuation.hourlyRates, mid: v } },
              }))
            }
            format={(v) => usd(v)}
          />
          <RangeSlider
            label="High hourly rate"
            value={inputs.valuation.hourlyRates.high}
            min={200}
            max={450}
            step={5}
            onChange={(v) =>
              setInputs((p) => ({
                ...p,
                valuation: {
                  ...p.valuation,
                  hourlyRates: { ...p.valuation.hourlyRates, high: v },
                },
              }))
            }
            format={(v) => usd(v)}
          />
        </div>

        <h3 className="kxd-os-platform-econ-subhead">Top subsystem hour credits</h3>
        <ul className="kxd-os-platform-econ-credits">
          {replacementCost.subsystemHourCredits.map((row) => (
            <li key={row.id}>
              <span>{row.name}</span>
              <span>{row.hours}h</span>
            </li>
          ))}
        </ul>
      </KxdSection>

      <KxdSection
        label="SaaS revenue simulator"
        description="All tiers and counts are hypothetical. Not connected to Stripe or live customers."
        className="kxd-os-platform-section"
      >
        <p className="kxd-os-platform-econ-disclaimer">{saas.disclaimer}</p>
        <div className="kxd-os-platform-econ-tier-grid">
          {inputs.saas.tiers.map((tier) => (
            <article key={tier.id} className="kxd-os-platform-econ-tier">
              <h3 className="kxd-os-platform-econ-tier__title">{tier.label}</h3>
              <label className="kxd-os-platform-econ-field">
                Monthly price
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={tier.monthlyPrice}
                  onChange={(e) =>
                    updateTier(tier.id, { monthlyPrice: Number(e.target.value) || 0 })
                  }
                />
              </label>
              <label className="kxd-os-platform-econ-field">
                Customers
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={tier.customerCount}
                  onChange={(e) =>
                    updateTier(tier.id, { customerCount: Number(e.target.value) || 0 })
                  }
                />
              </label>
            </article>
          ))}
        </div>
        <div className="kxd-os-platform-econ-grid">
          <RangeSlider
            label="Monthly operating cost"
            value={inputs.saas.monthlyOperatingCost}
            min={0}
            max={50000}
            step={250}
            onChange={(v) =>
              setInputs((p) => ({ ...p, saas: { ...p.saas, monthlyOperatingCost: v } }))
            }
            format={(v) => usd(v)}
          />
          <RangeSlider
            label="Monthly churn"
            value={inputs.saas.monthlyChurnRate}
            min={0}
            max={0.15}
            step={0.005}
            onChange={(v) =>
              setInputs((p) => ({ ...p, saas: { ...p.saas, monthlyChurnRate: v } }))
            }
            format={(v) => `${(v * 100).toFixed(1)}%`}
          />
          <RangeSlider
            label="ARR multiple (scenario)"
            value={inputs.saas.arrRevenueMultiple}
            min={2}
            max={12}
            step={0.5}
            onChange={(v) =>
              setInputs((p) => ({ ...p, saas: { ...p.saas, arrRevenueMultiple: v } }))
            }
            format={(v) => `${v}×`}
          />
        </div>
        <div className="kxd-os-ops-kpi-grid kxd-os-platform-kpi-grid">
          <KxdMetric label="MRR" value={usd(saas.monthlyRecurringRevenue)} />
          <KxdMetric label="ARR" value={usd(saas.annualRecurringRevenue)} />
          <KxdMetric label="MRR after churn" value={usd(saas.monthlyAfterChurn)} />
          <KxdMetric label="Net monthly (after op cost)" value={usd(saas.monthlyNetAfterOperatingCost)} />
          <KxdMetric
            label="Hypothetical ARR valuation"
            value={usd(saas.hypotheticalArrValuation)}
          />
        </div>
      </KxdSection>

      <KxdSection
        label="Enterprise licensing"
        description="License and setup models — separate from full IP acquisition."
        className="kxd-os-platform-section"
      >
        <p className="kxd-os-platform-econ-disclaimer">{enterprise.licenseRevenueDisclaimer}</p>
        <div className="kxd-os-platform-econ-grid">
          <label className="kxd-os-platform-econ-field">
            White-label setup (one-time)
            <input
              type="number"
              min={0}
              value={inputs.enterprise.whiteLabelSetupFee}
              onChange={(e) =>
                setInputs((p) => ({
                  ...p,
                  enterprise: {
                    ...p.enterprise,
                    whiteLabelSetupFee: Number(e.target.value) || 0,
                  },
                }))
              }
            />
          </label>
          <label className="kxd-os-platform-econ-field">
            White-label license (monthly)
            <input
              type="number"
              min={0}
              value={inputs.enterprise.whiteLabelMonthlyLicense}
              onChange={(e) =>
                setInputs((p) => ({
                  ...p,
                  enterprise: {
                    ...p.enterprise,
                    whiteLabelMonthlyLicense: Number(e.target.value) || 0,
                  },
                }))
              }
            />
          </label>
          <RangeSlider
            label="License term (months)"
            value={inputs.enterprise.whiteLabelLicenseMonths}
            min={1}
            max={36}
            step={1}
            onChange={(v) =>
              setInputs((p) => ({
                ...p,
                enterprise: { ...p.enterprise, whiteLabelLicenseMonths: v },
              }))
            }
          />
          <label className="kxd-os-platform-econ-field">
            Perpetual enterprise license (usage rights)
            <input
              type="number"
              min={0}
              value={inputs.enterprise.perpetualEnterpriseLicense}
              onChange={(e) =>
                setInputs((p) => ({
                  ...p,
                  enterprise: {
                    ...p.enterprise,
                    perpetualEnterpriseLicense: Number(e.target.value) || 0,
                  },
                }))
              }
            />
          </label>
        </div>
        <div className="kxd-os-ops-kpi-grid kxd-os-platform-kpi-grid">
          <KxdMetric label="White-label scenario total" value={usd(enterprise.whiteLabelScenarioTotal)} />
          <KxdMetric label="Perpetual license" value={usd(enterprise.perpetualLicenseTotal)} />
        </div>

        <div className="kxd-os-platform-econ-ip">
          <h3 className="kxd-os-platform-econ-subhead">Hypothetical full IP acquisition</h3>
          <p className="kxd-os-meta">{enterprise.ipAcquisitionDisclaimer}</p>
          <label className="kxd-os-platform-econ-field">
            Scenario price (not license revenue)
            <input
              type="number"
              min={0}
              value={inputs.enterprise.hypotheticalIpAcquisitionPrice}
              onChange={(e) =>
                setInputs((p) => ({
                  ...p,
                  enterprise: {
                    ...p.enterprise,
                    hypotheticalIpAcquisitionPrice: Number(e.target.value) || 0,
                  },
                }))
              }
            />
          </label>
          <p className="kxd-os-platform-econ-ip__value">
            {usd(inputs.enterprise.hypotheticalIpAcquisitionPrice)}
          </p>
        </div>
      </KxdSection>

      <KxdSection label="Growth history" className="kxd-os-platform-section">
        <HistoryChart history={history} />
        {initial.milestoneContext.length > 0 ? (
          <>
            <h3 className="kxd-os-platform-econ-subhead">Recent verified milestones (registry)</h3>
            <ul className="kxd-os-platform-econ-assumptions">
              {initial.milestoneContext.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </>
        ) : null}
        <div className="kxd-os-platform-econ-snapshot">
          <label className="kxd-os-platform-econ-field">
            Snapshot label
            <input
              type="text"
              value={snapshotLabel}
              placeholder="e.g. October 2026 — post Phase 17"
              onChange={(e) => setSnapshotLabel(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="kxd-os-platform-econ-snapshot__btn"
            onClick={() => saveSnapshot()}
            disabled={saveState === "saving"}
          >
            {saveState === "saving" ? "Saving…" : "Record snapshot"}
          </button>
          {saveState === "saved" ? (
            <p className="kxd-os-meta">Snapshot saved with calculation {initial.calculationVersion}.</p>
          ) : null}
          {saveState === "error" ? (
            <p className="kxd-os-meta">Could not save snapshot. Confirm founder access and migration.</p>
          ) : null}
        </div>
      </KxdSection>
    </div>
  );
}
