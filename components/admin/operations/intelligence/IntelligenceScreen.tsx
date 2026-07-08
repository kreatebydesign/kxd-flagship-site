import Link from "next/link";
import type { ReactNode } from "react";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsEmpty,
  OpsListRow,
  OpsSectionHead,
  OpsStatusBadge,
} from "@/components/admin/operations/shared/OpsBriefing";
import { KxdPage } from "@/components/os";
import type { ExecutiveBriefing } from "@/lib/intelligence/briefings";
import type { IntelligenceConfidence } from "@/lib/intelligence/types";

function healthVariant(level: string): "success" | "default" | "warning" | "critical" {
  if (level === "excellent" || level === "strong" || level === "smooth") return "success";
  if (level === "healthy" || level === "stable" || level === "busy") return "default";
  if (level === "needs-attention" || level === "cooling" || level === "strained") return "warning";
  return "critical";
}

function formatLevel(level: string): string {
  return level
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function confidenceLabel(confidence: IntelligenceConfidence): string {
  return confidence.charAt(0).toUpperCase() + confidence.slice(1);
}

function BriefSection({
  label,
  children,
  href,
  linkText,
}: {
  label: string;
  children: ReactNode;
  href?: string;
  linkText?: string;
}) {
  return (
    <section className="kxd-os-intelligence-section">
      <OpsSectionHead label={label} href={href} linkText={linkText} />
      {children}
    </section>
  );
}

function ScoreCard({
  label,
  level,
  score,
  summary,
  signals,
}: {
  label: string;
  level: string;
  score: number;
  summary: string;
  signals: string[];
}) {
  return (
    <OpsCard className="kxd-os-intelligence-score">
      <p className="kxd-os-intelligence-score__label">{label}</p>
      <div className="kxd-os-intelligence-score__head">
        <p className="kxd-os-intelligence-score__level">{formatLevel(level)}</p>
        <OpsStatusBadge label={`${score}`} variant={healthVariant(level)} />
      </div>
      <p className="kxd-os-intelligence-score__summary">{summary}</p>
      {signals.length > 0 ? (
        <ul className="kxd-os-intelligence-signals">
          {signals.slice(0, 4).map((signal) => (
            <li key={signal}>{signal}</li>
          ))}
        </ul>
      ) : null}
    </OpsCard>
  );
}

export function IntelligenceScreen({ briefing }: { briefing: ExecutiveBriefing }) {
  return (
    <OperationsShell activeId="intelligence">
      <KxdPage className="kxd-os-page--ops kxd-os-intelligence">
        <OperationsPageHero
          eyebrow="KXD OS · Executive Intelligence"
          title={`${briefing.greeting}`}
          lead={`${briefing.dateDisplay} · ${briefing.timeDisplay}`}
          presence
        />

        <OpsCard className="kxd-os-intelligence-brief">
          <div className="kxd-os-intelligence-brief__head">
            <p className="kxd-os-section__label">Executive Briefing</p>
            <div className="kxd-os-intelligence-brief__meta">
              <OpsStatusBadge
                label={formatLevel(briefing.businessHealth.level)}
                variant={healthVariant(briefing.businessHealth.level)}
              />
              <span className="kxd-os-meta">
                Confidence · {confidenceLabel(briefing.confidence)}
              </span>
            </div>
          </div>
          <p className="kxd-os-intelligence-brief__summary">{briefing.businessHealth.summary}</p>
        </OpsCard>

        <div className="kxd-os-intelligence-grid kxd-os-intelligence-grid--health">
          <ScoreCard
            label="Business Health"
            level={briefing.businessHealth.level}
            score={briefing.businessHealth.score}
            summary={briefing.businessHealth.summary}
            signals={briefing.businessHealth.factors}
          />
          <ScoreCard
            label="Relationship Health"
            level={briefing.relationshipHealth.level}
            score={briefing.relationshipHealth.score}
            summary={briefing.relationshipHealth.summary}
            signals={briefing.relationshipHealth.signals}
          />
          <ScoreCard
            label="Operational Health"
            level={briefing.operationalHealth.level}
            score={briefing.operationalHealth.score}
            summary={briefing.operationalHealth.summary}
            signals={briefing.operationalHealth.signals}
          />
        </div>

        <div className="kxd-os-intelligence-layout">
          <div className="kxd-os-intelligence-main">
            <BriefSection label="What Changed" href="/admin/operations/timeline" linkText="Timeline">
              {briefing.whatChanged.length === 0 ? (
                <OpsEmpty message="No meaningful changes in the last 48 hours." />
              ) : (
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
              )}
            </BriefSection>

            <BriefSection label="Top Priorities" href="/admin/operations/work" linkText="Work">
              {briefing.topPriorities.length === 0 ? (
                <OpsEmpty message="No urgent priorities — operations are clear." />
              ) : (
                <div className="kxd-os-ops-list">
                  {briefing.topPriorities.map((item, index) => (
                    <OpsListRow key={item.id} href={item.href}>
                      <div className="kxd-os-intelligence-priority">
                        <span className="kxd-os-meta">{index + 1}</span>
                        <div>
                          <p className="kxd-os-intelligence-row__title">{item.title}</p>
                          <p className="kxd-os-meta">{item.reason}</p>
                        </div>
                        <OpsStatusBadge label={item.urgency} variant={item.urgency === "critical" ? "critical" : item.urgency === "high" ? "warning" : "default"} />
                      </div>
                    </OpsListRow>
                  ))}
                </div>
              )}
            </BriefSection>

            <BriefSection label="Recommended Actions">
              {briefing.recommendedActions.length === 0 ? (
                <OpsEmpty message="No recommendations — nothing requires a decision right now." />
              ) : (
                <div className="kxd-os-ops-list">
                  {briefing.recommendedActions.map((item) => (
                    <OpsListRow key={item.id} href={item.href}>
                      <div>
                        <p className="kxd-os-intelligence-row__title">{item.title}</p>
                        <p className="kxd-os-meta">{item.reason}</p>
                        <p className="kxd-os-meta kxd-os-intelligence-row__action">
                          {item.actionType.replace(/-/g, " ")} · {confidenceLabel(item.confidence)} confidence
                          {item.estimatedValue != null
                            ? ` · ~$${item.estimatedValue.toLocaleString()} impact`
                            : ""}
                        </p>
                      </div>
                    </OpsListRow>
                  ))}
                </div>
              )}
            </BriefSection>
          </div>

          <aside className="kxd-os-intelligence-aside">
            <BriefSection label="Business Risks">
              {briefing.businessRisks.length === 0 ? (
                <OpsEmpty message="No actionable risks detected." />
              ) : (
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
              )}
            </BriefSection>

            <BriefSection label="Opportunities">
              {briefing.businessOpportunities.length === 0 ? (
                <OpsEmpty message="No opportunities surfaced from current data." />
              ) : (
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
              )}
            </BriefSection>

            <BriefSection label="Platform Status">
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
            </BriefSection>

            <p className="kxd-os-meta kxd-os-intelligence-generated">
              Generated {new Date(briefing.generatedAt).toLocaleString("en-US", {
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
