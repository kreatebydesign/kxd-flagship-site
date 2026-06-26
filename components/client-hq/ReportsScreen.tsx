import Link from "next/link";
import { KxdEmptyState, KxdPage } from "@/components/os";
import { ClientHqPageHero } from "./ClientHqPageHero";
import { monthLabel } from "@/lib/reporting/templates";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReportDoc = Record<string, any>;

export function ReportsScreen({
  reports,
  filterYear,
}: {
  reports: ReportDoc[];
  filterYear?: number;
}) {
  const filtered = filterYear
    ? reports.filter((r) => Number(r.reportingYear) === filterYear)
    : reports;

  const years = [...new Set(reports.map((r) => Number(r.reportingYear)))].sort((a, b) => b - a);

  return (
    <KxdPage className="kxd-os-page--ops">
      <ClientHqPageHero
        eyebrow="Intelligence"
        title="Reports"
        lead="Monthly executive reports — prepared by KXD and published to your Client HQ."
      />

      {years.length > 1 ? (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <Link href="/portal/reports" className="kxd-os-btn kxd-os-btn--ghost">
            All years
          </Link>
          {years.map((y) => (
            <Link key={y} href={`/portal/reports?year=${y}`} className="kxd-os-btn kxd-os-btn--ghost">
              {y}
            </Link>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <KxdEmptyState
          title="No reports published yet"
          description="Your monthly executive reports will appear here once KXD publishes them."
        />
      ) : (
        <div className="kxd-os-card-list">
          {filtered.map((r) => (
            <Link
              key={r.id as number}
              href={`/portal/reports/${r.id}`}
              className="kxd-os-card kxd-os-card--link"
              style={{ display: "block", marginBottom: "0.65rem", textDecoration: "none" }}
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
    </KxdPage>
  );
}
