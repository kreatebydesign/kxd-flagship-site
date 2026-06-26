import { KxdMetric, KxdPage, KxdSection } from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import type { ForecastMetrics } from "@/lib/sales/types";
import { fmtMoney } from "./shared";

export function ForecastScreen({ data }: { data: ForecastMetrics }) {
  const kpis = [
    { label: "Pipeline value", value: fmtMoney(data.pipelineValue) },
    { label: "Expected MRR", value: fmtMoney(data.expectedMRR) },
    { label: "Weighted pipeline", value: fmtMoney(data.weightedPipelineValue) },
    { label: "Avg deal size", value: fmtMoney(data.averageDealSize) },
    { label: "Close probability", value: `${Math.round(data.averageProbability)}%` },
    { label: "Open opportunities", value: String(data.openOpportunities) },
  ];

  return (
    <OperationsShell activeId="sales-forecast">
      <KxdPage>
        <OperationsPageHero
          eyebrow="Sales"
          title="Forecast"
          lead="Pipeline value, expected MRR, close probability, and monthly weighted forecast."
        />

        <KxdSection>
          <div className="kxd-os-ops-kpi-grid">
            {kpis.map((kpi) => (
              <KxdMetric key={kpi.label} label={kpi.label} value={kpi.value} />
            ))}
          </div>
        </KxdSection>

        <KxdSection label="Monthly forecast">
          <div className="kxd-os-card-list">
            {data.monthlyForecast.map((row) => (
              <div key={row.month} className="kxd-os-card" style={{ marginBottom: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="kxd-os-body">{row.month}</span>
                  <span className="kxd-os-card__title">{fmtMoney(row.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </KxdSection>

        <KxdSection label="Top opportunities">
          {data.topOpportunities.length === 0 ? (
            <p className="kxd-os-body">No open opportunities in pipeline.</p>
          ) : (
            <div className="kxd-os-card-list">
              {data.topOpportunities.map((opp) => (
                <div key={opp.id} className="kxd-os-card" style={{ marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                      <p className="kxd-os-card__title">{opp.companyName}</p>
                      <p className="kxd-os-meta" style={{ marginTop: "0.3rem" }}>
                        {opp.status} · {opp.probability}% · MRR {fmtMoney(opp.estimatedMRR)}
                      </p>
                    </div>
                    <p className="kxd-os-card__title">{fmtMoney(opp.weightedValue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </KxdSection>
      </KxdPage>
    </OperationsShell>
  );
}
