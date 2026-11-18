import Link from "next/link";
import { KxdBadge } from "@/components/os";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  EXECUTIVE_PRIORITY_LABEL,
  EXECUTIVE_STATUS_LABEL,
  EXECUTIVE_TIER_LABEL,
  fmtExecutiveMoney,
  type MergedExecutiveClientRow,
} from "@/lib/executive-client-profile";

function tierLabel(row: MergedExecutiveClientRow): string {
  if (row.tier) return EXECUTIVE_TIER_LABEL[row.tier];
  if (row.brandTier) return row.brandTier.replace(/-/g, " ");
  return "—";
}

function statusLabel(row: MergedExecutiveClientRow): string {
  if (row.relationshipStatus) return EXECUTIVE_STATUS_LABEL[row.relationshipStatus];
  return row.clientStatus ?? "—";
}

export interface ClientPortfolioScreenProps {
  dateDisplay: string;
  rows: MergedExecutiveClientRow[];
  withProfiles: number;
  activeCount: number;
  totalMRR: number;
  totalPotential: number;
  criticalCount: number;
  duplicateCount: number;
  duplicateWarnings: Map<number, string>;
}

export function ClientPortfolioScreen({
  dateDisplay,
  rows,
  withProfiles,
  activeCount,
  totalMRR,
  totalPotential,
  criticalCount,
  duplicateCount,
  duplicateWarnings,
}: ClientPortfolioScreenProps) {
  const overviewNotes = [
    criticalCount > 0 ? `${criticalCount} critical priority` : null,
    duplicateCount > 0
      ? `${duplicateCount} possible duplicate${duplicateCount === 1 ? "" : "s"} flagged`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const overviewDescription = overviewNotes
    ? `${rows.length} relationships in view. ${overviewNotes}.`
    : `${rows.length} relationships — revenue, health, and what matters next.`;

  return (
    <OperationsShell activeId="clients" dateDisplay={dateDisplay} showQuickActions={false}>
      <div className="kxd-founder-page kxd-founder-clients">
        <header className="kxd-founder-clients__header">
          <p className="kxd-founder-today__eyebrow">Clients</p>
          <h1 className="kxd-founder-clients__title">Portfolio</h1>
          <p className="kxd-founder-clients__lede">
            Active relationships, revenue, health, and what matters next.
          </p>
        </header>

        <div
          className="kxd-founder-today__metrics kxd-founder-clients__metrics"
          aria-label="Portfolio summary"
        >
          {[
            {
              label: "Portfolio coverage",
              value: `${withProfiles} / ${activeCount}`,
              sub: "Executive profiles among active clients",
            },
            {
              label: "Active relationships",
              value: String(activeCount),
              sub: `${rows.length} total in roster`,
            },
            {
              label: "Portfolio MRR",
              value: fmtExecutiveMoney(totalMRR),
              sub: "Tracked monthly revenue",
            },
            {
              label: "Growth potential",
              value: fmtExecutiveMoney(totalPotential),
              sub: "Estimated pipeline value",
            },
          ].map((kpi) => (
            <div key={kpi.label} className="kxd-founder-metric">
              <p className="kxd-founder-metric__label">{kpi.label}</p>
              <p className="kxd-founder-metric__value">{kpi.value}</p>
              {kpi.sub ? <p className="kxd-founder-metric__detail">{kpi.sub}</p> : null}
            </div>
          ))}
        </div>

        <div className="kxd-founder-clients__toolbar">
          <div className="kxd-founder-clients__toolbar-copy">
            <h2 className="kxd-founder-panel__title">Relationships</h2>
            <p className="kxd-founder-clients__toolbar-lede">{overviewDescription}</p>
          </div>
          <div className="kxd-founder-clients__actions">
            <Link href="/admin/operations/client-launch" className="kxd-founder-btn kxd-founder-btn--primary">
              Launch client
            </Link>
            <Link href="/admin/operations/client-import" className="kxd-founder-btn">
              Import client
            </Link>
            <Link href="/admin/operations/events" className="kxd-founder-btn">
              Events
            </Link>
            <Link
              href="/admin/collections/executive-client-profiles"
              className="kxd-founder-clients__quiet-link"
            >
              Edit profiles
            </Link>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="kxd-founder-panel">
            <p className="kxd-founder-empty">
              No clients in the portfolio yet. Import a client or launch one from your playbook to
              begin.
            </p>
          </div>
        ) : (
          <div className="kxd-founder-clients__roster">
            {rows.map((row) => {
              const duplicateHint = duplicateWarnings.get(row.clientId);
              const priority = row.internalPriority
                ? EXECUTIVE_PRIORITY_LABEL[row.internalPriority]
                : null;
              const isCritical = row.internalPriority === "critical";

              return (
                <article key={row.clientId} className="kxd-founder-clients__row">
                  <Link
                    href={`/admin/operations/clients/${row.clientId}`}
                    className="kxd-founder-clients__row-primary"
                  >
                    <p className="kxd-founder-clients__name">{row.name}</p>
                    <p className="kxd-founder-clients__meta">
                      {tierLabel(row)} · {statusLabel(row)}
                    </p>
                    <div className="kxd-founder-clients__badges">
                      {!row.hasExecutiveProfile && (
                        <KxdBadge variant="pending">Profile pending</KxdBadge>
                      )}
                      {isCritical && priority ? (
                        <KxdBadge variant="critical">{priority}</KxdBadge>
                      ) : null}
                    </div>
                    {duplicateHint ? (
                      <p className="kxd-founder-clients__note">{duplicateHint}</p>
                    ) : null}
                  </Link>

                  <dl className="kxd-founder-clients__facts">
                    <div>
                      <dt>Monthly</dt>
                      <dd>{fmtExecutiveMoney(row.monthlyRevenue)}</dd>
                    </div>
                    <div>
                      <dt>Health</dt>
                      <dd>{row.healthScore ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Next action</dt>
                      <dd>{row.nextAction ?? "—"}</dd>
                    </div>
                    {priority && !isCritical ? (
                      <div>
                        <dt>Priority</dt>
                        <dd>{priority}</dd>
                      </div>
                    ) : null}
                  </dl>

                  <nav className="kxd-founder-clients__row-actions" aria-label="Client shortcuts">
                    <Link
                      href={`/admin/operations/client-command/${row.clientId}`}
                      className="kxd-founder-clients__workspace-link"
                    >
                      Open workspace
                    </Link>
                    <Link
                      href={`/admin/operations/clients/${row.clientId}?tab=relationship`}
                      className="kxd-founder-clients__quiet-link"
                    >
                      Contacts and events
                    </Link>
                  </nav>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </OperationsShell>
  );
}
