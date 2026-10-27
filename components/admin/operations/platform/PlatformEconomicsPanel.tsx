"use client";

import { useCallback, useMemo, useState } from "react";
import { KxdMetric, KxdSection } from "@/components/os";
import {
  computePlatformEconomics,
  type PlatformEconomicsDashboardContext,
  type PlatformEconomicsData,
  type PlatformEconomicsInputs,
  type SaasProjectionPoint,
  type SubsystemValuationBreakdownRow,
} from "@/lib/platform/economics";

function usd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatChange(amount: number | null, percent: number | null): string {
  if (amount === null) return "No prior snapshot";
  const sign = amount >= 0 ? "+" : "";
  const pct = percent !== null ? ` (${sign}${percent}%)` : "";
  return `${sign}${usd(amount)}${pct}`;
}

function readinessLabel(r: SubsystemValuationBreakdownRow["integrationReadiness"]): string {
  if (r === "production-ready") return "Production-ready";
  if (r === "emerging") return "Emerging";
  return "Limited";
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

function SaasProjectionChart({
  points,
  title,
}: {
  points: SaasProjectionPoint[];
  title: string;
}) {
  if (points.length === 0) return null;
  const maxMrr = Math.max(...points.map((p) => p.mrr), 1);
  const sample = points.length > 24
    ? points.filter((_, i) => i % Math.ceil(points.length / 24) === 0 || i === points.length - 1)
    : points;

  return (
    <div className="kxd-os-platform-econ-saas-proj">
      <h4 className="kxd-os-platform-econ-subhead">{title}</h4>
      <div className="kxd-os-platform-econ-chart" role="img" aria-label={title}>
        <ul className="kxd-os-platform-econ-chart__bars">
          {sample.map((point) => (
            <li key={point.monthIndex} className="kxd-os-platform-econ-chart__bar">
              <div
                className="kxd-os-platform-econ-chart__fill kxd-os-platform-econ-chart__fill--saas"
                style={{ height: `${Math.round((point.mrr / maxMrr) * 100)}%` }}
                title={`Month ${point.monthIndex}: ${usd(point.mrr)} MRR`}
              />
              <span className="kxd-os-platform-econ-chart__caption">M{point.monthIndex}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function HistoryChart({
  history,
}: {
  history: PlatformEconomicsData["history"];
}) {
  if (history.length < 2) {
    return (
      <p className="kxd-os-meta">
        Valuation history appears after two or more verified snapshots. Use authorized
        evidence capture or manual milestones — snapshots are never created by opening this tab.
      </p>
    );
  }

  const maxCost = Math.max(...history.map((h) => h.replacementCostMidUsd), 1);
  const latest = history[history.length - 1];
  const prior = history[history.length - 2];
  const delta = latest.replacementCostMidUsd - prior.replacementCostMidUsd;

  return (
    <div className="kxd-os-platform-econ-history">
      <p className="kxd-os-platform-econ-history__delta" aria-live="polite">
        Latest change:{" "}
        <strong>
          {delta >= 0 ? "+" : ""}
          {usd(delta)}
        </strong>
        <span className="kxd-os-meta">
          {" "}
          ({prior.label} → {latest.label})
        </span>
      </p>
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
    </div>
  );
}

function ValuationHero({
  hero,
  computedMid,
  computedLow,
  computedHigh,
  hoursMid,
  confidenceRationale,
  assumptionsAdjusted,
}: {
  hero: PlatformEconomicsData["valuationHero"];
  computedMid: number;
  computedLow: number;
  computedHigh: number;
  hoursMid: number;
  confidenceRationale: string;
  assumptionsAdjusted: boolean;
}) {
  return (
    <section className="kxd-os-platform-econ-valuation-hero" aria-labelledby="kxd-econ-hero-title">
      <p className="kxd-os-platform-econ-hero__eyebrow">Founder valuation intelligence</p>
      <h2 id="kxd-econ-hero-title" className="kxd-os-platform-econ-valuation-hero__title">
        KXD OS — Estimated Software Replacement Value
      </h2>
      <p className="kxd-os-platform-econ-valuation-hero__value" aria-label="Midpoint replacement value">
        {usd(computedMid)}
      </p>
      <p className="kxd-os-platform-econ-valuation-hero__range">
        Range {usd(computedLow)} – {usd(computedHigh)}
      </p>
      <div className="kxd-os-platform-econ-valuation-hero__meta">
        <span>{hoursMid.toLocaleString()} modeled engineering hours (mid)</span>
        <span>{hero.overallCompletionPercent}% platform completion</span>
        <span>{hero.registrySubsystemCount} tracked subsystems</span>
        <span className="kxd-os-platform-econ-valuation-hero__confidence">
          Confidence: {hero.confidence}
        </span>
      </div>
      <p className="kxd-os-platform-econ-valuation-hero__calc">
        Calculated {new Date(hero.calculatedAt).toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })}
        {hero.previousSnapshotLabel ? (
          <>
            {" "}
            · Change since{" "}
            <span className="kxd-os-platform-econ-valuation-hero__prior">{hero.previousSnapshotLabel}</span>
            : {formatChange(hero.changeMidUsd, hero.changeMidPercent)}
          </>
        ) : (
          <> · {formatChange(hero.changeMidUsd, hero.changeMidPercent)}</>
        )}
      </p>
      {assumptionsAdjusted ? (
        <p className="kxd-os-meta">
          Hourly rate assumptions are adjusted below. Snapshot comparisons use verified captures at
          save time.
        </p>
      ) : null}
      <p className="kxd-os-platform-econ-valuation-hero__explain">
        This midpoint is derived from the Edition 1 subsystem registry, live engineering-health
        counts (Payload collections, routes, automation connectivity), and maturity-weighted hour
        models. It estimates what it would cost to rebuild comparable software; it is not a
        certified appraisal, fair-market value, or guaranteed sale price.
      </p>
      <p className="kxd-os-meta">{confidenceRationale}</p>
    </section>
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
  const [hero, setHero] = useState(initial.valuationHero);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [evidenceState, setEvidenceState] = useState<"idle" | "saving" | "saved" | "skipped" | "error">(
    "idle",
  );

  const assumptionsAdjusted = useMemo(
    () => JSON.stringify(inputs) !== JSON.stringify(initial.defaults),
    [inputs, initial.defaults],
  );

  const computed = useMemo(
    () => computePlatformEconomics(dashboardContext, inputs, initial.commercialEvidence),
    [dashboardContext, inputs, initial.commercialEvidence],
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

  const refreshHistory = useCallback(async () => {
    const listRes = await fetch("/api/admin/platform/economics/snapshots");
    const listJson = (await listRes.json()) as {
      ok?: boolean;
      snapshots?: PlatformEconomicsData["recentSnapshots"];
    };
    if (!listJson.ok || !listJson.snapshots) return;
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
    const desc = [...listJson.snapshots].sort((a, b) =>
      b.capturedAt.localeCompare(a.capturedAt),
    );
    const prior = desc.length > 1 ? desc[1] : null;
    setHero((h) => ({
      ...h,
      changeMidUsd: prior
        ? computed.replacementCost.replacementCostMidUsd - prior.replacementCostMidUsd
        : null,
      changeMidPercent:
        prior && prior.replacementCostMidUsd > 0
          ? Math.round(
              ((computed.replacementCost.replacementCostMidUsd - prior.replacementCostMidUsd) /
                prior.replacementCostMidUsd) *
                1000,
            ) / 10
          : null,
      previousSnapshotLabel: prior?.label ?? null,
      previousSnapshotCapturedAt: prior?.capturedAt ?? null,
    }));
  }, [computed.replacementCost.replacementCostMidUsd]);

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
      await refreshHistory();
    } catch {
      setSaveState("error");
    }
  }, [inputs, snapshotLabel, initial.milestoneContext, refreshHistory]);

  const { replacementCost, saas, enterprise, commercial, commercialValuation } = computed;
  const breakdown = replacementCost.subsystemBreakdown;
  const topContributors = breakdown.slice(0, 10);

  const captureEvidenceMilestone = useCallback(async () => {
    setEvidenceState("saving");
    try {
      const res = await fetch("/api/admin/platform/economics/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          captureMode: "evidence-milestone",
          inputs,
          milestoneNotes: initial.milestoneContext,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; created?: boolean };
      if (!res.ok || !json.ok) throw new Error("evidence capture failed");
      setEvidenceState(json.created ? "saved" : "skipped");
      await refreshHistory();
    } catch {
      setEvidenceState("error");
    }
  }, [inputs, initial.milestoneContext, refreshHistory]);

  return (
    <div className="kxd-os-platform-econ">
      <ValuationHero
        hero={hero}
        computedMid={replacementCost.replacementCostMidUsd}
        computedLow={replacementCost.replacementCostLowUsd}
        computedHigh={replacementCost.replacementCostHighUsd}
        hoursMid={replacementCost.estimatedHoursMid}
        confidenceRationale={replacementCost.confidenceRationale}
        assumptionsAdjusted={assumptionsAdjusted}
      />

      <KxdSection
        label="Commercial value and exit scenarios"
        className="kxd-os-platform-econ-commercial kxd-os-platform-section"
      >
        <p
          className={
            commercialValuation.established
              ? "kxd-os-platform-econ-commercial__headline"
              : "kxd-os-platform-econ-commercial__headline kxd-os-platform-econ-commercial__headline--pending"
          }
        >
          {commercialValuation.headline}
        </p>
        <p className="kxd-os-platform-econ-disclaimer">{commercialValuation.replacementCostDistinction}</p>
        <ul className="kxd-os-platform-econ-assumptions">
          {commercialValuation.evidenceSummary.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="kxd-os-meta">{commercialValuation.studioAgencyContext.disclaimer}</p>
        <div className="kxd-os-ops-kpi-grid kxd-os-platform-kpi-grid">
          <KxdMetric
            label="Studio portfolio MRR (actual agency)"
            value={usd(commercialValuation.studioAgencyContext.mrrUsd)}
          />
          <KxdMetric
            label="Clients with recurring rows"
            value={String(commercialValuation.studioAgencyContext.payingClientRows)}
          />
        </div>
        <h3 className="kxd-os-platform-econ-subhead">Hypothetical exit and licensing scenarios</h3>
        <ul className="kxd-os-platform-econ-exit-list">
          {commercialValuation.hypotheticalScenarios.map((scenario) => (
            <li key={scenario.id} className="kxd-os-platform-econ-exit-list__item">
              <div>
                <strong>{scenario.label}</strong>
                <p className="kxd-os-meta">{scenario.description}</p>
              </div>
              <span className="kxd-os-platform-econ-exit-list__value">{usd(scenario.valueUsd)}</span>
            </li>
          ))}
        </ul>
      </KxdSection>

      <KxdSection label="Development value breakdown" className="kxd-os-platform-section">
        <p className="kxd-os-platform-econ-disclaimer">{replacementCost.disclaimer}</p>
        <p className="kxd-os-meta">
          Shared integration hours ({replacementCost.integrationHoursMid.toLocaleString()}h mid) are
          allocated across subsystems by contribution to avoid double-counting infrastructure.
        </p>
        <h3 className="kxd-os-platform-econ-subhead">Top contributors to modeled value</h3>
        <ol className="kxd-os-platform-econ-top10">
          {topContributors.map((row, index) => (
            <li key={row.id}>
              <span>{index + 1}. {row.name}</span>
              <span>{usd(row.replacementCostMidUsd)} · {row.contributionPercent}%</span>
            </li>
          ))}
        </ol>

        <div className="kxd-os-platform-econ-breakdown-wrap">
          <table className="kxd-os-platform-econ-breakdown">
            <thead>
              <tr>
                <th scope="col">Subsystem</th>
                <th scope="col">Completion</th>
                <th scope="col">Status</th>
                <th scope="col">Hours</th>
                <th scope="col">Mid cost</th>
                <th scope="col">Readiness</th>
                <th scope="col">Contribution</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="kxd-os-platform-econ-breakdown__name">{row.name}</span>
                    <span className="kxd-os-platform-econ-breakdown__meta">{row.category}</span>
                  </td>
                  <td>{row.completionPercent}%</td>
                  <td>{row.status}</td>
                  <td>{row.estimatedHours}h</td>
                  <td>{usd(row.replacementCostMidUsd)}</td>
                  <td>{readinessLabel(row.integrationReadiness)}</td>
                  <td>{row.contributionPercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details className="kxd-os-platform-econ-details">
          <summary>Valuation assumption controls</summary>
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
                  valuation: {
                    ...p.valuation,
                    hourlyRates: { ...p.valuation.hourlyRates, low: v },
                  },
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
                  valuation: {
                    ...p.valuation,
                    hourlyRates: { ...p.valuation.hourlyRates, mid: v },
                  },
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
          <ul className="kxd-os-platform-econ-assumptions">
            {replacementCost.assumptions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      </KxdSection>

      <KxdSection
        label="SaaS revenue intelligence"
        description="Projected subscription scenarios — not live product revenue."
        className="kxd-os-platform-section"
      >
        <p className="kxd-os-platform-econ-disclaimer">{commercial.disclaimer}</p>

        <h3 className="kxd-os-platform-econ-subhead">SaaS subscription simulator</h3>
        <p className="kxd-os-platform-econ-disclaimer">{saas.disclaimer}</p>
        <div className="kxd-os-platform-econ-tier-grid">
          {inputs.saas.tiers.map((tier) => (
            <article key={tier.id} className="kxd-os-platform-econ-tier">
              <h4 className="kxd-os-platform-econ-tier__title">{tier.label}</h4>
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
            label="Annual customer growth"
            value={inputs.saas.annualCustomerGrowthRate}
            min={0}
            max={0.8}
            step={0.01}
            onChange={(v) =>
              setInputs((p) => ({ ...p, saas: { ...p.saas, annualCustomerGrowthRate: v } }))
            }
            format={(v) => `${(v * 100).toFixed(0)}%`}
          />
          <RangeSlider
            label="Gross margin"
            value={inputs.saas.grossMarginRate}
            min={0.4}
            max={0.95}
            step={0.01}
            onChange={(v) =>
              setInputs((p) => ({ ...p, saas: { ...p.saas, grossMarginRate: v } }))
            }
            format={(v) => `${(v * 100).toFixed(0)}%`}
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
          <KxdMetric label="Projected MRR (month 1)" value={usd(saas.monthlyRecurringRevenue)} />
          <KxdMetric label="Projected ARR" value={usd(saas.annualRecurringRevenue)} />
          <KxdMetric label="MRR after churn (month 1)" value={usd(saas.monthlyAfterChurn)} />
          <KxdMetric
            label="Operating profit before tax (monthly)"
            value={usd(saas.estimatedOperatingProfitBeforeTaxMonthly)}
          />
          <KxdMetric label="12-month projected MRR" value={usd(saas.projectionMrrMonth12)} />
          <KxdMetric label="36-month projected MRR" value={usd(saas.projectionMrrMonth36)} />
          <KxdMetric
            label="Illustrative ARR valuation"
            value={usd(saas.hypotheticalArrValuation)}
          />
        </div>
        <SaasProjectionChart points={saas.projection12Months} title="12-month MRR projection" />
        <SaasProjectionChart points={saas.projection36Months} title="36-month MRR projection" />

        <h3 className="kxd-os-platform-econ-subhead">White-label and enterprise licensing</h3>
        <p className="kxd-os-platform-econ-disclaimer">{enterprise.licenseRevenueDisclaimer}</p>
        <div className="kxd-os-platform-econ-grid">
          <label className="kxd-os-platform-econ-field">
            White-label deals
            <input
              type="number"
              min={0}
              value={inputs.enterprise.whiteLabelDealCount}
              onChange={(e) =>
                setInputs((p) => ({
                  ...p,
                  enterprise: {
                    ...p.enterprise,
                    whiteLabelDealCount: Number(e.target.value) || 0,
                  },
                }))
              }
            />
          </label>
          <label className="kxd-os-platform-econ-field">
            White-label setup (one-time, per deal)
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
            White-label license (monthly, per deal)
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
            Annual enterprise license (per deal, per year)
            <input
              type="number"
              min={0}
              value={inputs.enterprise.annualEnterpriseLicenseFee}
              onChange={(e) =>
                setInputs((p) => ({
                  ...p,
                  enterprise: {
                    ...p.enterprise,
                    annualEnterpriseLicenseFee: Number(e.target.value) || 0,
                  },
                }))
              }
            />
          </label>
          <label className="kxd-os-platform-econ-field">
            Annual enterprise deals
            <input
              type="number"
              min={0}
              value={inputs.enterprise.annualEnterpriseDealCount}
              onChange={(e) =>
                setInputs((p) => ({
                  ...p,
                  enterprise: {
                    ...p.enterprise,
                    annualEnterpriseDealCount: Number(e.target.value) || 0,
                  },
                }))
              }
            />
          </label>
          <label className="kxd-os-platform-econ-field">
            Perpetual license (per deal, usage rights)
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
          <label className="kxd-os-platform-econ-field">
            Perpetual license deals
            <input
              type="number"
              min={0}
              value={inputs.enterprise.perpetualEnterpriseDealCount}
              onChange={(e) =>
                setInputs((p) => ({
                  ...p,
                  enterprise: {
                    ...p.enterprise,
                    perpetualEnterpriseDealCount: Number(e.target.value) || 0,
                  },
                }))
              }
            />
          </label>
        </div>
        <div className="kxd-os-ops-kpi-grid kxd-os-platform-kpi-grid">
          <KxdMetric label="One-time license revenue (scenario)" value={usd(enterprise.oneTimeRevenueTotal)} />
          <KxdMetric
            label="Recurring license (annualized scenario)"
            value={usd(enterprise.recurringRevenueAnnualized)}
          />
          <KxdMetric label="Annual enterprise book" value={usd(enterprise.annualEnterpriseBookTotal)} />
        </div>

        <div className="kxd-os-platform-econ-ip">
          <h4 className="kxd-os-platform-econ-subhead">Hypothetical full IP acquisition</h4>
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

      <KxdSection label="Valuation growth history" className="kxd-os-platform-section">
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
          <button
            type="button"
            className="kxd-os-platform-econ-snapshot__btn kxd-os-platform-econ-snapshot__btn--secondary"
            onClick={() => captureEvidenceMilestone()}
            disabled={evidenceState === "saving"}
          >
            {evidenceState === "saving" ? "Capturing…" : "Capture verified evidence milestone"}
          </button>
          {evidenceState === "saved" ? (
            <p className="kxd-os-meta">Evidence snapshot recorded for this registry fingerprint.</p>
          ) : null}
          {evidenceState === "skipped" ? (
            <p className="kxd-os-meta">Fingerprint already on file — no duplicate write.</p>
          ) : null}
          {evidenceState === "error" ? (
            <p className="kxd-os-meta">Could not capture evidence snapshot.</p>
          ) : null}
          <label className="kxd-os-platform-econ-field">
            Manual snapshot label
            <input
              type="text"
              value={snapshotLabel}
              placeholder="e.g. Post-release milestone"
              onChange={(e) => setSnapshotLabel(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="kxd-os-platform-econ-snapshot__btn"
            onClick={() => saveSnapshot()}
            disabled={saveState === "saving"}
          >
            {saveState === "saving" ? "Saving…" : "Record manual snapshot"}
          </button>
          {saveState === "saved" ? (
            <p className="kxd-os-meta">Snapshot saved ({initial.calculationVersion}).</p>
          ) : null}
          {saveState === "error" ? (
            <p className="kxd-os-meta">Could not save snapshot. Confirm founder access.</p>
          ) : null}
        </div>
      </KxdSection>
    </div>
  );
}
