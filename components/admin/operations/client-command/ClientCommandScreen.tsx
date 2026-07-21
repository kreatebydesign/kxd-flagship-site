import Link from "next/link";
import {
  KxdBadge,
  KxdEmptyState,
  KxdPage,
  KxdSection,
} from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsEmpty,
  OpsKpiStrip,
  OpsListRow,
  OpsSectionHead,
} from "@/components/admin/operations/shared/OpsBriefing";
import type { ClientCommandCenterData, CommandListItem } from "@/lib/client-command";
import { ClientOpsNav } from "./ClientOpsNav";

function urgencyVariant(urgency: string): "default" | "status" | "success" | "critical" | "warning" {
  switch (urgency) {
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

function ListBlock({
  items,
  empty,
}: {
  items: CommandListItem[];
  empty: string;
}) {
  if (items.length === 0) return <OpsEmpty message={empty} />;
  return (
    <div className="kxd-os-list-stack">
      {items.map((item) => (
        <OpsListRow key={item.id} href={item.href}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
            <div>
              <p className="kxd-os-body">{item.title}</p>
              {item.detail ? <p className="kxd-os-meta">{item.detail}</p> : null}
              {item.meta ? <p className="kxd-os-meta">{item.meta}</p> : null}
            </div>
            {item.status ? <KxdBadge variant="default">{item.status}</KxdBadge> : null}
          </div>
        </OpsListRow>
      ))}
    </div>
  );
}

/**
 * Legacy Client Command center screen.
 * Live route `/admin/operations/client-command/[clientId]` renders
 * `ClientCommandWorkspace` (overview mounts Plans & Access + Upgrade Requests).
 * Keep this screen for reference / alternate composition — do not mount panels
 * here as a second live path.
 */
export function ClientCommandScreen({ data }: { data: ClientCommandCenterData }) {
  const { hero, executiveBrief, sections, recommendations, currentWork, playbooks, clientSuccess, genesis, launchQa } = data;

  return (
    <OperationsShell activeId="clients" clientId={hero.clientId}>
      <KxdPage className="kxd-os-page--ops">
        <div className="kxd-os-ops-section-head">
          <OperationsPageHero
            eyebrow="KXD OS · Client Operations"
            title={hero.clientName}
            lead="Executive command center — everything important for this relationship in one view."
            presence
          />
          <Link href="/admin/operations/clients" className="kxd-os-link-quiet">
            ← Portfolio
          </Link>
        </div>

        <ClientOpsNav clientId={hero.clientId} active="command" />

        <OpsKpiStrip
          items={[
            { label: "Relationship", value: hero.relationshipStatus },
            { label: "Health", value: hero.healthScore != null ? String(hero.healthScore) : "—" },
            { label: "Monthly", value: hero.monthlyInvestment },
            { label: "Lifetime", value: hero.lifetimeRevenue },
            { label: "Phase", value: hero.currentPhase },
            { label: "Next", value: hero.nextMilestone },
          ]}
        />

        <div className="kxd-os-meta" style={{ margin: "0.5rem 0 1.25rem" }}>
          {hero.tier ? `${hero.tier} · ` : ""}
          Account: {hero.accountManager}
        </div>

        <KxdSection label="Genesis" className="kxd-os-operations-section">
          <OpsKpiStrip
            items={[
              { label: "Discovery", value: `${genesis.discoveryProgress}%` },
              { label: "Blueprints", value: genesis.blueprintStatus },
              { label: "Launch Readiness", value: `${genesis.launchReadiness}%`, alert: genesis.launchReadiness < 70 },
            ]}
          />
          <p className="kxd-os-body" style={{ marginTop: "0.75rem" }}>
            <span className="kxd-os-meta">Recommended · </span>
            {genesis.recommendedNextStep}
          </p>
          {genesis.missingInformation.length > 0 ? (
            <div className="kxd-os-list-stack" style={{ marginTop: "0.75rem" }}>
              {genesis.missingInformation.map((item) => (
                <p key={item} className="kxd-os-meta">{item}</p>
              ))}
            </div>
          ) : null}
          <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {genesis.href ? (
              <Link href={genesis.href} className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm">
                Open Genesis
              </Link>
            ) : (
              <Link href="/admin/operations/genesis" className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm">
                Launch Genesis
              </Link>
            )}
          </div>
        </KxdSection>

        <KxdSection label="Launch QA" className="kxd-os-operations-section">
          <OpsKpiStrip
            items={[
              { label: "Readiness", value: `${launchQa.readinessScore}%`, alert: launchQa.readinessScore < 80 },
              { label: "Status", value: launchQa.status.replace(/-/g, " ") },
              { label: "Blockers", value: String(launchQa.criticalBlockers), alert: launchQa.criticalBlockers > 0 },
              { label: "Open Items", value: String(launchQa.openItems), alert: launchQa.openItems > 5 },
            ]}
          />
          <p className="kxd-os-body" style={{ marginTop: "0.75rem" }}>
            <span className="kxd-os-meta">Recommendation · </span>
            {launchQa.recommendation === "none" ? "No QA session" : launchQa.recommendation.replace(/-/g, " ")}
          </p>
          {launchQa.launchDate ? (
            <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
              Launch date: {launchQa.launchDate}
            </p>
          ) : null}
          <div style={{ marginTop: "0.75rem" }}>
            {launchQa.href ? (
              <Link href={launchQa.href} className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm">
                Open Launch QA
              </Link>
            ) : (
              <Link href={`/admin/operations/launch-qa/${hero.clientId}`} className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm">
                Start Launch QA
              </Link>
            )}
          </div>
        </KxdSection>

        <KxdSection label="Current Work" className="kxd-os-operations-section">
          <OpsKpiStrip
            items={[
              { label: "Open", value: String(currentWork.openCount), alert: currentWork.openCount > 0 },
              { label: "Blocked", value: String(currentWork.blockedCount), alert: currentWork.blockedCount > 0 },
              { label: "Due This Week", value: String(currentWork.dueThisWeek), alert: currentWork.dueThisWeek > 0 },
              { label: "Completed (Month)", value: String(currentWork.completedThisMonth) },
              {
                label: "Est. Hours",
                value: `${currentWork.estimatedHoursOpen}h`,
                sub: "Open workload",
              },
            ]}
          />
          {currentWork.currentFocus ? (
            <p className="kxd-os-body" style={{ marginTop: "0.75rem" }}>
              <span className="kxd-os-meta">Current focus · </span>
              {currentWork.currentFocus}
            </p>
          ) : null}
          {currentWork.nextTask ? (
            <div className="kxd-os-list-stack" style={{ marginTop: "0.75rem" }}>
              <OpsListRow href={currentWork.href}>
                <p className="kxd-os-body">Next recommended — {currentWork.nextTask.title}</p>
                <p className="kxd-os-meta">
                  {currentWork.nextTask.priority} · {currentWork.nextTask.status.replace(/-/g, " ")}
                </p>
              </OpsListRow>
            </div>
          ) : null}
          <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Link href={currentWork.href} className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm">
              Open work board
            </Link>
            <Link
              href={`/admin/collections/client-tasks/create?client=${hero.clientId}`}
              className="kxd-os-link-quiet"
            >
              New task →
            </Link>
          </div>
        </KxdSection>

        <KxdSection label="Playbooks" className="kxd-os-operations-section">
          <OpsKpiStrip
            items={[
              { label: "Active", value: String(playbooks.active.length), alert: playbooks.active.length > 0 },
              { label: "Completed", value: String(playbooks.completed.length) },
              {
                label: "Next Step",
                value: playbooks.nextStep?.stepTitle ?? "—",
                sub: playbooks.nextStep ? "Current playbook step" : "No active step",
                alert: Boolean(playbooks.nextStep),
              },
            ]}
          />
          <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Link href={`/admin/operations/playbooks?client=${hero.clientId}`} className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm">
              Quick launch playbook
            </Link>
            {playbooks.nextStep ? (
              <Link href={playbooks.nextStep.href} className="kxd-os-link-quiet">
                Open current run →
              </Link>
            ) : null}
          </div>
          {playbooks.active.length > 0 ? (
            <div className="kxd-os-list-stack" style={{ marginTop: "0.75rem" }}>
              {playbooks.active.slice(0, 5).map((run) => (
                <OpsListRow key={run.id} href={run.href}>
                  <p className="kxd-os-body">{run.playbookName}</p>
                  <p className="kxd-os-meta">{run.percentComplete}% · {run.status}</p>
                </OpsListRow>
              ))}
            </div>
          ) : null}
        </KxdSection>

        <KxdSection label="Client Success" className="kxd-os-operations-section">
          <OpsKpiStrip
            items={[
              { label: "Snapshot", value: clientSuccess.snapshot },
              {
                label: "Next Review",
                value:
                  clientSuccess.daysUntilReview != null
                    ? `${clientSuccess.daysUntilReview}d`
                    : clientSuccess.nextReview ?? "—",
                alert:
                  clientSuccess.daysUntilReview != null && clientSuccess.daysUntilReview <= 14,
              },
              {
                label: "Health",
                value: String(clientSuccess.healthScore),
                alert: clientSuccess.healthScore < 55,
              },
            ]}
          />
          {clientSuccess.currentFocus ? (
            <p className="kxd-os-body" style={{ marginTop: "0.75rem" }}>
              {clientSuccess.currentFocus}
            </p>
          ) : null}
          {clientSuccess.recentWins.length > 0 ? (
            <div className="kxd-os-list-stack" style={{ marginTop: "0.75rem" }}>
              {clientSuccess.recentWins.map((win) => (
                <p key={win} className="kxd-os-meta">· {win}</p>
              ))}
            </div>
          ) : null}
          <div style={{ marginTop: "0.75rem" }}>
            <Link href={clientSuccess.href} className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm">
              Open success plan
            </Link>
          </div>
        </KxdSection>

        <KxdSection label="Executive Brief" className="kxd-os-operations-section">
          <div className="kxd-os-list-stack">
            {executiveBrief.map((line) => (
              <p key={line} className="kxd-os-body">
                {line}
              </p>
            ))}
          </div>
        </KxdSection>

        <div className="kxd-os-operations-columns">
          <KxdSection label="Relationship">
            <OpsKpiStrip
              items={[
                { label: "Together", value: sections.relationship.yearsTogether },
                { label: "Meetings", value: String(sections.relationship.meetingCount) },
                { label: "Last contact", value: sections.relationship.lastContact },
                { label: "Next follow-up", value: sections.relationship.nextFollowUp },
              ]}
            />
            <div style={{ marginTop: "1rem" }}>
              <OpsSectionHead label="Timeline highlights" href={`/admin/operations/timeline/${hero.clientId}`} />
              <ListBlock items={sections.relationship.timelineHighlights} empty="No timeline highlights yet." />
            </div>
            {sections.relationship.executiveNotes ? (
              <p className="kxd-os-body" style={{ marginTop: "1rem", whiteSpace: "pre-wrap" }}>
                {sections.relationship.executiveNotes}
              </p>
            ) : null}
          </KxdSection>

          <KxdSection label="Revenue">
            <OpsKpiStrip
              items={[
                { label: "MRR", value: sections.revenue.mrr },
                { label: "Lifetime", value: sections.revenue.lifetimeRevenue },
                { label: "Pipeline", value: sections.revenue.proposalPipeline },
                { label: "Avg monthly", value: sections.revenue.averageMonthlyValue },
              ]}
            />
            <div style={{ marginTop: "1rem" }}>
              <OpsSectionHead label="Growth opportunities" />
              <ListBlock items={sections.revenue.growthOpportunities} empty="No growth signals identified." />
            </div>
          </KxdSection>
        </div>

        <KxdSection label="Projects & Delivery">
          <div className="kxd-os-operations-split">
            <div>
              <OpsSectionHead label="Active" count={sections.projects.active.length} />
              <ListBlock items={sections.projects.active} empty="No active projects." />
            </div>
            <div>
              <OpsSectionHead label="Blocked" count={sections.projects.blocked.length} />
              <ListBlock items={sections.projects.blocked} empty="Nothing blocked." />
            </div>
          </div>
          <div className="kxd-os-operations-split" style={{ marginTop: "1rem" }}>
            <div>
              <OpsSectionHead label="Deliverables" count={sections.projects.deliverables.length} />
              <ListBlock items={sections.projects.deliverables} empty="No deliverables on file." />
            </div>
            <div>
              <OpsSectionHead label="Open requests" count={sections.projects.requests.length} />
              <ListBlock items={sections.projects.requests} empty="No open requests." />
            </div>
          </div>
        </KxdSection>

        <KxdSection label="Website & Infrastructure">
          <OpsKpiStrip
            items={[
              {
                label: "Health",
                value: sections.website.healthScore != null ? String(sections.website.healthScore) : "—",
              },
              {
                label: "Infrastructure",
                value:
                  sections.website.infrastructureScore != null
                    ? String(sections.website.infrastructureScore)
                    : "—",
                sub: sections.website.infrastructureStatus,
              },
              { label: "Domain", value: sections.website.primaryDomain ?? "—" },
              { label: "Analytics", value: sections.website.analytics ?? "—" },
            ]}
          />
          <div className="kxd-os-operations-split" style={{ marginTop: "1rem" }}>
            <div>
              <OpsSectionHead label="Audits" href="/admin/operations/audits" />
              <ListBlock items={sections.website.audits} empty="No audits recorded." />
            </div>
            <div>
              <OpsSectionHead
                label="Signals"
                href={`/admin/operations/infrastructure/${hero.clientId}`}
              />
              <ListBlock items={sections.website.signals} empty="No infrastructure signals." />
            </div>
          </div>
        </KxdSection>

        <div className="kxd-os-operations-columns">
          <KxdSection label="Creative">
            <ListBlock
              items={[
                ...sections.creative.campaigns,
                ...sections.creative.videos,
                ...sections.creative.flyers,
                ...sections.creative.social,
              ].slice(0, 8)}
              empty="No creative work in motion."
            />
            {(sections.creative.brandKits.length > 0 || sections.creative.assets.length > 0) && (
              <div style={{ marginTop: "1rem" }}>
                <OpsSectionHead label="Brand & assets" href="/admin/operations/creative" />
                <ListBlock
                  items={[...sections.creative.brandKits, ...sections.creative.assets].slice(0, 6)}
                  empty=""
                />
              </div>
            )}
          </KxdSection>

          <KxdSection label="Reporting">
            {sections.reporting.latestReport ? (
              <OpsListRow href={sections.reporting.latestReport.href}>
                <p className="kxd-os-body">{sections.reporting.latestReport.title}</p>
                <p className="kxd-os-meta">{sections.reporting.latestReport.meta}</p>
              </OpsListRow>
            ) : (
              <KxdEmptyState title="No reports yet" description="Generate a monthly executive report." />
            )}
            <p className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
              {sections.reporting.engagementLabel}
            </p>
            <div style={{ marginTop: "0.75rem" }}>
              <ListBlock items={sections.reporting.historicalReports} empty="" />
            </div>
          </KxdSection>
        </div>

        <div className="kxd-os-operations-columns">
          <KxdSection label="Sales">
            <OpsKpiStrip
              items={[
                { label: "Pipeline", value: sections.sales.pipelineValue },
                { label: "Conversion", value: sections.sales.conversionRate },
              ]}
            />
            <div style={{ marginTop: "1rem" }}>
              <OpsSectionHead label="Opportunities" href="/admin/sales/proposals" />
              <ListBlock items={sections.sales.opportunities} empty="No open proposals." />
            </div>
          </KxdSection>

          <KxdSection label="Automation">
            <OpsKpiStrip
              items={[
                { label: "Recent events", value: String(sections.automation.recentEvents.length) },
                { label: "Health recalcs", value: String(sections.automation.healthRecalculations) },
                { label: "Failures", value: String(sections.automation.failures.length), alert: sections.automation.failures.length > 0 },
              ]}
            />
            <div style={{ marginTop: "1rem" }}>
              <ListBlock items={sections.automation.recentEvents} empty="No automation activity." />
            </div>
          </KxdSection>
        </div>

        <KxdSection label="Strategy">
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <Link href={sections.strategy.quickCreateHref} className="kxd-os-btn kxd-os-btn--ghost">
              Quick create note
            </Link>
            <Link href={`/admin/operations/strategy?client=${hero.clientId}`} className="kxd-os-link-quiet">
              Open vault →
            </Link>
          </div>
          <div className="kxd-os-operations-split">
            <div>
              <OpsSectionHead label="Latest notes" count={sections.strategy.latestNotes.length} />
              <ListBlock items={sections.strategy.latestNotes} empty="No executive notes yet." />
            </div>
            <div>
              <OpsSectionHead label="Pinned strategy" count={sections.strategy.pinnedStrategy.length} />
              <ListBlock items={sections.strategy.pinnedStrategy} empty="No pinned strategy notes." />
            </div>
          </div>
          <div className="kxd-os-operations-split" style={{ marginTop: "1rem" }}>
            <div>
              <OpsSectionHead label="Upcoming reminders" count={sections.strategy.upcomingReminders.length} />
              <ListBlock items={sections.strategy.upcomingReminders} empty="No reminders scheduled." />
            </div>
            <div>
              <OpsSectionHead label="Recent decisions" count={sections.strategy.recentDecisions.length} />
              <ListBlock items={sections.strategy.recentDecisions} empty="No decisions captured." />
            </div>
          </div>
          {sections.strategy.relationshipInsights.nextConversationTopics.length > 0 ? (
            <div style={{ marginTop: "1rem" }}>
              <OpsSectionHead label="Relationship insights" />
              <ul className="kxd-os-body">
                {sections.strategy.relationshipInsights.nextConversationTopics.slice(0, 4).map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </KxdSection>

        <KxdSection label="Recommended Actions">
          {recommendations.length === 0 ? (
            <OpsEmpty message="No recommendations — relationship looks clear." />
          ) : (
            <div className="kxd-os-list-stack">
              {recommendations.map((rec) => (
                <OpsListRow key={rec.id} href={rec.href}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                    <div>
                      <p className="kxd-os-body">{rec.title}</p>
                      <p className="kxd-os-meta">{rec.reason}</p>
                      <p className="kxd-os-meta">
                        {rec.estimatedImpact} · {rec.relatedModules.join(", ")}
                      </p>
                    </div>
                    <KxdBadge variant={urgencyVariant(rec.urgency)}>{rec.urgency}</KxdBadge>
                  </div>
                </OpsListRow>
              ))}
            </div>
          )}
        </KxdSection>
      </KxdPage>
    </OperationsShell>
  );
}
