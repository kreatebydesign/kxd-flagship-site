import Link from "next/link";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsEmpty,
  OpsListRow,
  OpsStatusBadge,
} from "@/components/admin/operations/shared/OpsBriefing";
import { KxdPage } from "@/components/os";
import type { ExecutiveBriefing } from "@/lib/intelligence/briefings";
import { ExecutiveHealthSummary } from "./ExecutiveHealthSummary";
import { ExecutiveInsights } from "./ExecutiveInsights";
import { ExecutiveNarrativeBlock } from "./ExecutiveNarrative";
import { NarrativeSection } from "./NarrativeSection";
import { PrimaryRecommendation } from "./PrimaryRecommendation";
import { RecommendationCard } from "./RecommendationCard";

export function IntelligenceScreen({ briefing }: { briefing: ExecutiveBriefing }) {
  const additionalRecommendations = briefing.primaryRecommendation
    ? briefing.recommendedActions.filter((item) => item.id !== briefing.primaryRecommendation!.id)
    : briefing.recommendedActions;

  return (
    <OperationsShell activeId="intelligence">
      <KxdPage className="kxd-os-page--ops kxd-os-intelligence">
        <div className="kxd-os-intelligence-ritual-entry">
          <Link href="/admin/operations/brief" className="kxd-os-ritual-entry-link">
            Open Morning Brief →
          </Link>
        </div>
        <ExecutiveNarrativeBlock
          narrative={briefing.narrative}
          greeting={briefing.greeting}
          dateDisplay={briefing.dateDisplay}
          timeDisplay={briefing.timeDisplay}
          confidence={briefing.confidence}
        />

        <ExecutiveHealthSummary snapshot={briefing.healthSnapshot} />

        <PrimaryRecommendation recommendation={briefing.primaryRecommendation} />

        <ExecutiveInsights insights={briefing.executiveInsights} />

        <div className="kxd-os-intelligence-divider" aria-hidden />

        <div className="kxd-os-intelligence-layout">
          <div className="kxd-os-intelligence-main">
            <NarrativeSection label="What Changed" href="/admin/operations/timeline" linkText="Timeline" subdued>
              {briefing.whatChanged.length === 0 ? (
                <OpsEmpty message="No meaningful changes in the last 48 hours." />
              ) : (
                <OpsCard>
                  <div className="kxd-os-ops-list">
                    {briefing.whatChanged.map((item) => (
                      <OpsListRow key={item.id} href={item.href}>
                        <div>
                          <p className="kxd-os-intelligence-row__title">{item.label}</p>
                          <p className="kxd-os-meta">{item.detail}</p>
                        </div>
                      </OpsListRow>
                    ))}
                  </div>
                </OpsCard>
              )}
            </NarrativeSection>

            <NarrativeSection label="Top Priorities" href="/admin/operations/work" linkText="Work" subdued>
              {briefing.topPriorities.length === 0 ? (
                <OpsEmpty message="No urgent priorities — operations are clear." />
              ) : (
                <OpsCard>
                  <div className="kxd-os-ops-list">
                    {briefing.topPriorities.map((item, index) => (
                      <OpsListRow key={item.id} href={item.href}>
                        <div className="kxd-os-intelligence-priority">
                          <span className="kxd-os-meta">{index + 1}</span>
                          <div>
                            <p className="kxd-os-intelligence-row__title">{item.title}</p>
                            <p className="kxd-os-meta">{item.reason}</p>
                          </div>
                          <OpsStatusBadge
                            label={item.urgency}
                            variant={
                              item.urgency === "critical"
                                ? "critical"
                                : item.urgency === "high"
                                  ? "warning"
                                  : "default"
                            }
                          />
                        </div>
                      </OpsListRow>
                    ))}
                  </div>
                </OpsCard>
              )}
            </NarrativeSection>

            {additionalRecommendations.length > 0 ? (
              <NarrativeSection label="Additional Recommendations" subdued>
                <div className="kxd-os-recommendation-stack">
                  {additionalRecommendations.map((item) => (
                    <RecommendationCard key={item.id} recommendation={item} variant="compact" />
                  ))}
                </div>
              </NarrativeSection>
            ) : null}
          </div>

          <aside className="kxd-os-intelligence-aside">
            <NarrativeSection label="Business Risks" subdued>
              {briefing.businessRisks.length === 0 ? (
                <OpsEmpty message="No actionable risks detected." />
              ) : (
                <OpsCard>
                  <div className="kxd-os-ops-list">
                    {briefing.businessRisks.map((item) => (
                      <OpsListRow key={item.id} href={item.href}>
                        <div>
                          <p className="kxd-os-intelligence-row__title">{item.title}</p>
                          <p className="kxd-os-meta">{item.reason}</p>
                        </div>
                      </OpsListRow>
                    ))}
                  </div>
                </OpsCard>
              )}
            </NarrativeSection>

            <NarrativeSection label="Opportunities" subdued>
              {briefing.businessOpportunities.length === 0 ? (
                <OpsEmpty message="No opportunities surfaced from current data." />
              ) : (
                <OpsCard>
                  <div className="kxd-os-ops-list">
                    {briefing.businessOpportunities.map((item) => (
                      <OpsListRow key={item.id} href={item.href}>
                        <div>
                          <p className="kxd-os-intelligence-row__title">{item.title}</p>
                          <p className="kxd-os-meta">{item.reason}</p>
                        </div>
                      </OpsListRow>
                    ))}
                  </div>
                </OpsCard>
              )}
            </NarrativeSection>

            <NarrativeSection label="Platform Status" subdued>
              <OpsCard>
                <p className="kxd-os-meta">{briefing.platformStatus.summary}</p>
                <ul className="kxd-os-intelligence-platform">
                  {briefing.platformStatus.items.map((item) => (
                    <li key={item.label}>
                      <span>{item.label}</span>
                      <OpsStatusBadge
                        label={item.status}
                        variant={
                          item.status === "warning"
                            ? "critical"
                            : item.status === "attention"
                              ? "warning"
                              : "success"
                        }
                      />
                      <span className="kxd-os-meta">{item.detail}</span>
                    </li>
                  ))}
                </ul>
              </OpsCard>
            </NarrativeSection>

            <p className="kxd-os-meta kxd-os-intelligence-generated">
              Generated{" "}
              {new Date(briefing.generatedAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              {" · "}
              <Link href="/admin/operations/brain" className="kxd-os-link-quiet">
                KXD Brain
              </Link>
            </p>
          </aside>
        </div>
      </KxdPage>
    </OperationsShell>
  );
}
