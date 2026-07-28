import type { ReactNode } from "react";
import Link from "next/link";
import type {
  AuthorizedMultiSiteOverview,
  WorkPerformanceModel,
} from "@/lib/portal/work-performance";

function Section({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="kxd-ws-perf__section" aria-label={label}>
      <p className="kxd-os-section__label">{label}</p>
      {children}
    </section>
  );
}

function Empty({ title, lead }: { title: string; lead: string }) {
  return (
    <div className="kxd-ws-perf__empty">
      <p className="kxd-os-body">{title}</p>
      <p className="kxd-os-meta">{lead}</p>
    </div>
  );
}

export function WorkPerformanceWorkspace({
  model,
  multiSite = null,
}: {
  model: WorkPerformanceModel;
  multiSite?: AuthorizedMultiSiteOverview | null;
}) {
  const { valueSummary, analytics, updateRequests } = model;

  return (
    <div
      className="kxd-ws-perf"
      data-workspace-client={model.clientId}
      data-reporting-month={model.reportingMonthLabel}
    >
      <header className="kxd-ws-perf__hero">
        <p className="kxd-os-eyebrow">{model.clientName}</p>
        <h2 className="kxd-os-headline kxd-ws-perf__title">{valueSummary.headline}</h2>
        <p className="kxd-os-ops-hero__lead">{valueSummary.lead}</p>
        <p className="kxd-os-meta">
          Reporting month: {model.reportingMonthLabel}
          {model.comparisonPeriodLabel
            ? ` · compared with ${model.comparisonPeriodLabel}`
            : ""}
        </p>
      </header>

      {multiSite?.available && multiSite.totals ? (
        <Section label="Your authorized businesses">
          <p className="kxd-os-meta" style={{ marginBottom: "0.75rem" }}>
            Summary across {multiSite.totals.siteCount} authorized businesses — each
            remains fully isolated when you switch.
          </p>
          <ul className="kxd-ws-perf__list">
            {multiSite.sites.map((site) => (
              <li key={site.clientId}>
                <p className="kxd-os-card__title">{site.clientName}</p>
                <p className="kxd-os-meta">
                  {site.completedThisMonth} completed · {site.activeWork} active
                  {site.awaitingClient > 0
                    ? ` · ${site.awaitingClient} waiting on you`
                    : ""}
                  {site.primaryWinTitle ? ` · ${site.primaryWinTitle}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section label="Work completed this month">
        {model.completedThisMonth.length === 0 ? (
          <Empty {...model.emptyStates.completed} />
        ) : (
          <ul className="kxd-ws-perf__list">
            {model.completedThisMonth.map((item) => (
              <li key={item.id}>
                <p className="kxd-os-body">{item.title}</p>
                <p className="kxd-os-meta">
                  {item.categoryLabel ? `${item.categoryLabel} · ` : ""}
                  {(item.completedAt ?? item.updatedAt).slice(0, 10)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section label="Currently in progress">
        {model.currentlyInProgress.length === 0 ? (
          <Empty {...model.emptyStates.active} />
        ) : (
          <ul className="kxd-ws-perf__list">
            {model.currentlyInProgress.map((item) => (
              <li key={item.id}>
                <p className="kxd-os-body">{item.title}</p>
                <p className="kxd-os-meta">
                  {item.statusLabel}
                  {item.owner === "client" ? " · Waiting on you" : " · KXD handling"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section label="Website update requests">
        {updateRequests.availability === "not-entitled" ||
        updateRequests.availability === "empty" ? (
          <Empty {...model.emptyStates.requests} />
        ) : (
          <>
            <p className="kxd-os-meta" style={{ marginBottom: "0.75rem" }}>
              {updateRequests.openCount} open · {updateRequests.inProgressCount} in
              progress · {updateRequests.awaitingClientCount} waiting on you ·{" "}
              {updateRequests.completedThisMonthCount} completed this month
            </p>
            {updateRequests.priority.length > 0 ? (
              <ul className="kxd-ws-perf__list">
                {updateRequests.priority.map((item) => (
                  <li key={item.id}>
                    <p className="kxd-os-body">{item.title}</p>
                    <p className="kxd-os-meta">{item.statusLabel}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
        {updateRequests.primaryAction ? (
          <p style={{ marginTop: "0.75rem" }}>
            <Link href={updateRequests.primaryAction.href} className="kxd-os-link-quiet">
              {updateRequests.primaryAction.label}
            </Link>
          </p>
        ) : null}
      </Section>

      <Section label="Website performance">
        {analytics.availability === "ready" && analytics.metrics.length > 0 ? (
          <>
            <p className="kxd-os-meta" style={{ marginBottom: "0.75rem" }}>
              {analytics.periodLabel}
              {analytics.freshnessNote ? ` · ${analytics.freshnessNote}` : ""}
            </p>
            <div className="kxd-ws-perf__metrics">
              {analytics.metrics.map((metric) => (
                <div key={metric.key} className="kxd-ws-perf__metric">
                  <p className="kxd-os-metric__label">{metric.label}</p>
                  <p className="kxd-os-metric__value">{metric.valueLabel}</p>
                  {metric.deltaLabel ? (
                    <p className="kxd-os-metric__sub">
                      {metric.deltaLabel}
                      {metric.previousLabel ? ` · was ${metric.previousLabel}` : ""}
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
        {model.leads.availability === "ready" && model.leads.conversionCount != null ? (
          <>
            <p className="kxd-os-metric__value">{model.leads.conversionCount}</p>
            <p className="kxd-os-meta">{model.leads.conversionLabel}</p>
            {model.leads.statusNote ? (
              <p className="kxd-os-meta" style={{ marginTop: "0.5rem" }}>
                {model.leads.statusNote}
              </p>
            ) : null}
          </>
        ) : (
          <Empty
            title={model.emptyStates.leads.title}
            lead={model.leads.statusNote ?? model.emptyStates.leads.lead}
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

      <Section label="Recommended next moves">
        {model.nextMoves.length === 0 ? (
          <Empty {...model.emptyStates.nextMoves} />
        ) : (
          <div className="kxd-os-ops-quick-grid">
            {model.nextMoves.map((move) =>
              move.href ? (
                <Link key={move.id} href={move.href} className="kxd-os-ops-quick-cell">
                  <p className="kxd-os-card__title">{move.title}</p>
                  <p className="kxd-os-meta">{move.lead}</p>
                </Link>
              ) : (
                <div key={move.id} className="kxd-os-ops-quick-cell">
                  <p className="kxd-os-card__title">{move.title}</p>
                  <p className="kxd-os-meta">{move.lead}</p>
                </div>
              ),
            )}
          </div>
        )}
      </Section>
    </div>
  );
}
