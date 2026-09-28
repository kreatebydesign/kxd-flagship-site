import Link from "next/link";
import { KxdEmptyState, KxdPage } from "@/components/os";
import { ClientHqPageHero } from "./ClientHqPageHero";
import { monthLabel } from "@/lib/reporting/templates";
import type { CuratedLeadershipReportListItem } from "@/lib/ces/leadership-report";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReportDoc = Record<string, any>;

export function ReportsScreen({
  reports,
  filterYear,
  clientName,
  curatedLeadershipReports = [],
}: {
  reports: ReportDoc[];
  filterYear?: number;
  clientName: string;
  curatedLeadershipReports?: CuratedLeadershipReportListItem[];
}) {
  const filtered = filterYear
    ? reports.filter((r) => Number(r.reportingYear) === filterYear)
    : reports;

  const curated = filterYear
    ? curatedLeadershipReports.filter((r) =>
        r.reportDateIso.startsWith(String(filterYear)),
      )
    : curatedLeadershipReports;

  const years = [
    ...new Set([
      ...reports.map((r) => Number(r.reportingYear)),
      ...curatedLeadershipReports
        .map((r) => Number(r.reportDateIso.slice(0, 4)))
        .filter((y) => Number.isFinite(y)),
    ]),
  ].sort((a, b) => b - a);

  const empty = curated.length === 0 && filtered.length === 0;

  return (
    <KxdPage className="kxd-os-page--ops">
      <ClientHqPageHero
        eyebrow="Reports"
        title="Monthly reports"
        lead={`Prepared by KXD for ${clientName}. Each published report stays private to this business.`}
      />

      <p className="kxd-os-meta" style={{ marginBottom: "1.25rem" }}>
        Viewing reports for <strong>{clientName}</strong>
      </p>

      {years.length > 1 ? (
        <nav
          aria-label="Filter reports by year"
          style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}
        >
          <Link href="/portal/reports" className="kxd-os-btn kxd-os-btn--ghost">
            All years
          </Link>
          {years.map((y) => (
            <Link key={y} href={`/portal/reports?year=${y}`} className="kxd-os-btn kxd-os-btn--ghost">
              {y}
            </Link>
          ))}
        </nav>
      ) : null}

      {empty ? (
        <KxdEmptyState
          title="Monthly reports will appear here"
          description="As KXD finalizes each month’s report for this business, it will be published to this secure space. Nothing is missing from your login — the first report simply has not been published yet."
        />
      ) : (
        <div className="kxd-os-card-list" role="list" aria-label={`Published reports for ${clientName}`}>
          {curated.map((r) => (
            <Link
              key={`leadership-${r.id}`}
              href={r.href}
              className="kxd-os-card kxd-os-card--link"
              style={{ display: "block", marginBottom: "0.65rem", textDecoration: "none" }}
              role="listitem"
            >
              <p className="kxd-os-card__title">{r.title}</p>
              <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
                {r.typeLabel} · {r.periodLabel}
              </p>
              <p className="kxd-os-body" style={{ marginTop: "0.5rem" }}>
                {r.summary}
              </p>
            </Link>
          ))}
          {filtered.map((r) => (
            <Link
              key={r.id as number}
              href={`/portal/reports/${r.id}`}
              className="kxd-os-card kxd-os-card--link"
              style={{ display: "block", marginBottom: "0.65rem", textDecoration: "none" }}
              role="listitem"
            >
              <p className="kxd-os-card__title">{String(r.title ?? "Executive Report")}</p>
              <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
                {monthLabel(Number(r.reportingMonth), Number(r.reportingYear))}
              </p>
              {r.executiveSummary ? (
                <p className="kxd-os-body" style={{ marginTop: "0.5rem" }}>
                  {String(r.executiveSummary).slice(0, 160)}…
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      )}

      <p style={{ marginTop: "1.5rem" }}>
        <Link href="/portal/analytics" className="kxd-os-link-quiet">
          View Google performance
        </Link>
        {" · "}
        <Link href="/portal/deliverables" className="kxd-os-link-quiet">
          View KXD Work
        </Link>
      </p>
    </KxdPage>
  );
}
