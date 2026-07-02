import Link from "next/link";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  KxdBadge,
  KxdEmptyState,
  KxdMetric,
  KxdPage,
  KxdSection,
  KxdSurface,
} from "@/components/os";
import type { KxdBadgeVariant } from "@/components/os";
import type {
  ActionItem,
  ExecutiveDashboardData,
} from "@/lib/executive-dashboard";
import type { ReportingDashboardData } from "@/lib/reporting/types";
import { AUDIT_STATUS_LABEL } from "@/lib/website-audit/scoring";

const PIPELINE_ORDER = [
  "new-lead",
  "contacted",
  "qualified",
  "proposal-sent",
  "closed-won",
  "closed-lost",
] as const;

const ACTION_TONE_VARIANT: Record<ActionItem["tone"], KxdBadgeVariant> = {
  red: "critical",
  yellow: "warning",
  gold: "success",
};

const QUICK_ACTIONS = [
  { label: "New Client", href: "/admin/collections/clients/create" },
  { label: "New Project", href: "/admin/collections/client-projects/create" },
  { label: "New Request", href: "/admin/operations/requests/new" },
  { label: "New Onboarding", href: "/admin/collections/client-onboarding/create" },
  { label: "Website Audit Review", href: "/admin/operations/audits" },
  { label: "Playbooks", href: "/admin/operations/playbooks" },
  { label: "Client Portal", href: "/portal" },
] as const;

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export interface ExecutiveScreenProps {
  data: ExecutiveDashboardData;
  reporting?: ReportingDashboardData;
  today: string;
}

export function ExecutiveScreen({ data, reporting, today }: ExecutiveScreenProps) {
  const kpiItems = [
    { label: "Total Clients", value: String(data.kpis.totalClients) },
    { label: "Active Projects", value: String(data.kpis.activeProjects) },
    { label: "Open Requests", value: String(data.kpis.openRequests) },
    { label: "Pending Deliverables", value: String(data.kpis.pendingDeliverables) },
    { label: "Completed (30d)", value: String(data.kpis.completedDeliverables30d) },
    { label: "Audit Leads (30d)", value: String(data.kpis.newAuditLeads30d) },
    { label: "Portal Users", value: String(data.kpis.portalUsers) },
    { label: "Onboarding Active", value: String(data.kpis.onboardingInProgress) },
  ];

  return (
    <OperationsShell activeId="executive">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Executive Overview"
          title="Executive Overview"
          lead={`${today} · Live snapshot across clients, delivery, onboarding, audits, and portal`}
        />

        <KxdSection label="Executive Overview" className="kxd-os-operations-section">
          <div className="kxd-os-operations-overview-grid">
            {data.commandCenter.cards.map((card) => (
              <Link
                key={card.id}
                href={card.href}
                className="kxd-os-operations-overview-card"
              >
                <KxdSurface variant="glass" className="kxd-os-operations-overview-card__inner">
                  <p className="kxd-os-metric__label">{card.title}</p>
                  <p className="kxd-os-operations-overview-card__value">{card.value}</p>
                  {card.sub && <p className="kxd-os-metric__sub">{card.sub}</p>}
                </KxdSurface>
              </Link>
            ))}
          </div>
        </KxdSection>

        <KxdSection label="Today's Client Priorities">
          <div className="kxd-os-operations-priorities">
            {[
              { key: "critical", label: "Critical", items: data.clientPriorities.critical, total: data.clientPriorities.totals.critical },
              { key: "high", label: "High", items: data.clientPriorities.high, total: data.clientPriorities.totals.high },
              { key: "dueToday", label: "Due today", items: data.clientPriorities.dueToday, total: data.clientPriorities.totals.dueToday },
              { key: "overdue", label: "Overdue", items: data.clientPriorities.overdue, total: data.clientPriorities.totals.overdue },
              { key: "needsReply", label: "Needs reply", items: data.clientPriorities.needsReply, total: data.clientPriorities.totals.needsReply },
            ].map((bucket) => (
              <div key={bucket.key} className="kxd-os-operations-priorities__col">
                <p className="kxd-os-metric__label">
                  {bucket.label}
                  {bucket.total > bucket.items.length ? ` · ${bucket.total}` : ""}
                </p>
                {bucket.items.length === 0 ? (
                  <p className="kxd-os-meta">Clear</p>
                ) : (
                  <div className="kxd-os-list-stack">
                    {bucket.items.map((item) => (
                      <Link key={`${bucket.key}-${item.id}`} href={item.href} className="kxd-os-list-row">
                        <p className="kxd-os-body">{item.title}</p>
                        <p className="kxd-os-meta kxd-os-list-row__sub">{item.clientName}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </KxdSection>

        <KxdSection label="Proposal Pipeline">
          <div className="kxd-os-operations-proposals-head">
            <KxdMetric
              label="Pipeline value"
              value={new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(data.proposals.pipelineValue)}
              className="kxd-os-operations-mini-metric"
            />
            <KxdMetric
              label="Forecast revenue"
              value={new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(data.proposals.forecastRevenue)}
              className="kxd-os-operations-mini-metric"
            />
            <Link href="/admin/sales/proposals" className="kxd-os-link-quiet">
              Open Sales Engine →
            </Link>
          </div>
          <div className="kxd-os-operations-priorities">
            {[
              { key: "pending", label: "Pending", items: data.proposals.pending, total: data.proposals.totals.pending },
              { key: "viewed", label: "Viewed", items: data.proposals.viewed, total: data.proposals.totals.viewed },
              { key: "follow-up", label: "Needs follow-up", items: data.proposals.needsFollowUp, total: data.proposals.totals.needsFollowUp },
              { key: "approved", label: "Approved (month)", items: data.proposals.approvedThisMonth, total: data.proposals.totals.approvedThisMonth },
              { key: "expiring", label: "Expiring", items: data.proposals.expiring, total: data.proposals.totals.expiring },
            ].map((bucket) => (
              <div key={bucket.key} className="kxd-os-operations-priorities__col">
                <p className="kxd-os-metric__label">
                  {bucket.label}
                  {bucket.total > bucket.items.length ? ` · ${bucket.total}` : ""}
                </p>
                {bucket.items.length === 0 ? (
                  <p className="kxd-os-meta">Clear</p>
                ) : (
                  <div className="kxd-os-list-stack">
                    {bucket.items.map((item) => (
                      <Link key={`${bucket.key}-${item.id}`} href={item.href} className="kxd-os-list-row">
                        <p className="kxd-os-body">{item.title}</p>
                        <p className="kxd-os-meta kxd-os-list-row__sub">
                          {item.clientName}
                          {item.amount != null ? ` · ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(item.amount)}` : ""}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </KxdSection>

        <KxdSection label="Proposal Conversion">
          <div className="kxd-os-operations-conversion-head">
            <KxdMetric
              label="Ready to convert"
              value={String(data.conversion.totals.ready)}
              className="kxd-os-operations-mini-metric"
            />
            <KxdMetric
              label="Conversion value"
              value={new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(data.conversion.conversionValue)}
              className="kxd-os-operations-mini-metric"
            />
            <KxdMetric
              label="Awaiting signature"
              value={String(data.conversion.totals.contracts)}
              className="kxd-os-operations-mini-metric"
            />
            <Link href="/admin/sales/conversion" className="kxd-os-link-quiet">
              Open conversion queue →
            </Link>
          </div>
          <div className="kxd-os-operations-priorities">
            {[
              { key: "ready", label: "Ready to Convert", items: data.conversion.readyToConvert, total: data.conversion.totals.ready },
              { key: "converted", label: "Recently Converted", items: data.conversion.recentlyConverted, total: data.conversion.totals.converted },
              { key: "contracts", label: "Contracts Awaiting Signature", items: data.conversion.contractsAwaitingSignature, total: data.conversion.totals.contracts },
              { key: "signed", label: "Signed Today", items: data.conversion.signedToday, total: data.conversion.totals.signed },
              { key: "launch", label: "Launch Queue", items: data.conversion.launchQueue, total: data.conversion.totals.launch },
            ].map((bucket) => (
              <div key={bucket.key} className="kxd-os-operations-priorities__col">
                <p className="kxd-os-metric__label">
                  {bucket.label}
                  {bucket.total > bucket.items.length ? ` · ${bucket.total}` : ""}
                </p>
                {bucket.items.length === 0 ? (
                  <p className="kxd-os-meta">Clear</p>
                ) : (
                  <div className="kxd-os-list-stack">
                    {bucket.items.map((item) => (
                      <Link key={`${bucket.key}-${item.id}`} href={item.href} className="kxd-os-list-row">
                        <p className="kxd-os-body">{item.title}</p>
                        <p className="kxd-os-meta kxd-os-list-row__sub">
                          {item.clientName}
                          {item.amount != null ? ` · ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(item.amount)}` : ""}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </KxdSection>

        <div className="kxd-os-operations-columns">
          <KxdSection label="Projects At Risk">
            {data.commandCenter.projectsAtRisk.length === 0 ? (
              <KxdEmptyState
                title="No active risks detected."
                className="kxd-os-operations-empty"
              />
            ) : (
              <div className="kxd-os-list-stack">
                {data.commandCenter.projectsAtRisk.map((project) => (
                  <Link
                    key={project.id}
                    href={project.href}
                    className="kxd-os-list-row"
                  >
                    <p className="kxd-os-body">{project.projectName}</p>
                    <p className="kxd-os-meta kxd-os-list-row__sub">{project.clientName}</p>
                    <KxdBadge variant="warning" className="kxd-os-list-row__badge">
                      {project.reason}
                    </KxdBadge>
                  </Link>
                ))}
              </div>
            )}
          </KxdSection>

          <KxdSection label="Upcoming Renewals">
            {data.commandCenter.upcomingRenewals.length === 0 ? (
              <KxdEmptyState
                title="No upcoming renewals inside the current window."
                className="kxd-os-operations-empty"
              />
            ) : (
              <div className="kxd-os-list-stack">
                {data.commandCenter.upcomingRenewals.map((renewal) => (
                  <Link
                    key={renewal.id}
                    href={renewal.href}
                    className="kxd-os-list-row kxd-os-list-row--split"
                  >
                    <div>
                      <p className="kxd-os-body">{renewal.clientName}</p>
                      <p className="kxd-os-meta kxd-os-list-row__sub">
                        {renewal.label} · {renewal.date}
                      </p>
                    </div>
                    <p className="kxd-os-operations-renewal-amount">{renewal.amount}</p>
                  </Link>
                ))}
              </div>
            )}
          </KxdSection>

          <KxdSection label="Onboarding Pipeline">
            <KxdSurface variant="panel" className="kxd-os-operations-panel">
              <div className="kxd-os-operations-mini-grid">
                {[
                  { label: "In Pipeline", value: data.commandCenter.onboardingPipeline.inPipeline },
                  {
                    label: "Waiting on Client",
                    value: data.commandCenter.onboardingPipeline.waitingOnClient,
                  },
                  {
                    label: "Waiting on KXD",
                    value: data.commandCenter.onboardingPipeline.waitingOnKxd,
                  },
                  {
                    label: "Ready for Build",
                    value: data.commandCenter.onboardingPipeline.readyForBuild,
                  },
                ].map((item) => (
                  <KxdMetric
                    key={item.label}
                    label={item.label}
                    value={String(item.value)}
                    className="kxd-os-operations-mini-metric"
                  />
                ))}
              </div>
              {data.commandCenter.onboardingPipeline.waitingOnKxd === 0 && (
                <p className="kxd-os-meta kxd-os-operations-panel__note">
                  No onboarding clients waiting on KXD.
                </p>
              )}
              <Link href="/admin/operations/onboarding" className="kxd-os-link-quiet">
                Open Onboarding →
              </Link>
            </KxdSurface>
          </KxdSection>
        </div>

        <div className="kxd-os-operations-kpi-bar">
          {kpiItems.map((kpi) => (
            <KxdMetric key={kpi.label} label={kpi.label} value={kpi.value} />
          ))}
        </div>

        {reporting ? (
          <KxdSection label="Reporting">
            <div className="kxd-os-operations-kpi-bar" style={{ marginBottom: "0.75rem" }}>
              <KxdMetric label="Reports due" value={String(reporting.reportsDue)} />
              <KxdMetric label="Generated" value={String(reporting.reportsGenerated)} />
              <KxdMetric label="Published" value={String(reporting.reportsPublished)} />
              <KxdMetric label="Viewed" value={String(reporting.reportsViewed)} />
            </div>
            <Link href="/admin/operations/reports" className="kxd-os-link-quiet">
              Open Reporting Engine →
            </Link>
          </KxdSection>
        ) : null}

        <div className="kxd-os-operations-split">
          <KxdSection label="Action Center">
            {data.actionCenter.length === 0 ? (
              <p className="kxd-os-meta">No urgent items right now.</p>
            ) : (
              <div className="kxd-os-list-stack">
                {data.actionCenter.map((item) => (
                  <Link key={item.id} href={item.href} className="kxd-os-list-row">
                    <KxdBadge variant={ACTION_TONE_VARIANT[item.tone]}>{item.label}</KxdBadge>
                    <p className="kxd-os-meta kxd-os-list-row__sub">{item.detail}</p>
                  </Link>
                ))}
              </div>
            )}
          </KxdSection>

          <KxdSection label="Website Audit Pipeline">
            <KxdSurface variant="panel" className="kxd-os-operations-panel">
              <div className="kxd-os-operations-pipeline-head">
                <KxdMetric
                  label="Win Rate"
                  value={`${data.salesPipeline.conversionToWon}%`}
                  className="kxd-os-operations-pipeline-metric kxd-os-operations-pipeline-metric--accent"
                />
                <KxdMetric
                  label="Qualified+"
                  value={`${data.salesPipeline.conversionToQualified}%`}
                  className="kxd-os-operations-pipeline-metric kxd-os-operations-pipeline-metric--info"
                />
                <KxdMetric
                  label="Total Audits"
                  value={String(data.salesPipeline.total)}
                  className="kxd-os-operations-pipeline-metric"
                />
              </div>
              <div className="kxd-os-operations-pipeline-rows">
                {PIPELINE_ORDER.map((status) => {
                  const count = data.salesPipeline.counts[status] ?? 0;
                  const pct =
                    data.salesPipeline.total > 0
                      ? Math.round((count / data.salesPipeline.total) * 100)
                      : 0;
                  return (
                    <div key={status} className="kxd-os-operations-pipeline-row">
                      <span className="kxd-os-meta">
                        {AUDIT_STATUS_LABEL[status] ?? status}
                      </span>
                      <span className="kxd-os-body">
                        {count}{" "}
                        <span className="kxd-os-caption">({pct}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
              <Link href="/admin/operations/audits" className="kxd-os-link-quiet">
                Open Audit Dashboard →
              </Link>
            </KxdSurface>
          </KxdSection>
        </div>

        <div className="kxd-os-operations-split">
          <KxdSection label="Client Health Flags">
            {data.clientHealth.length === 0 ? (
              <p className="kxd-os-meta">No flagged clients.</p>
            ) : (
              <div className="kxd-os-list-stack">
                {data.clientHealth.map((client) => (
                  <Link
                    key={client.clientId}
                    href={client.href}
                    className="kxd-os-list-row"
                  >
                    <p className="kxd-os-body">{client.clientName}</p>
                    <div className="kxd-os-operations-badge-row">
                      {client.issues.map((issue) => (
                        <KxdBadge key={issue} variant="warning">
                          {issue}
                        </KxdBadge>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </KxdSection>

          <KxdSection label="Business Snapshot">
            <div className="kxd-os-operations-snapshot-grid">
              {[
                { label: "Leads This Month", value: String(data.snapshot.leadsThisMonth) },
                { label: "New Clients", value: String(data.snapshot.newClientsThisMonth) },
                {
                  label: "Projects Completed",
                  value: String(data.snapshot.projectsCompletedThisMonth),
                },
                {
                  label: "Audit Conversion",
                  value: `${data.snapshot.auditConversionRate}%`,
                },
                {
                  label: "Onboarding Complete",
                  value: `${data.snapshot.onboardingCompletionRate}%`,
                },
              ].map((snapshot) => (
                <KxdMetric
                  key={snapshot.label}
                  label={snapshot.label}
                  value={snapshot.value}
                />
              ))}
            </div>
          </KxdSection>
        </div>

        <KxdSection label="Recent Activity" className="kxd-os-operations-section">
          <div className="kxd-os-list-stack">
            {data.recentActivity.map((item) => (
              <Link key={item.id} href={item.href} className="kxd-os-list-row kxd-os-list-row--split">
                <div>
                  <p className="kxd-os-caption">{item.type}</p>
                  <p className="kxd-os-body">{item.title}</p>
                  <p className="kxd-os-meta kxd-os-list-row__sub">{item.sub}</p>
                </div>
                <p className="kxd-os-meta">{fmtTime(item.at)}</p>
              </Link>
            ))}
          </div>
        </KxdSection>

        <KxdSection label="Quick Actions" className="kxd-os-operations-section">
          <div className="kxd-os-operations-actions">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="kxd-os-btn kxd-os-btn--secondary kxd-os-btn--sm"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </KxdSection>
      </KxdPage>
    </OperationsShell>
  );
}
