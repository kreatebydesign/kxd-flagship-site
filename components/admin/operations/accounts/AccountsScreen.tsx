import Link from "next/link";
import {
  KxdBadge,
  KxdEmptyState,
  KxdMetric,
  KxdPage,
  KxdSection,
  KxdSurface,
  KxdTable,
  KxdTableBody,
  KxdTableCell,
  KxdTableHead,
  KxdTableHeaderCell,
  KxdTableRow,
  type KxdBadgeVariant,
} from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsEmpty,
  OpsKpiStrip,
  OpsListRow,
  OpsSectionHead,
  OpsStatusBadge,
} from "@/components/admin/operations/shared/OpsBriefing";

export interface AccountScore {
  clientId: number;
  name: string;
  tier: string;
  status: string;
  mrr: number;
  score: number;
  grade: "A" | "B" | "C" | "D";
  flags: string[];
  strengths: string[];
  nextAction: string | null;
  nextActionDue: string | null;
  retainerCount: number;
  requestCount: number;
  projectCount: number;
  renewalDate: string | null;
  hasAutoRenew: boolean;
}

export interface LicensingDeliverable {
  id: string;
  title: string;
  clientName: string;
  category: string;
  status: string | null;
}

export interface WhiteSpaceOpportunity {
  clientId: number;
  name: string;
  tier: string;
  mrr: number;
  nextAction: string | null;
}

export interface AccountsScreenProps {
  dateDisplay: string;
  timeDisplay: string;
  expansionScore: number;
  expansionCandidatesCount: number;
  activeWithMRRCount: number;
  kpis: Array<{
    label: string;
    value: string;
    sub?: string;
    alert?: boolean;
  }>;
  sortedScores: AccountScore[];
  founderAttention: AccountScore[];
  retainerGrowth: AccountScore[];
  whiteSpace: WhiteSpaceOpportunity[];
  renewalWatch: AccountScore[];
  keyRelationships: AccountScore[];
  licensingDeliverables: LicensingDeliverable[];
  flagshipClientNames: string[];
  topAccountsByMRR: AccountScore[];
  concentration: {
    risk: "high" | "medium" | "low";
    top1Pct: number;
    top3Pct: number;
    top1Name: string;
    top1MRR: string;
  };
}

const TIER_LABEL: Record<string, string> = {
  flagship: "Flagship",
  growth: "Growth",
  maintenance: "Maintenance",
  internal: "Internal",
};

const STATUS_LABEL: Record<string, string> = {
  healthy: "Healthy",
  "needs-attention": "Needs Attention",
  "at-risk": "At Risk",
  paused: "Paused",
};

function badgeForGrade(grade: AccountScore["grade"]): KxdBadgeVariant {
  if (grade === "A") return "success";
  if (grade === "B") return "tier";
  if (grade === "C") return "warning";
  return "critical";
}

function badgeForStatus(status: string): KxdBadgeVariant {
  if (status === "healthy") return "success";
  if (status === "needs-attention") return "warning";
  if (status === "at-risk") return "critical";
  if (status === "paused") return "pending";
  return "default";
}

function badgeForConcentration(risk: "high" | "medium" | "low"): KxdBadgeVariant {
  if (risk === "high") return "critical";
  if (risk === "medium") return "warning";
  return "success";
}

export function AccountsScreen({
  dateDisplay,
  timeDisplay,
  expansionScore,
  expansionCandidatesCount,
  activeWithMRRCount,
  kpis,
  sortedScores,
  founderAttention,
  retainerGrowth,
  whiteSpace,
  renewalWatch,
  keyRelationships,
  licensingDeliverables,
  flagshipClientNames,
  topAccountsByMRR,
  concentration,
}: AccountsScreenProps) {
  return (
    <OperationsShell activeId="accounts">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Strategic Account Intelligence"
          title="Account Intelligence"
          lead={`${dateDisplay} · Loaded ${timeDisplay} · Live strategic signal mapping across client health, revenue concentration, renewal pressure, and expansion opportunity.`}
        />

        <div className="kxd-os-ops-hero-row">
          <KxdSurface variant="glass" className="p-6">
            <p className="kxd-os-section__label">Expansion Opportunity Score</p>
            <p className="kxd-os-headline mt-3">{expansionScore}%</p>
            <p className="kxd-os-metric__sub mt-3">
              {expansionCandidatesCount} account
              {expansionCandidatesCount === 1 ? "" : "s"} with untapped potential
              across {activeWithMRRCount} retainer relationships.
            </p>
          </KxdSurface>
        </div>

        <OpsKpiStrip items={kpis} />

        <KxdSection label="Strategic Account Score" className="kxd-os-ops-section">
          <OpsSectionHead
            label="Ranked by Composite Score"
            count={sortedScores.length}
            href="/admin/collections/clients"
            linkText="Manage Clients →"
          />
          {sortedScores.length === 0 ? (
            <OpsEmpty message="No active clients found. Add client records to begin scoring." />
          ) : (
            <KxdTable>
              <KxdTableHead>
                <KxdTableRow>
                  {["Client", "Tier / Status", "Score", "MRR", "Signals"].map((heading) => (
                    <KxdTableHeaderCell key={heading}>{heading}</KxdTableHeaderCell>
                  ))}
                </KxdTableRow>
              </KxdTableHead>
              <KxdTableBody>
                {sortedScores.map((account) => (
                  <KxdTableRow key={account.clientId}>
                    <KxdTableCell primary>
                      <Link
                        href={`/admin/collections/clients/${account.clientId}`}
                        className="kxd-os-ops-link-row"
                      >
                        {account.name}
                      </Link>
                      <p className="kxd-os-ops-table-meta">
                        {account.projectCount} projects · {account.requestCount} requests ·{" "}
                        {account.retainerCount} retainers
                      </p>
                    </KxdTableCell>
                    <KxdTableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <KxdBadge variant="tier">
                          {TIER_LABEL[account.tier] ?? account.tier}
                        </KxdBadge>
                        <KxdBadge variant={badgeForStatus(account.status)}>
                          {STATUS_LABEL[account.status] ?? account.status}
                        </KxdBadge>
                      </div>
                    </KxdTableCell>
                    <KxdTableCell>
                      <div className="flex items-center gap-3">
                        <KxdBadge variant={badgeForGrade(account.grade)}>{account.grade}</KxdBadge>
                        <span className="kxd-os-body">{account.score}/100</span>
                      </div>
                    </KxdTableCell>
                    <KxdTableCell>{Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(account.mrr)}</KxdTableCell>
                    <KxdTableCell>
                      {account.flags.length > 0 ? (
                        <p className="kxd-os-meta">{account.flags.slice(0, 2).join(" · ")}</p>
                      ) : account.strengths.length > 0 ? (
                        <p className="kxd-os-meta">{account.strengths.slice(0, 2).join(" · ")}</p>
                      ) : (
                        <p className="kxd-os-meta">No additional signals</p>
                      )}
                    </KxdTableCell>
                  </KxdTableRow>
                ))}
              </KxdTableBody>
            </KxdTable>
          )}
        </KxdSection>

        <div className="mb-10 grid gap-6 lg:grid-cols-2">
          <KxdSection label="Revenue Concentration Analysis" className="mb-0">
            <OpsCard>
              <div className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="kxd-os-section__label">Portfolio Risk</p>
                  <OpsStatusBadge
                    variant={badgeForConcentration(concentration.risk)}
                    label={`${concentration.risk.toUpperCase()} RISK`}
                  />
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <KxdMetric
                    label="Top Client Share"
                    value={`${concentration.top1Pct}%`}
                    sub={concentration.top1Name}
                  />
                  <KxdMetric
                    label="Top Three Share"
                    value={`${concentration.top3Pct}%`}
                    sub="of total MRR"
                  />
                  <KxdMetric
                    label="Top Client MRR"
                    value={concentration.top1MRR}
                    sub="monthly"
                  />
                </div>
              </div>
            </OpsCard>
          </KxdSection>

          <KxdSection label="MRR By Account" className="mb-0">
            <OpsCard>
              {topAccountsByMRR.length === 0 ? (
                <KxdEmptyState title="No retainer revenue recorded." />
              ) : (
                topAccountsByMRR.slice(0, 8).map((account) => (
                  <OpsListRow
                    key={account.clientId}
                    href={`/admin/collections/clients/${account.clientId}`}
                  >
                    <div className="kxd-os-ops-list-row__main">
                      <p className="kxd-os-ops-list-row__title">{account.name}</p>
                      <p className="kxd-os-ops-list-row__meta">
                        {TIER_LABEL[account.tier] ?? account.tier}
                      </p>
                    </div>
                    <p className="kxd-os-body">
                      {Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      }).format(account.mrr)}
                    </p>
                  </OpsListRow>
                ))
              )}
            </OpsCard>
          </KxdSection>
        </div>

        <div className="mb-10 grid gap-6 lg:grid-cols-2">
          <KxdSection label="Founder Attention Required" className="mb-0">
            <OpsCard>
              {founderAttention.length === 0 ? (
                <KxdEmptyState title="All accounts clear. No founder intervention required." />
              ) : (
                founderAttention.map((account) => (
                  <OpsListRow
                    key={account.clientId}
                    href={`/admin/collections/clients/${account.clientId}`}
                  >
                    <div className="kxd-os-ops-list-row__main">
                      <p className="kxd-os-ops-list-row__title">{account.name}</p>
                      <p className="kxd-os-ops-list-row__meta">
                        {account.flags.join(" · ") || "Review relationship signal"}
                      </p>
                    </div>
                    <KxdBadge variant={badgeForStatus(account.status)}>
                      {STATUS_LABEL[account.status] ?? account.status}
                    </KxdBadge>
                  </OpsListRow>
                ))
              )}
            </OpsCard>
          </KxdSection>

          <KxdSection label="Retainer Growth Opportunities" className="mb-0">
            <OpsCard>
              {retainerGrowth.length === 0 ? (
                <KxdEmptyState title="No retainer growth gaps against current tier benchmarks." />
              ) : (
                retainerGrowth.map((account) => (
                  <OpsListRow
                    key={account.clientId}
                    href={`/admin/collections/clients/${account.clientId}`}
                  >
                    <div className="kxd-os-ops-list-row__main">
                      <p className="kxd-os-ops-list-row__title">{account.name}</p>
                      <p className="kxd-os-ops-list-row__meta">
                        {TIER_LABEL[account.tier] ?? account.tier}
                      </p>
                    </div>
                    <p className="kxd-os-body">
                      {Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      }).format(account.mrr)}
                    </p>
                  </OpsListRow>
                ))
              )}
            </OpsCard>
          </KxdSection>
        </div>

        <KxdSection label="Renewal Watch" className="kxd-os-ops-section">
          {renewalWatch.length === 0 ? (
            <KxdEmptyState title="No retainer renewals inside the next 60 days." />
          ) : (
            <KxdTable>
              <KxdTableHead>
                <KxdTableRow>
                  {["Client", "Tier", "MRR", "Renewal", "Contract"].map((heading) => (
                    <KxdTableHeaderCell key={heading}>{heading}</KxdTableHeaderCell>
                  ))}
                </KxdTableRow>
              </KxdTableHead>
              <KxdTableBody>
                {renewalWatch.map((account) => (
                  <KxdTableRow key={account.clientId}>
                    <KxdTableCell primary>
                      <Link
                        href={`/admin/collections/clients/${account.clientId}`}
                        className="kxd-os-ops-link-row"
                      >
                        {account.name}
                      </Link>
                    </KxdTableCell>
                    <KxdTableCell>{TIER_LABEL[account.tier] ?? account.tier}</KxdTableCell>
                    <KxdTableCell>
                      {Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      }).format(account.mrr)}
                    </KxdTableCell>
                    <KxdTableCell>{account.renewalDate ?? "—"}</KxdTableCell>
                    <KxdTableCell>
                      <KxdBadge variant={account.hasAutoRenew ? "success" : "warning"}>
                        {account.hasAutoRenew ? "Auto-Renew" : "Manual Renewal"}
                      </KxdBadge>
                    </KxdTableCell>
                  </KxdTableRow>
                ))}
              </KxdTableBody>
            </KxdTable>
          )}
        </KxdSection>

        <div className="grid gap-6 lg:grid-cols-2">
          <KxdSection label="White Space Opportunities" className="mb-0">
            <OpsCard>
              {whiteSpace.length === 0 ? (
                <KxdEmptyState title="No white space detected. Every retainer has active scope." />
              ) : (
                whiteSpace.map((client) => (
                  <OpsListRow
                    key={client.clientId}
                    href={`/admin/collections/clients/${client.clientId}`}
                  >
                    <div className="kxd-os-ops-list-row__main">
                      <p className="kxd-os-ops-list-row__title">{client.name}</p>
                      <p className="kxd-os-ops-list-row__meta">
                        {client.nextAction ?? "No next action defined"}
                      </p>
                    </div>
                    <KxdBadge variant="opportunity">
                      {Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      }).format(client.mrr)}
                    </KxdBadge>
                  </OpsListRow>
                ))
              )}
            </OpsCard>
          </KxdSection>

          <KxdSection label="Licensing Opportunities" className="mb-0">
            <OpsCard>
              {flagshipClientNames.length === 0 ? (
                <KxdEmptyState title="No flagship clients are available for licensing analysis." />
              ) : licensingDeliverables.length === 0 ? (
                <KxdEmptyState
                  title="No licensing-ready deliverables identified."
                  description={`Flagship accounts on file: ${flagshipClientNames.join(", ")}`}
                />
              ) : (
                licensingDeliverables.slice(0, 9).map((deliverable) => (
                  <OpsListRow key={deliverable.id}>
                    <div className="kxd-os-ops-list-row__main">
                      <p className="kxd-os-ops-list-row__title">{deliverable.title}</p>
                      <p className="kxd-os-ops-list-row__meta">{deliverable.clientName}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <KxdBadge variant="tier">{deliverable.category}</KxdBadge>
                      {deliverable.status ? (
                        <KxdBadge variant="status">{deliverable.status}</KxdBadge>
                      ) : null}
                    </div>
                  </OpsListRow>
                ))
              )}
            </OpsCard>
          </KxdSection>
        </div>

        <KxdSection label="Key Relationship Tracker" className="kxd-os-ops-section">
          {keyRelationships.length === 0 ? (
            <KxdEmptyState title="No active clients found." />
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {keyRelationships.map((account) => (
                <KxdSurface key={account.clientId} variant="glass" className="p-6">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/admin/collections/clients/${account.clientId}`}
                        className="kxd-os-ops-link-row"
                      >
                        {account.name}
                      </Link>
                      <p className="kxd-os-meta mt-2">
                        {TIER_LABEL[account.tier] ?? account.tier} ·{" "}
                        {STATUS_LABEL[account.status] ?? account.status}
                      </p>
                    </div>
                    <KxdBadge variant={badgeForGrade(account.grade)}>
                      Grade {account.grade} · {account.score}
                    </KxdBadge>
                  </div>
                  {account.nextAction ? (
                    <p className="kxd-os-body">{account.nextAction}</p>
                  ) : (
                    <p className="kxd-os-meta">No next action defined</p>
                  )}
                  {account.nextActionDue ? (
                    <p className="kxd-os-meta mt-2">Due {account.nextActionDue}</p>
                  ) : null}
                </KxdSurface>
              ))}
            </div>
          )}
        </KxdSection>
      </KxdPage>
    </OperationsShell>
  );
}
