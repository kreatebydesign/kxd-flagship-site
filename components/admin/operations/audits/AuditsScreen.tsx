import Link from "next/link";
import {
  KxdBadge,
  KxdEmptyState,
  KxdMetric,
  KxdPage,
  KxdSection,
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
import { AUDIT_STATUS_LABEL } from "@/lib/website-audit/scoring";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AuditDoc = Record<string, any>;

export interface AuditsScreenProps {
  audits: AuditDoc[];
  total: number;
  newLeads: number;
  qualified: number;
  closedWon: number;
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

function auditStatusVariant(status: string): KxdBadgeVariant {
  switch (status) {
    case "new-lead":
      return "status";
    case "contacted":
      return "warning";
    case "qualified":
      return "tier";
    case "proposal-sent":
      return "priority";
    case "closed-won":
      return "success";
    case "closed-lost":
      return "pending";
    default:
      return "default";
  }
}

export function AuditsScreen({
  audits,
  total,
  newLeads,
  qualified,
  closedWon,
}: AuditsScreenProps) {
  const kpis = [
    { label: "Total Audits", value: String(total) },
    { label: "New Leads", value: String(newLeads) },
    { label: "Qualified Leads", value: String(qualified) },
    { label: "Closed Won", value: String(closedWon) },
  ];

  return (
    <OperationsShell activeId="audits">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Website Auditor"
          title="Audit Lead Desk"
          lead="Public website audit submissions — scores, grades, and pipeline status for KXD sales follow-up."
        />

        <div className="kxd-os-ops-kpi-grid">
          {kpis.map((kpi) => (
            <KxdMetric key={kpi.label} label={kpi.label} value={kpi.value} />
          ))}
        </div>

        <div className="kxd-os-ops-section-head">
          <KxdSection label="All Audits" />
          <Link href="/admin/collections/website-audits" className="kxd-os-link-quiet">
            Payload →
          </Link>
        </div>

        {audits.length === 0 ? (
          <KxdEmptyState
            title="No audits yet"
            description="Share /website-audit to generate leads."
          />
        ) : (
          <KxdTable>
            <KxdTableHead>
              <KxdTableRow>
                {["Company", "Website", "Score", "Status", "Date"].map((heading) => (
                  <KxdTableHeaderCell key={heading}>{heading}</KxdTableHeaderCell>
                ))}
              </KxdTableRow>
            </KxdTableHead>
            <KxdTableBody>
              {audits.map((audit) => {
                const status = String(audit.status ?? "new-lead");
                return (
                  <KxdTableRow key={audit.id as number}>
                    <KxdTableCell primary>
                      <Link
                        href={`/admin/collections/website-audits/${audit.id}`}
                        className="kxd-os-ops-link-row"
                      >
                        {audit.company || audit.name || "—"}
                      </Link>
                      {audit.email ? (
                        <p className="kxd-os-ops-table-meta">{audit.email as string}</p>
                      ) : null}
                    </KxdTableCell>
                    <KxdTableCell>
                      {audit.website ? (
                        <a
                          href={audit.website as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="kxd-os-ops-link-row kxd-os-ops-link-row--external"
                        >
                          {audit.website as string}
                        </a>
                      ) : (
                        "—"
                      )}
                    </KxdTableCell>
                    <KxdTableCell>
                      <span className="kxd-os-ops-score">
                        {audit.overallScore as number}{" "}
                        <span className="kxd-os-ops-score__grade">{audit.grade as string}</span>
                      </span>
                    </KxdTableCell>
                    <KxdTableCell>
                      <KxdBadge variant={auditStatusVariant(status)}>
                        {AUDIT_STATUS_LABEL[status] ?? status}
                      </KxdBadge>
                    </KxdTableCell>
                    <KxdTableCell>
                      <p className="kxd-os-meta">{fmtDate(audit.createdAt as string)}</p>
                      <Link
                        href={`/website-audit/results/${audit.id}`}
                        className="kxd-os-ops-link-row kxd-os-ops-link-row--inline"
                      >
                        Public report →
                      </Link>
                    </KxdTableCell>
                  </KxdTableRow>
                );
              })}
            </KxdTableBody>
          </KxdTable>
        )}
      </KxdPage>
    </OperationsShell>
  );
}
