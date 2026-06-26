import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsEmpty,
  OpsFocusPill,
  OpsKpiStrip,
  OpsListRow,
  OpsSectionHead,
  OpsStatusBadge,
} from "@/components/admin/operations/shared/OpsBriefing";
import {
  KxdBadge,
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

// ── Types ─────────────────────────────────────────────────────────────────────

export type ClientDoc = {
  id: number;
  name: string;
  slug?: string;
  status?: string;
  brandTier?: string;
  monthlyRetainerAmount?: number | null;
  billingDay?: number | null;
  nextBillingDate?: string | null;
  relationshipStatus?: string;
  nextAction?: string | null;
  nextActionDueDate?: string | null;
};

export type RetainerDoc = {
  id: number;
  client?: number | ClientDoc | null;
  retainerName?: string;
  monthlyAmount?: number | null;
  billingCadence?: string;
  billingStatus?: string;
  billingDay?: number | null;
  autoRenew?: boolean;
  startDate?: string | null;
  renewalDate?: string | null;
  nextInvoiceDate?: string | null;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  scopeSummary?: string | null;
};

export type ProjectDoc = {
  id: number;
  client?: number | ClientDoc | null;
  projectName?: string;
  projectType?: string;
  status?: string;
  priority?: string;
  targetLaunchDate?: string | null;
  nextAction?: string | null;
  liveUrl?: string | null;
};

export type DeliverableDoc = {
  id: number;
  client?: number | ClientDoc | null;
  relatedProject?: number | ProjectDoc | null;
  title?: string;
  month?: number | null;
  year?: number | null;
  category?: string;
  status?: string;
  dueDate?: string | null;
  owner?: string | null;
};

export type RequestDoc = {
  id: number;
  client?: number | ClientDoc | null;
  relatedProject?: number | ProjectDoc | null;
  requestTitle?: string;
  requestType?: string;
  status?: string;
  priority?: string;
  requestedBy?: string | null;
  dueDate?: string | null;
};

export type FlaggedClient = ClientDoc & { issues: string[] };

export type CommandKpiItem = {
  label: string;
  value: string;
  sub: string;
  delta: string;
  alert: boolean;
};

export interface CommandScreenProps {
  today: string;
  monthName: string;
  currentYear: number;
  kpis: CommandKpiItem[];
  flaggedClients: FlaggedClient[];
  tierRevenueEntries: [string, number][];
  totalMRR: number;
  overdueRetainers: RetainerDoc[];
  upcomingInvoices: RetainerDoc[];
  allRetainersCount: number;
  clientsNeedingAction: ClientDoc[];
  monthDeliverables: DeliverableDoc[];
  sortedRequests: RequestDoc[];
  activeProjects: ProjectDoc[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clientName(c: number | ClientDoc | null | undefined): string {
  if (!c) return "—";
  if (typeof c === "object") return c.name || "—";
  return `Client #${c}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function isPast(iso: string | null | undefined): boolean {
  if (!iso) return false;
  try {
    return new Date(iso) < new Date();
  } catch {
    return false;
  }
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  try {
    const diff = new Date(iso).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

const TIER_LABELS: Record<string, string> = {
  flagship: "Flagship",
  growth: "Growth",
  maintenance: "Maintenance",
  internal: "Internal",
  other: "Other",
};

const STATUS_BADGE: Record<string, { label: string; variant: KxdBadgeVariant }> = {
  healthy: { label: "Healthy", variant: "success" },
  "needs-attention": { label: "Needs Attention", variant: "warning" },
  "at-risk": { label: "At Risk", variant: "critical" },
  "not-started": { label: "Not Started", variant: "status" },
  "in-progress": { label: "In Progress", variant: "warning" },
  "waiting-on-client": { label: "Waiting", variant: "pending" },
  complete: { label: "Complete", variant: "success" },
  blocked: { label: "Blocked", variant: "critical" },
  current: { label: "Current", variant: "success" },
  active: { label: "Active", variant: "success" },
  upcoming: { label: "Upcoming", variant: "status" },
  paused: { label: "Paused", variant: "default" },
  overdue: { label: "Overdue", variant: "critical" },
  ended: { label: "Ended", variant: "default" },
  planning: { label: "Planning", variant: "status" },
  review: { label: "Review", variant: "pending" },
  new: { label: "New", variant: "status" },
  triaged: { label: "Triaged", variant: "status" },
  declined: { label: "Declined", variant: "default" },
};

const PRIO_CLASS: Record<string, string> = {
  urgent: "kxd-os-ops-priority-bar--urgent",
  high: "kxd-os-ops-priority-bar--high",
  normal: "",
  low: "",
};

function getStatusBadge(status: string | null | undefined): { label: string; variant: KxdBadgeVariant } {
  if (!status) return { label: "Unknown", variant: "default" };
  return STATUS_BADGE[status] ?? { label: status, variant: "default" };
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  const badge = getStatusBadge(status);
  return <OpsStatusBadge label={badge.label} variant={badge.variant} />;
}

function relationshipBarClass(status: string | null | undefined): string {
  if (status === "at-risk") return "kxd-os-ops-priority-bar--urgent";
  if (status === "needs-attention") return "kxd-os-ops-priority-bar--high";
  return "";
}

function issueTone(issue: string): "critical" | "warning" {
  if (issue.includes("overdue") || issue.includes("Urgent")) return "critical";
  return "warning";
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function CommandScreen({
  today,
  monthName,
  currentYear,
  kpis,
  flaggedClients,
  tierRevenueEntries,
  totalMRR,
  overdueRetainers,
  upcomingInvoices,
  allRetainersCount,
  clientsNeedingAction,
  monthDeliverables,
  sortedRequests,
  activeProjects,
}: CommandScreenProps) {
  return (
    <OperationsShell activeId="command" dateDisplay={today}>
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Operations"
          title="Operations Suite"
          lead={`${today} · Live Payload data across clients, retainers, deliverables, and requests`}
        />

        <KxdSection label="Executive Summary" className="kxd-os-ops-section">
          <OpsKpiStrip
            items={kpis.map((kpi) => ({
              label: kpi.label,
              value: kpi.value,
              sub: `${kpi.sub} · ${kpi.delta}`,
              alert: kpi.alert,
            }))}
          />
        </KxdSection>

        <KxdSection label="Client Health Signals" className="kxd-os-ops-section">
          <OpsSectionHead
            label="Flagged Accounts"
            count={flaggedClients.length}
            href="/admin/collections/clients"
            linkText="Manage Clients →"
          />
          {flaggedClients.length === 0 ? (
            <OpsFocusPill
              tone="clear"
              label="All Clear"
              description="All client health signals clear — no flags detected."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {flaggedClients.map((client) => {
                const hasCritical = client.issues.some(
                  (issue) => issue.includes("overdue") || issue.includes("Urgent"),
                );
                return (
                  <KxdSurface
                    key={client.id}
                    variant="glass"
                    className={`kxd-os-ops-briefing-surface p-5${hasCritical ? " kxd-os-ops-alert kxd-os-ops-alert--error" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="kxd-os-ops-list-row__title">{client.name}</p>
                      {client.brandTier ? (
                        <KxdBadge variant="tier">
                          {TIER_LABELS[client.brandTier] ?? client.brandTier}
                        </KxdBadge>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-col gap-1.5">
                      {client.issues.map((issue) => (
                        <p
                          key={issue}
                          className={`kxd-os-meta${issueTone(issue) === "critical" ? " [color:var(--kxd-os-critical)]" : " [color:var(--kxd-os-warning)]"}`}
                        >
                          {issue}
                        </p>
                      ))}
                    </div>
                  </KxdSurface>
                );
              })}
            </div>
          )}
        </KxdSection>

        <div className="mb-10 grid gap-8 lg:grid-cols-[1fr_22rem] xl:gap-10">
          <KxdSection label="Revenue Intelligence" className="mb-0">
            <OpsSectionHead
              label="Retainer Revenue"
              href="/admin/collections/retainers"
              linkText="Manage Retainers →"
            />

            <OpsCard>
              <div className="border-b border-[var(--kxd-os-border-divider)] p-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="kxd-os-section__label">Monthly Recurring Revenue</p>
                    <p
                      className={`kxd-os-display mt-3 text-3xl${totalMRR > 0 ? " [color:var(--kxd-os-gold)]" : ""}`}
                    >
                      {totalMRR > 0 ? fmtMoney(totalMRR) : "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {overdueRetainers.length > 0 ? <StatusBadge status="overdue" /> : null}
                    {upcomingInvoices.length > 0 ? (
                      <p className="kxd-os-meta">
                        {upcomingInvoices.length} invoice
                        {upcomingInvoices.length !== 1 ? "s" : ""} due within 14d
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              {tierRevenueEntries.length > 0 ? (
                <div className="p-6">
                  <p className="kxd-os-section__label mb-4">Revenue by Client Tier</p>
                  <div className="flex flex-col gap-4">
                    {tierRevenueEntries.map(([tier, amount]) => {
                      const pct = totalMRR > 0 ? Math.round((amount / totalMRR) * 100) : 0;
                      return (
                        <div key={tier} className="flex items-center gap-3">
                          <p className="kxd-os-meta w-24 shrink-0">
                            {TIER_LABELS[tier] ?? tier}
                          </p>
                          <div className="kxd-os-ops-progress__track min-w-0 flex-1">
                            <div
                              className="kxd-os-ops-progress__fill"
                              style={{
                                width: `${pct}%`,
                                background:
                                  tier === "flagship"
                                    ? "var(--kxd-os-gold)"
                                    : "rgba(168, 180, 200, 0.55)",
                              }}
                            />
                          </div>
                          <p className="kxd-os-body w-20 shrink-0 text-right">{fmtMoney(amount)}</p>
                          <p className="kxd-os-meta w-10 shrink-0 text-right">{pct}%</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </OpsCard>

            {upcomingInvoices.length > 0 ? (
              <div className="mt-6">
                <OpsSectionHead label="Upcoming Invoices — Next 14 Days" />
                <OpsCard>
                  {upcomingInvoices.map((retainer) => {
                    const days = daysUntil(retainer.nextInvoiceDate);
                    return (
                      <OpsListRow key={retainer.id}>
                        <div className="kxd-os-ops-list-row__main min-w-0">
                          <p className="kxd-os-ops-list-row__title truncate">
                            {clientName(retainer.client)}
                          </p>
                          <p className="kxd-os-ops-list-row__meta">
                            {retainer.retainerName ?? "Retainer"} ·{" "}
                            {fmtDateShort(retainer.nextInvoiceDate)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          {days !== null ? (
                            <p
                              className={`kxd-os-meta${days <= 3 ? " [color:var(--kxd-os-critical)]" : ""}`}
                            >
                              {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
                            </p>
                          ) : null}
                          <p className="kxd-os-body">{fmtMoney(retainer.monthlyAmount)}</p>
                          <StatusBadge status={retainer.billingStatus ?? "active"} />
                        </div>
                      </OpsListRow>
                    );
                  })}
                </OpsCard>
              </div>
            ) : null}

            {overdueRetainers.length > 0 ? (
              <div className="mt-6">
                <OpsSectionHead label="Overdue Retainers" />
                <OpsCard className="kxd-os-ops-alert kxd-os-ops-alert--error">
                  {overdueRetainers.map((retainer) => (
                    <OpsListRow key={retainer.id}>
                      <div className="kxd-os-ops-list-row__main min-w-0">
                        <p className="kxd-os-ops-list-row__title truncate">
                          {clientName(retainer.client)}
                        </p>
                        <p className="kxd-os-ops-list-row__meta">
                          {retainer.retainerName ?? "Retainer"}
                          {retainer.nextInvoiceDate
                            ? ` · Was due ${fmtDateShort(retainer.nextInvoiceDate)}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <p className="kxd-os-body [color:var(--kxd-os-critical)]">
                          {fmtMoney(retainer.monthlyAmount)}
                        </p>
                        <StatusBadge status="overdue" />
                      </div>
                    </OpsListRow>
                  ))}
                </OpsCard>
              </div>
            ) : null}

            {allRetainersCount === 0 ? (
              <OpsEmpty message="No retainers configured yet." />
            ) : null}
          </KxdSection>

          <KxdSection label="Clients Requiring Action" className="mb-0">
            <OpsSectionHead
              label="Relationship Follow-Up"
              count={clientsNeedingAction.length}
              href="/admin/collections/clients"
              linkText="Manage Clients →"
            />
            {clientsNeedingAction.length === 0 ? (
              <OpsEmpty message="No clients flagged — all relationships healthy." />
            ) : (
              <OpsCard>
                {clientsNeedingAction.map((client) => (
                  <OpsListRow key={client.id}>
                    <span
                      className={`kxd-os-ops-priority-bar ${relationshipBarClass(client.relationshipStatus)}`}
                      aria-hidden="true"
                    />
                    <div className="kxd-os-ops-list-row__main min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="kxd-os-ops-list-row__title">{client.name}</p>
                        <StatusBadge status={client.relationshipStatus ?? "healthy"} />
                      </div>
                      {client.nextAction ? (
                        <p className="kxd-os-meta mt-1">{client.nextAction}</p>
                      ) : null}
                      {client.nextActionDueDate ? (
                        <p
                          className={`kxd-os-meta mt-1 uppercase tracking-wide${isPast(client.nextActionDueDate) ? " [color:var(--kxd-os-critical)]" : ""}`}
                        >
                          Due {fmtDate(client.nextActionDueDate)}
                          {isPast(client.nextActionDueDate) ? " · Overdue" : ""}
                        </p>
                      ) : null}
                    </div>
                  </OpsListRow>
                ))}
              </OpsCard>
            )}
          </KxdSection>
        </div>

        <KxdSection
          label={`${monthName} ${currentYear} — Deliverables`}
          className="kxd-os-ops-section"
        >
          <OpsSectionHead
            label="Monthly Deliverables"
            count={monthDeliverables.length}
            href="/admin/collections/monthly-deliverables"
            linkText="Manage Deliverables →"
          />
          {monthDeliverables.length === 0 ? (
            <OpsEmpty message={`No deliverables logged for ${monthName} ${currentYear} yet.`} />
          ) : (
            <KxdTable>
              <KxdTableHead>
                <KxdTableRow>
                  {["Deliverable", "Client", "Category", "Status", "Due", "Owner"].map((heading) => (
                    <KxdTableHeaderCell key={heading}>{heading}</KxdTableHeaderCell>
                  ))}
                </KxdTableRow>
              </KxdTableHead>
              <KxdTableBody>
                {monthDeliverables.map((deliverable) => {
                  const status = getStatusBadge(deliverable.status ?? "not-started");
                  const duePast =
                    deliverable.dueDate &&
                    isPast(deliverable.dueDate) &&
                    deliverable.status !== "complete";
                  return (
                    <KxdTableRow key={deliverable.id}>
                      <KxdTableCell primary>{deliverable.title ?? "—"}</KxdTableCell>
                      <KxdTableCell>{clientName(deliverable.client)}</KxdTableCell>
                      <KxdTableCell className="capitalize">{deliverable.category ?? "—"}</KxdTableCell>
                      <KxdTableCell>
                        <OpsStatusBadge label={status.label} variant={status.variant} />
                      </KxdTableCell>
                      <KxdTableCell className={duePast ? "[color:var(--kxd-os-critical)]" : undefined}>
                        {fmtDate(deliverable.dueDate)}
                      </KxdTableCell>
                      <KxdTableCell>{deliverable.owner ?? "—"}</KxdTableCell>
                    </KxdTableRow>
                  );
                })}
              </KxdTableBody>
            </KxdTable>
          )}
        </KxdSection>

        <div className="grid gap-8 lg:grid-cols-2 xl:gap-10">
          <KxdSection label="Open Client Requests" className="mb-0">
            <OpsSectionHead
              label="Active Requests"
              count={sortedRequests.length}
              href="/admin/collections/client-requests"
              linkText="Manage Requests →"
            />
            {sortedRequests.length === 0 ? (
              <OpsEmpty message="No open requests — inbox clear." />
            ) : (
              <OpsCard>
                {sortedRequests.map((request) => {
                  const status = getStatusBadge(request.status ?? "new");
                  return (
                    <OpsListRow key={request.id}>
                      <span
                        className={`kxd-os-ops-priority-bar ${PRIO_CLASS[request.priority ?? "normal"]}`}
                        aria-hidden="true"
                      />
                      <div className="kxd-os-ops-list-row__main min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className="kxd-os-ops-list-row__title">{request.requestTitle ?? "—"}</p>
                          <OpsStatusBadge label={status.label} variant={status.variant} />
                        </div>
                        <p className="kxd-os-ops-list-row__meta">
                          {clientName(request.client)}
                          {request.requestType ? ` · ${request.requestType}` : ""}
                          {request.dueDate ? ` · Due ${fmtDate(request.dueDate)}` : ""}
                          {request.priority === "urgent"
                            ? " · Urgent"
                            : request.priority === "high"
                              ? " · High"
                              : ""}
                        </p>
                      </div>
                    </OpsListRow>
                  );
                })}
              </OpsCard>
            )}
          </KxdSection>

          <KxdSection label="Active Projects" className="mb-0">
            <OpsSectionHead
              label="In Delivery"
              count={activeProjects.length}
              href="/admin/collections/client-projects"
              linkText="Manage Projects →"
            />
            {activeProjects.length === 0 ? (
              <OpsEmpty message="No active projects in delivery." />
            ) : (
              <OpsCard>
                {activeProjects.map((project) => {
                  const status = getStatusBadge(project.status ?? "planning");
                  return (
                    <OpsListRow key={project.id}>
                      <span
                        className={`kxd-os-ops-priority-bar ${PRIO_CLASS[project.priority ?? "normal"]}`}
                        aria-hidden="true"
                      />
                      <div className="kxd-os-ops-list-row__main min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className="kxd-os-ops-list-row__title">{project.projectName ?? "—"}</p>
                          <OpsStatusBadge label={status.label} variant={status.variant} />
                        </div>
                        <p className="kxd-os-ops-list-row__meta">
                          {clientName(project.client)}
                          {project.projectType ? ` · ${project.projectType}` : ""}
                          {project.targetLaunchDate
                            ? ` · Launch ${fmtDate(project.targetLaunchDate)}`
                            : ""}
                        </p>
                        {project.nextAction ? (
                          <p className="kxd-os-meta mt-1 italic">→ {project.nextAction}</p>
                        ) : null}
                      </div>
                    </OpsListRow>
                  );
                })}
              </OpsCard>
            )}
          </KxdSection>
        </div>
      </KxdPage>
    </OperationsShell>
  );
}
