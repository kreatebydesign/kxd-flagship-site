import type { ReactNode } from "react";
import Link from "next/link";
import type { AnalyticsVisibilityModel } from "@/lib/portal/analytics-visibility";
import { CesDisclosure, CesEmptyState } from "@/components/ces/primitives";

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="kxd-ws-perf__section" aria-labelledby={undefined} aria-label={label}>
      <h2 className="kxd-os-section__label">{label}</h2>
      {children}
    </section>
  );
}

function Empty({ title, lead }: { title: string; lead: string }) {
  return <CesEmptyState title={title} lead={lead} />;
}

function sourceStateLabel(state: string): string {
  if (state === "connected" || state === "configured") return "Active";
  if (state === "not-entitled") return "Not part of your current services";
  if (state === "unavailable") return "Update pending";
  return "Not connected";
}

export function AnalyticsVisibilityWorkspace({ model }: { model: AnalyticsVisibilityModel }) {
  const { analytics, leads, reports } = model;

  return (
    <div className="kxd-ws-perf kxd-analytics-vis">
      <header className="kxd-ws-perf__hero">
        <p className="kxd-os-eyebrow">{model.clientName}</p>
        <p className="kxd-os-meta">
          Reporting month: {model.reportingMonthLabel}
          {model.comparisonPeriodLabel ? ` · compared with ${model.comparisonPeriodLabel}` : ""}
          {model.partialData ? " · partial data" : ""}
        </p>
      </header>

      {model.loadState === "error" ? (
        <Section label="Status">
          <Empty
            title={model.emptyStates.error.title}
            lead={model.errorNote ?? model.emptyStates.error.lead}
          />
          <p style={{ marginTop: "0.75rem" }}>
            <Link href="/portal/analytics" className="kxd-os-link-quiet">
              Retry
            </Link>
          </p>
        </Section>
      ) : null}

      <Section label="Website performance">
        {analytics.availability === "ready" && analytics.metrics.length > 0 ? (
          <>
            <p className="kxd-os-meta" style={{ marginBottom: "0.75rem" }}>
              {analytics.periodLabel}
              {analytics.freshnessNote ? ` · ${analytics.freshnessNote}` : ""}
              {analytics.statusNote ? ` · ${analytics.statusNote}` : ""}
            </p>
            <div
              className="kxd-ws-perf__metrics"
              role="list"
              aria-label="Website performance metrics"
            >
              {analytics.metrics.map((metric) => (
                <div key={metric.key} className="kxd-ws-perf__metric" role="listitem">
                  <p className="kxd-os-metric__label">{metric.label}</p>
                  <p
                    className="kxd-os-metric__value"
                    aria-label={`${metric.label}: ${metric.valueLabel}${
                      metric.deltaLabel ? `, change ${metric.deltaLabel}` : ""
                    }${metric.trend !== "unknown" ? `, trend ${metric.trend}` : ""}`}
                  >
                    {metric.valueLabel}
                  </p>
                  {metric.deltaLabel ? (
                    <p className="kxd-os-metric__sub">
                      {metric.deltaLabel}
                      {metric.previousLabel ? ` · was ${metric.previousLabel}` : ""}
                      {metric.trend === "up"
                        ? " · up"
                        : metric.trend === "down"
                          ? " · down"
                          : metric.trend === "flat"
                            ? " · flat"
                            : ""}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : (
          <Empty
            title={model.emptyStates.analytics.title}
            lead={analytics.statusNote ?? model.emptyStates.analytics.lead}
          />
        )}
      </Section>

      <Section label="Leads and conversions">
        {leads.availability === "ready" &&
        (leads.conversionCount != null ||
          leads.generateLeadCount != null ||
          leads.formSubmissionCount != null) ? (
          <div
            className="kxd-ws-perf__metrics"
            role="list"
            aria-label="Lead and conversion metrics"
          >
            <div className="kxd-ws-perf__metric" role="listitem">
              <p className="kxd-os-metric__label">{leads.confirmedLeadLabel}</p>
              <p className="kxd-os-metric__value" aria-label={leads.confirmedLeadLabel}>
                —
              </p>
            </div>
            {leads.generateLeadCount != null ? (
              <div className="kxd-ws-perf__metric" role="listitem">
                <p className="kxd-os-metric__label">{leads.generateLeadLabel}</p>
                <p
                  className="kxd-os-metric__value"
                  aria-label={`${leads.generateLeadLabel}: ${leads.generateLeadCount}`}
                >
                  {leads.generateLeadCount}
                </p>
              </div>
            ) : null}
            {leads.conversionCount != null ? (
              <div className="kxd-ws-perf__metric" role="listitem">
                <p className="kxd-os-metric__label">{leads.conversionLabel}</p>
                <p
                  className="kxd-os-metric__value"
                  aria-label={`${leads.conversionLabel}: ${leads.conversionCount}`}
                >
                  {leads.conversionCount}
                </p>
              </div>
            ) : null}
            {leads.formSubmissionCount != null ? (
              <div className="kxd-ws-perf__metric" role="listitem">
                <p className="kxd-os-metric__label">{leads.formSubmissionLabel}</p>
                <p
                  className="kxd-os-metric__value"
                  aria-label={`${leads.formSubmissionLabel}: ${leads.formSubmissionCount}`}
                >
                  {leads.formSubmissionCount}
                </p>
              </div>
            ) : null}
            {leads.statusNote ? (
              <p className="kxd-os-meta" style={{ gridColumn: "1 / -1" }}>
                {leads.statusNote}
              </p>
            ) : null}
          </div>
        ) : (
          <Empty
            title={model.emptyStates.leads.title}
            lead={leads.statusNote ?? model.emptyStates.leads.lead}
          />
        )}
      </Section>

      <Section label="Positive wins">
        {model.wins.length === 0 ? (
          <Empty {...model.emptyStates.wins} />
        ) : (
          <ul className="kxd-ws-perf__list">
            {model.wins.map((win) => (
              <li key={win.id}>
                <p className="kxd-os-card__title">{win.title}</p>
                <p className="kxd-os-meta">{win.lead}</p>
                <p className="kxd-os-meta">{win.evidenceLabel}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section label="Published reports">
        {reports.availability === "ready" && reports.items.length > 0 ? (
          <ul className="kxd-ws-perf__list">
            {reports.items.map((report) => (
              <li key={report.id}>
                <p className="kxd-os-card__title">
                  <Link href={report.href} className="kxd-os-link-quiet">
                    {report.title}
                  </Link>
                </p>
                <p className="kxd-os-meta">{report.periodLabel}</p>
              </li>
            ))}
          </ul>
        ) : (
          <Empty
            title={model.emptyStates.reports.title}
            lead={reports.statusNote ?? model.emptyStates.reports.lead}
          />
        )}
      </Section>

      <CesDisclosure
        summary="About these results"
        lead="These statuses explain which measurement supports the view. Provider setup remains managed by KXD."
      >
        <ul className="kxd-ws-perf__list" aria-label="Measurement status for this business">
          {model.sources.map((source) => (
            <li key={source.id}>
              <p className="kxd-os-card__title">{source.label}</p>
              <p className="kxd-os-meta">
                {sourceStateLabel(source.state)}
                {source.detail ? ` · ${source.detail}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </CesDisclosure>
    </div>
  );
}
