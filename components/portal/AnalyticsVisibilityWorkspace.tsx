import type { ReactNode } from "react";
import Link from "next/link";
import type { AnalyticsVisibilityModel } from "@/lib/portal/analytics-visibility";
import { CesDisclosure, CesEmptyState } from "@/components/ces/primitives";

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="kxd-ws-perf__section" aria-label={label}>
      <h2 className="kxd-os-section__label">{label}</h2>
      {children}
    </section>
  );
}

function Empty({ title, lead }: { title: string; lead: string }) {
  return <CesEmptyState title={title} lead={lead} variant="editorial" />;
}

function sourceStateLabel(state: string): string {
  if (state === "connected" || state === "configured") return "Connected";
  if (state === "not-entitled") return "Not part of your current services";
  if (state === "unavailable") return "Update pending";
  return "Not connected yet";
}

const GA4_KEYS = new Set(["sessions", "visitors", "pageviews", "conversions"]);
const GSC_KEYS = new Set(["clicks", "impressions", "ctr", "position", "average_position"]);

export function AnalyticsVisibilityWorkspace({ model }: { model: AnalyticsVisibilityModel }) {
  const { analytics, leads, reports } = model;
  const metrics = analytics.metrics ?? [];
  const siteMetrics = metrics.filter((m) => GA4_KEYS.has(m.key));
  const searchMetrics = metrics.filter(
    (m) => GSC_KEYS.has(m.key) || m.key === "average_position" || m.key === "position",
  );
  const otherMetrics = metrics.filter(
    (m) => !GA4_KEYS.has(m.key) && !GSC_KEYS.has(m.key) && m.key !== "average_position" && m.key !== "position",
  );

  const hasSite = siteMetrics.length > 0;
  const hasSearch = searchMetrics.length > 0;
  const ga4Configured =
    model.sources.find((s) => s.id === "ga4")?.state === "configured" ||
    model.sources.find((s) => s.id === "ga4")?.state === "connected";
  const showMissingGa4Note = !hasSite && hasSearch && ga4Configured;

  const periodHeadline = model.reportingMonthLabel
    ? `Google performance — ${model.reportingMonthLabel}`
    : "Google performance";

  return (
    <div className="kxd-ws-perf kxd-analytics-vis">
      <header className="kxd-ws-perf__hero">
        <p className="kxd-os-eyebrow">{model.clientName}</p>
        <h1 className="kxd-os-h2" style={{ margin: "0.35rem 0 0.5rem" }}>
          Performance
        </h1>
        <p className="kxd-os-body">{periodHeadline}</p>
        <p className="kxd-os-meta" style={{ marginTop: "0.5rem" }}>
          Synced Google reporting for this business — not live page-load data.
          {model.comparisonPeriodLabel
            ? ` Compared with ${model.comparisonPeriodLabel}.`
            : ""}
          {model.partialData
            ? " Some measures are available for this period; missing ones are left blank rather than shown as zero."
            : ""}
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
              Try again
            </Link>
          </p>
        </Section>
      ) : null}

      <Section label="Website activity">
        {hasSite ? (
          <>
            <p className="kxd-os-meta" style={{ marginBottom: "0.75rem" }}>
              How people used the website during {analytics.periodLabel || model.reportingMonthLabel}.
            </p>
            <div
              className="kxd-ws-perf__metrics"
              role="list"
              aria-label="Website activity metrics"
            >
              {siteMetrics.map((metric) => (
                <div key={metric.key} className="kxd-ws-perf__metric" role="listitem">
                  <p className="kxd-os-metric__label">{metric.label}</p>
                  <p className="kxd-os-metric__value">{metric.valueLabel}</p>
                  {metric.deltaLabel ? (
                    <p className="kxd-os-metric__sub">{metric.deltaLabel}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : (
          <Empty
            title={
              showMissingGa4Note
                ? "Website analytics not available for this period"
                : model.emptyStates.analytics.title
            }
            lead={
              showMissingGa4Note
                ? "Search visibility for this closed month is below. Website activity for the same closed window was not stored in KXD reporting — that is not the same as zero traffic, and it does not mean measurement is disconnected today."
                : (analytics.statusNote ?? model.emptyStates.analytics.lead)
            }
          />
        )}
      </Section>

      <Section label="Search visibility">
        {hasSearch ? (
          <>
            <p className="kxd-os-meta" style={{ marginBottom: "0.75rem" }}>
              How this business appeared in Google Search during{" "}
              {analytics.periodLabel || model.reportingMonthLabel}.
            </p>
            <div
              className="kxd-ws-perf__metrics"
              role="list"
              aria-label="Search visibility metrics"
            >
              {searchMetrics.map((metric) => (
                <div key={metric.key} className="kxd-ws-perf__metric" role="listitem">
                  <p className="kxd-os-metric__label">{metric.label}</p>
                  <p className="kxd-os-metric__value">{metric.valueLabel}</p>
                  {metric.deltaLabel ? (
                    <p className="kxd-os-metric__sub">{metric.deltaLabel}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : (
          <Empty
            title="Search visibility not available for this period"
            lead="Google Search measures will appear here when synced reporting is ready for this business."
          />
        )}
      </Section>

      {otherMetrics.length > 0 ? (
        <Section label="Additional measures">
          <div className="kxd-ws-perf__metrics" role="list" aria-label="Additional measures">
            {otherMetrics.map((metric) => (
              <div key={metric.key} className="kxd-ws-perf__metric" role="listitem">
                <p className="kxd-os-metric__label">{metric.label}</p>
                <p className="kxd-os-metric__value">{metric.valueLabel}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      <Section label="Tracked actions">
        {leads.availability === "ready" &&
        (leads.conversionCount != null ||
          leads.generateLeadCount != null ||
          leads.formSubmissionCount != null) ? (
          <div
            className="kxd-ws-perf__metrics"
            role="list"
            aria-label="Tracked website actions"
          >
            {leads.generateLeadCount != null ? (
              <div className="kxd-ws-perf__metric" role="listitem">
                <p className="kxd-os-metric__label">Tracked lead actions</p>
                <p className="kxd-os-metric__value">{leads.generateLeadCount}</p>
                <p className="kxd-os-metric__sub">
                  Website events — not confirmed sales
                </p>
              </div>
            ) : null}
            {leads.conversionCount != null ? (
              <div className="kxd-ws-perf__metric" role="listitem">
                <p className="kxd-os-metric__label">Tracked website conversions</p>
                <p className="kxd-os-metric__value">{leads.conversionCount}</p>
                <p className="kxd-os-metric__sub">
                  Aggregate website actions — not confirmed sales
                </p>
              </div>
            ) : null}
            {leads.formSubmissionCount != null ? (
              <div className="kxd-ws-perf__metric" role="listitem">
                <p className="kxd-os-metric__label">{leads.formSubmissionLabel}</p>
                <p className="kxd-os-metric__value">{leads.formSubmissionCount}</p>
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
            title="No tracked actions for this period"
            lead={
              leads.statusNote ??
              "Tracked lead actions and website conversions appear here when available. They are never invented as zero sales."
            }
          />
        )}
      </Section>

      <Section label="Monthly reports">
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
            title="Monthly reports will appear here"
            lead="As KXD finalizes each monthly report for this business, it will be published to this secure Reports area."
          />
        )}
        <p style={{ marginTop: "0.85rem" }}>
          <Link href="/portal/reports" className="kxd-os-link-quiet">
            Open Reports
          </Link>
        </p>
      </Section>

      <CesDisclosure
        summary="About these results"
        lead="KXD keeps Google reporting synced for your partnership. Numbers reflect the closed reporting month above — not a live Google dashboard refresh."
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
