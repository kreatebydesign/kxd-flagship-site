import Link from "next/link";
import {
  KxdBadge,
  KxdEmptyState,
  KxdPage,
  KxdSection,
  KxdSurface,
} from "@/components/os";
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
    <OperationsShell activeId="clients" dateDisplay={dateDisplay}>
      <KxdPage className="kxd-os-page--portfolio">
        <header className="kxd-os-portfolio-hero">
          <p className="kxd-os-eyebrow">Client intelligence</p>
          <h1 className="kxd-os-headline kxd-os-headline--presence kxd-os-portfolio-hero__title">
            Client Portfolio
          </h1>
          <p className="kxd-os-portfolio-hero__lead">
            Executive visibility across active relationships, revenue, health, and next
            actions.
          </p>
        </header>

        <div className="kxd-os-portfolio-kpi-grid">
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
            <KxdSurface key={kpi.label} variant="glass" className="kxd-os-portfolio-kpi">
              <p className="kxd-os-metric__label">{kpi.label}</p>
              <p className="kxd-os-portfolio-kpi__value">{kpi.value}</p>
              <p className="kxd-os-metric__sub">{kpi.sub}</p>
            </KxdSurface>
          ))}
        </div>

        <div className="kxd-os-portfolio-overview-head">
          <KxdSection label="Relationships" description={overviewDescription} />
          <div className="kxd-os-portfolio-actions">
            <Link href="/admin/operations/client-import" className="kxd-os-btn kxd-os-btn--ghost">
              Import client
            </Link>
            <Link href="/admin/operations/client-launch" className="kxd-os-btn kxd-os-btn--primary">
              Launch client
            </Link>
            <Link
              href="/admin/collections/executive-client-profiles"
              className="kxd-os-link-quiet"
            >
              Edit profiles
            </Link>
          </div>
        </div>

        {rows.length === 0 ? (
          <KxdEmptyState
            title="No clients in portfolio"
            description="Seed clients or add records in Payload to begin building your executive roster."
          />
        ) : (
          <div className="kxd-os-portfolio-roster">
            {rows.map((row) => {
              const duplicateHint = duplicateWarnings.get(row.clientId);
              const priority = row.internalPriority
                ? EXECUTIVE_PRIORITY_LABEL[row.internalPriority]
                : null;
              const isCritical = row.internalPriority === "critical";

              return (
                <Link
                  key={row.clientId}
                  href={`/admin/operations/clients/${row.clientId}`}
                  className="kxd-os-portfolio-row--card"
                >
                  <div className="kxd-os-portfolio-row__grid">
                    <div>
                      <p className="kxd-os-portfolio-name">{row.name}</p>
                      <div className="kxd-os-portfolio-cell__meta">
                        <span className="kxd-os-meta">
                          {tierLabel(row)} · {statusLabel(row)}
                        </span>
                        {!row.hasExecutiveProfile && (
                          <KxdBadge variant="pending">Profile pending</KxdBadge>
                        )}
                        {isCritical && (
                          <KxdBadge variant="critical">{priority}</KxdBadge>
                        )}
                      </div>
                      {duplicateHint && (
                        <p className="kxd-os-portfolio-note">{duplicateHint}</p>
                      )}
                    </div>

                    <div className="kxd-os-portfolio-cell__stack">
                      <span className="kxd-os-caption">Monthly</span>
                      <span className="kxd-os-portfolio-revenue">
                        {fmtExecutiveMoney(row.monthlyRevenue)}
                      </span>
                      <span className="kxd-os-meta">
                        {fmtExecutiveMoney(row.potentialMonthlyRevenue)} potential
                      </span>
                    </div>

                    <div className="kxd-os-portfolio-cell__stack">
                      <span className="kxd-os-caption">Health</span>
                      <span className="kxd-os-portfolio-health">{row.healthScore ?? "—"}</span>
                    </div>

                    <div className="kxd-os-portfolio-cell__stack">
                      <span className="kxd-os-caption">Next action</span>
                      <span className="kxd-os-meta">{row.nextAction ?? "—"}</span>
                    </div>

                    <div className="kxd-os-portfolio-cell__stack">
                      <span className="kxd-os-caption">Priority</span>
                      {priority && !isCritical ? (
                        <span className="kxd-os-meta">{priority}</span>
                      ) : !priority ? (
                        <span className="kxd-os-meta">—</span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </KxdPage>
    </OperationsShell>
  );
}
