import Link from "next/link";
import {
  KxdBadge,
  KxdEmptyState,
  KxdMetric,
  KxdPage,
  KxdSection,
  type KxdBadgeVariant,
} from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { OpsListRow, OpsSectionHead } from "@/components/admin/operations/shared/OpsBriefing";
import type { BrainSnapshot } from "@/lib/brain";
import { BrainSearchBar } from "./BrainSearchBar";

function urgencyVariant(u: string): KxdBadgeVariant {
  switch (u) {
    case "critical":
      return "critical";
    case "high":
      return "warning";
    case "medium":
      return "status";
    default:
      return "default";
  }
}

function PulseStrip({ pulse }: { pulse: BrainSnapshot["dailyPulse"] }) {
  return (
    <div className="kxd-os-operations-kpi-grid">
      <KxdMetric label="Agency health" value={String(pulse.agencyHealth)} />
      <KxdMetric label="Growth score" value={String(pulse.growthScore)} />
      <KxdMetric label="Revenue" value={pulse.revenueTrend} />
      <KxdMetric label="Relationships" value={pulse.relationshipTrend} />
      <KxdMetric label="Delivery" value={pulse.deliveryTrend} />
      <KxdMetric label="Workload" value={pulse.executiveWorkload} />
    </div>
  );
}

export function BrainScreen({ data }: { data: BrainSnapshot }) {
  return (
    <OperationsShell activeId="brain">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Executive Reasoning"
          title="KXD Brain"
          lead="Deterministic agency intelligence — what to pay attention to, before you ask."
        />

        <BrainSearchBar />

        <KxdSection label="Agency Pulse">
          <p className="kxd-os-meta" style={{ marginBottom: "0.75rem" }}>
            Daily · {data.dailyPulse.highlights.join(" · ")}
          </p>
          <PulseStrip pulse={data.dailyPulse} />
          <p className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
            Weekly: {data.weeklyPulse.highlights.join(" · ")}
          </p>
          <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
            Monthly: {data.monthlyPulse.highlights.join(" · ")}
          </p>
        </KxdSection>

        <div className="kxd-os-operations-columns">
          <KxdSection label="Top Signals">
            {data.signals.length === 0 ? (
              <KxdEmptyState title="No signals" description="Agency operating normally." />
            ) : (
              <div className="kxd-os-list-stack">
                {data.signals.slice(0, 10).map((s) => (
                  <OpsListRow key={s.id} href={s.href}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                      <div>
                        <p className="kxd-os-body">{s.title}</p>
                        <p className="kxd-os-meta">{s.reason}</p>
                        <p className="kxd-os-meta">→ {s.suggestedAction}</p>
                      </div>
                      <KxdBadge variant={urgencyVariant(s.urgency)}>{s.urgency}</KxdBadge>
                    </div>
                  </OpsListRow>
                ))}
              </div>
            )}
          </KxdSection>

          <KxdSection label="Highest Risks">
            <div className="kxd-os-list-stack">
              {data.topRisks.length === 0 ? (
                <p className="kxd-os-meta">No elevated risks detected.</p>
              ) : (
                data.topRisks.map((s) => (
                  <OpsListRow key={s.id} href={s.href}>
                    <p className="kxd-os-body">{s.title}</p>
                    <p className="kxd-os-meta">{s.reason}</p>
                  </OpsListRow>
                ))
              )}
            </div>
          </KxdSection>
        </div>

        <div className="kxd-os-operations-columns">
          <KxdSection label="Biggest Opportunities">
            {data.topOpportunities.length === 0 ? (
              <p className="kxd-os-meta">No expansion signals right now.</p>
            ) : (
              <div className="kxd-os-list-stack">
                {data.topOpportunities.map((s) => (
                  <OpsListRow key={s.id} href={s.href}>
                    <p className="kxd-os-body">{s.title}</p>
                    <p className="kxd-os-meta">{s.reason}</p>
                  </OpsListRow>
                ))}
              </div>
            )}
          </KxdSection>

          <KxdSection label="Predictions">
            <div className="kxd-os-list-stack">
              {data.predictions.map((p) => (
                <div key={p.id} className="kxd-os-card" style={{ padding: "0.75rem" }}>
                  <p className="kxd-os-body">{p.label}</p>
                  <p className="kxd-os-card__title" style={{ marginTop: "0.25rem" }}>{p.estimate}</p>
                  <p className="kxd-os-meta">{p.basis}</p>
                </div>
              ))}
            </div>
          </KxdSection>
        </div>

        <KxdSection label="Recommended Actions">
          {data.recommendations.length === 0 ? (
            <KxdEmptyState title="All clear" description="No outstanding recommendations." />
          ) : (
            <div className="kxd-os-list-stack">
              {data.recommendations.map((r) => (
                <OpsListRow key={r.id} href={r.href}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                    <div>
                      <p className="kxd-os-body">{r.title}</p>
                      <p className="kxd-os-meta">{r.reason}</p>
                      <p className="kxd-os-meta">→ {r.suggestedAction}</p>
                    </div>
                    <KxdBadge variant={urgencyVariant(r.urgency)}>{r.urgency}</KxdBadge>
                  </div>
                </OpsListRow>
              ))}
            </div>
          )}
        </KxdSection>

        {data.patterns.length > 0 ? (
          <KxdSection label="Patterns Detected">
            <div className="kxd-os-list-stack">
              {data.patterns.slice(0, 8).map((p) => (
                <div key={p.id} className="kxd-os-card" style={{ padding: "0.75rem" }}>
                  <p className="kxd-os-body">{p.label}</p>
                  <p className="kxd-os-meta">{p.description}</p>
                </div>
              ))}
            </div>
          </KxdSection>
        ) : null}

        <KxdSection label="Brain Status">
          <div className="kxd-os-operations-kpi-grid">
            <KxdMetric label="Signals" value={String(data.status.signalCount)} />
            <KxdMetric label="Patterns" value={String(data.status.patternCount)} />
            <KxdMetric label="Predictions" value={String(data.status.predictionCount)} />
            <KxdMetric label="Memory events" value={String(data.status.memoryEvents)} />
          </div>
          <p className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
            Last built {new Date(data.status.lastBuiltAt).toLocaleString()} ·{" "}
            {data.status.modulesConnected.length} modules connected · LLM adapters ready (not configured)
          </p>
          {data.recommendationHistory.length > 0 ? (
            <div style={{ marginTop: "1rem" }}>
              <OpsSectionHead label="Recommendation history" />
              <div className="kxd-os-list-stack">
                {data.recommendationHistory.slice(0, 8).map((h) => (
                  <p key={h.id} className="kxd-os-meta">
                    {h.action} · {h.recommendationId}
                    {h.title ? ` · ${h.title}` : ""}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
          <Link href="/admin/operations/founder-intelligence" className="kxd-os-link-quiet" style={{ display: "inline-block", marginTop: "0.75rem" }}>
            Founder Intelligence →
          </Link>
        </KxdSection>
      </KxdPage>
    </OperationsShell>
  );
}
