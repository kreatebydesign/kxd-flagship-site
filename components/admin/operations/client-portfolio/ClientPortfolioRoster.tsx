"use client";

import Link from "next/link";
import { KxdBadge } from "@/components/os";
import { getAttentionReasonsForRow } from "@/lib/client-portfolio/filter-rows";
import type { PortfolioRow } from "@/lib/client-portfolio/types";
import {
  EXECUTIVE_PRIORITY_LABEL,
  EXECUTIVE_STATUS_LABEL,
  EXECUTIVE_TIER_LABEL,
  fmtExecutiveMoney,
} from "@/lib/executive-client-profile";

function tierLabel(row: PortfolioRow): string {
  if (row.tier) return EXECUTIVE_TIER_LABEL[row.tier];
  if (row.brandTier) return row.brandTier.replace(/-/g, " ");
  return "—";
}

function statusLabel(row: PortfolioRow): string {
  if (row.relationshipStatus) return EXECUTIVE_STATUS_LABEL[row.relationshipStatus];
  return row.clientStatus ?? "—";
}

export function ClientPortfolioRoster({
  rows,
  duplicateWarnings,
  showAttentionReasons,
  portfolioTotal,
}: {
  rows: PortfolioRow[];
  duplicateWarnings: Readonly<Record<number, string>>;
  showAttentionReasons: boolean;
  portfolioTotal: number;
}) {
  if (portfolioTotal === 0) {
    return (
      <div className="kxd-founder-panel">
        <p className="kxd-founder-empty">
          No clients in the portfolio yet. Import a client or launch one from your playbook to
          begin.
        </p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="kxd-founder-panel">
        <p className="kxd-founder-empty">
          No clients match your search or filters. Try clearing filters or broadening your search.
        </p>
      </div>
    );
  }

  return (
    <div className="kxd-founder-clients__roster">
      {rows.map((row) => {
        const duplicateHint = duplicateWarnings[row.clientId];
        const priority = row.internalPriority
          ? EXECUTIVE_PRIORITY_LABEL[row.internalPriority]
          : null;
        const isCritical = row.internalPriority === "critical";
        const attentionReasons = showAttentionReasons
          ? getAttentionReasonsForRow(row, duplicateWarnings)
          : [];

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
              {attentionReasons.length > 0 ? (
                <ul
                  className="kxd-founder-clients__attention-reasons"
                  aria-label="Attention reasons"
                >
                  {attentionReasons.slice(0, 3).map((r) => (
                    <li key={r.code}>
                      <span className="kxd-founder-clients__attention-pill">{r.label}</span>
                    </li>
                  ))}
                  {attentionReasons.length > 3 ? (
                    <li>
                      <span className="kxd-founder-clients__attention-more">
                        +{attentionReasons.length - 3} more
                      </span>
                    </li>
                  ) : null}
                </ul>
              ) : null}
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
  );
}