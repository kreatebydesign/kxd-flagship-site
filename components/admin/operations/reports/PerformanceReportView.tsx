import type { ReactNode } from "react";
import {
  fmtReportCurrency,
  fmtReportNumber,
  fmtReportPercent,
} from "@/lib/reporting/performance-format";
import { STRATEGY_PRIORITY_LABELS } from "@/lib/reporting/performance-types";
import type { PerformanceReportViewModel } from "@/lib/reporting/performance-types";

function KpiCell({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`kxd-os-perf-report__kpi${highlight ? " kxd-os-perf-report__kpi--highlight" : ""}`}
    >
      <span className="kxd-os-perf-report__kpi-label">{label}</span>
      <span className="kxd-os-perf-report__kpi-value">{value}</span>
    </div>
  );
}

function HealthScoreBadge({ score, variant }: { score: number; variant: "cover" | "assessment" }) {
  const display = score.toFixed(1);
  return (
    <div
      className={`kxd-os-perf-report__health kxd-os-perf-report__health--${variant}`}
      aria-label={`Account health score ${display} out of 10`}
    >
      <span className="kxd-os-perf-report__health-label">Account Health</span>
      <div className="kxd-os-perf-report__health-scoreline">
        <span className="kxd-os-perf-report__health-value">{display}</span>
        <span className="kxd-os-perf-report__health-scale">/ 10</span>
      </div>
    </div>
  );
}

function PerformanceSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`kxd-os-perf-report__section ${className}`.trim()}>
      <div className="kxd-os-perf-report__section-head">
        <h3 className="kxd-os-perf-report__section-title">{title}</h3>
      </div>
      <div className="kxd-os-perf-report__section-body">{children}</div>
    </section>
  );
}

export function PerformanceReportView({ report }: { report: PerformanceReportViewModel }) {
  return (
    <article className="kxd-os-perf-report">
      <header className="kxd-os-perf-report__cover">
        <div className="kxd-os-perf-report__cover-top">
          <div className="kxd-os-perf-report__brand">
            <p className="kxd-os-perf-report__eyebrow">Kreate by Design</p>
            <p className="kxd-os-perf-report__cover-label">Performance Report</p>
          </div>
          {report.accountHealthScore != null ? (
            <HealthScoreBadge score={report.accountHealthScore} variant="cover" />
          ) : null}
        </div>

        <div className="kxd-os-perf-report__cover-hero">
          <h1 className="kxd-os-perf-report__client">{report.clientName}</h1>
          <p className="kxd-os-perf-report__title">{report.title}</p>
        </div>

        <dl className="kxd-os-perf-report__cover-meta">
          <div className="kxd-os-perf-report__meta-item">
            <dt className="kxd-os-perf-report__meta-label">Reporting Period</dt>
            <dd className="kxd-os-perf-report__meta-value">{report.periodLabel}</dd>
          </div>
          <div className="kxd-os-perf-report__meta-item">
            <dt className="kxd-os-perf-report__meta-label">Report Type</dt>
            <dd className="kxd-os-perf-report__meta-value">{report.reportTypeLabel}</dd>
          </div>
          <div className="kxd-os-perf-report__meta-item">
            <dt className="kxd-os-perf-report__meta-label">Prepared By</dt>
            <dd className="kxd-os-perf-report__meta-value">{report.preparedBy}</dd>
          </div>
        </dl>

        <div className="kxd-os-perf-report__cover-rule" aria-hidden="true" />
      </header>

      <div className="kxd-os-perf-report__content">
        {report.executiveSummary ? (
          <PerformanceSection title="Executive Summary" className="kxd-os-perf-report__section--lead">
            <p className="kxd-os-perf-report__prose kxd-os-perf-report__prose--lead">
              {report.executiveSummary}
            </p>
          </PerformanceSection>
        ) : null}

        {report.campaignPerformance.length > 0 ? (
          <PerformanceSection title="Campaign Performance">
            <div className="kxd-os-perf-report__cards">
              {report.campaignPerformance.map((row) => (
                <div key={row.campaignName} className="kxd-os-perf-report__card">
                  <h4 className="kxd-os-perf-report__card-title">{row.campaignName}</h4>
                  <div className="kxd-os-perf-report__kpi-grid">
                    <KpiCell label="Impressions" value={fmtReportNumber(row.impressions)} />
                    <KpiCell label="Clicks" value={fmtReportNumber(row.clicks)} />
                    <KpiCell label="CTR" value={fmtReportPercent(row.ctr)} />
                    <KpiCell label="Avg CPC" value={fmtReportCurrency(row.avgCpc)} />
                    <KpiCell label="Cost" value={fmtReportCurrency(row.cost)} />
                    <KpiCell label="Conversions" value={fmtReportNumber(row.conversions)} highlight />
                  </div>
                  {row.notes ? <p className="kxd-os-perf-report__card-note">{row.notes}</p> : null}
                </div>
              ))}
            </div>
          </PerformanceSection>
        ) : null}

        {report.geographicPerformance.length > 0 ? (
          <PerformanceSection title="Geographic Performance">
            <div className="kxd-os-perf-report__cards">
              {report.geographicPerformance.map((row) => (
                <div key={row.location} className="kxd-os-perf-report__card">
                  <h4 className="kxd-os-perf-report__card-title">{row.location}</h4>
                  <div className="kxd-os-perf-report__kpi-grid">
                    <KpiCell label="Impressions" value={fmtReportNumber(row.impressions)} />
                    <KpiCell label="Clicks" value={fmtReportNumber(row.clicks)} />
                    <KpiCell label="CTR" value={fmtReportPercent(row.ctr)} />
                    <KpiCell label="Avg CPC" value={fmtReportCurrency(row.avgCpc)} />
                    <KpiCell label="Cost" value={fmtReportCurrency(row.cost)} />
                    <KpiCell label="Conversions" value={fmtReportNumber(row.conversions)} highlight />
                  </div>
                  {row.notes ? <p className="kxd-os-perf-report__card-note">{row.notes}</p> : null}
                </div>
              ))}
            </div>
          </PerformanceSection>
        ) : null}

        {report.topSearchTerms.length > 0 ? (
          <PerformanceSection title="Top Search Terms">
            <div className="kxd-os-perf-report__insight-grid">
              {report.topSearchTerms.map((row) => (
                <div key={row.searchTerm} className="kxd-os-perf-report__insight-block">
                  <div className="kxd-os-perf-report__insight-field">
                    <span className="kxd-os-perf-report__insight-label">Search Term</span>
                    <span className="kxd-os-perf-report__insight-value">{row.searchTerm}</span>
                  </div>
                  <div className="kxd-os-perf-report__insight-field">
                    <span className="kxd-os-perf-report__insight-label">Insight</span>
                    <span className="kxd-os-perf-report__insight-value">
                      {row.insight?.trim() || "—"}
                    </span>
                  </div>
                  <div className="kxd-os-perf-report__insight-field">
                    <span className="kxd-os-perf-report__insight-label">Recommendation</span>
                    <span
                      className={`kxd-os-perf-report__insight-value${
                        row.recommendation?.trim() ? "" : " kxd-os-perf-report__insight-value--pending"
                      }`}
                    >
                      {row.recommendation?.trim() || "Pending review"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </PerformanceSection>
        ) : null}

        {report.optimizationWorkCompleted.length > 0 ? (
          <PerformanceSection title="Optimization Work Completed">
            <div className="kxd-os-perf-report__work-grid">
              {report.optimizationWorkCompleted.map((row) => (
                <div key={row.title} className="kxd-os-perf-report__work-item">
                  <span className="kxd-os-perf-report__work-marker" aria-hidden="true" />
                  <div className="kxd-os-perf-report__work-copy">
                    <p className="kxd-os-perf-report__work-title">{row.title}</p>
                    {row.description ? (
                      <p className="kxd-os-perf-report__work-desc">{row.description}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </PerformanceSection>
        ) : null}

        {report.nextMonthStrategy.length > 0 ? (
          <PerformanceSection title="Next Month Strategy">
            <div className="kxd-os-perf-report__strategy-list">
              {report.nextMonthStrategy.map((row) => (
                <div key={row.title} className="kxd-os-perf-report__strategy-item">
                  <div className="kxd-os-perf-report__strategy-head">
                    <h4 className="kxd-os-perf-report__strategy-title">{row.title}</h4>
                    {row.priority ? (
                      <span className="kxd-os-perf-report__priority">
                        {STRATEGY_PRIORITY_LABELS[row.priority] ?? row.priority}
                      </span>
                    ) : null}
                  </div>
                  {row.description ? (
                    <p className="kxd-os-perf-report__strategy-body">{row.description}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </PerformanceSection>
        ) : null}

        {report.accountHealthScore != null ? (
          <PerformanceSection
            title="Overall Assessment"
            className="kxd-os-perf-report__section--assessment"
          >
            <div className="kxd-os-perf-report__assessment">
              <HealthScoreBadge score={report.accountHealthScore} variant="assessment" />
            </div>
          </PerformanceSection>
        ) : null}

        {report.clientFacingNotes ? (
          <PerformanceSection title="Client Notes">
            <p className="kxd-os-perf-report__prose">{report.clientFacingNotes}</p>
          </PerformanceSection>
        ) : null}
      </div>

      <footer className="kxd-os-perf-report__footer">
        <p className="kxd-os-perf-report__footer-brand">Kreate by Design</p>
        <p className="kxd-os-perf-report__footer-confidential">
          Confidential · Prepared exclusively for executive review
        </p>
        <p className="kxd-os-perf-report__footer-meta">
          {report.periodLabel} · {report.reportTypeLabel}
        </p>
      </footer>
    </article>
  );
}
