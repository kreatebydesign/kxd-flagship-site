import type { ReactNode } from "react";
import Link from "next/link";
import type {
  AuthorizedMultiSiteOverview,
  WorkPerformanceModel,
} from "@/lib/portal/work-performance";

function Section({
  label,
  children,
  compact = false,
  layout = "default",
}: {
  label: string;
  children: ReactNode;
  compact?: boolean;
  layout?: "default" | "span-full";
}) {
  return (
    <section
      className={[
        "kxd-ws-perf__section",
        compact ? " kxd-ws-perf__section--compact" : "",
        layout === "span-full" ? " kxd-ws-perf__section--span-full" : "",
      ].join("")}
      aria-label={label}
    >
      <p className="kxd-os-section__label">{label}</p>
      {children}
    </section>
  );
}

function reportingSourceLabel(
  metrics: WorkPerformanceModel["analytics"]["metrics"],
): string | null {
  const domains = new Set(metrics.map((metric) => metric.domain));
  if (domains.has("search") && domains.has("website")) {
    return "Google Search Console and site analytics";
  }
  if (domains.has("search")) {
    return "Google Search Console";
  }
  if (domains.has("website")) {
    return "Site analytics";
  }
  return null;
}

function Empty({ title, lead }: { title: string; lead: string }) {
  return (
    <div className="kxd-ws-perf__empty">
      <p className="kxd-os-body kxd-ws-perf__empty-title">{title}</p>
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
  const { analytics, updateRequests } = model;
  const waitingOnYou = model.currentlyInProgress.filter((item) => item.owner === "client");
  const kxdOngoing = model.currentlyInProgress.filter((item) => item.owner !== "client");
  const showWebsiteFeedback =
    updateRequests.availability !== "not-entitled" &&
    updateRequests.availability !== "empty";
  const showLeads =
    model.leads.availability === "ready" && model.leads.conversionCount != null;
  const showWins = model.wins.length > 0;
  const showCare =
    model.clientValue && model.clientValue.careContinuity.status !== "not-configured";
  const analyticsReady = analytics.availability === "ready" && analytics.metrics.length > 0;
  const reportingSource = analyticsReady ? reportingSourceLabel(analytics.metrics) : null;

  return (
    <div
      className="kxd-ws-perf kxd-ws-perf--portal-overview"
      data-workspace-client={model.clientId}
      data-reporting-month={model.reportingMonthLabel}
    >
      <header className="kxd-ws-perf__hero kxd-ws-perf__hero--compact kxd-ws-perf__section--span-full">
        <h2 className="kxd-os-headline kxd-ws-perf__title">{model.valueSummary.headline}</h2>
        <p className="kxd-os-ops-hero__lead">{model.valueSummary.lead}</p>
        <p className="kxd-os-meta kxd-ws-perf__period-meta">
          {model.reportingMonthLabel}
          {model.comparisonPeriodLabel
            ? ` · compared with ${model.comparisonPeriodLabel}`
            : ""}
        </p>
      </header>

      {multiSite?.available && multiSite.totals ? (
        <Section label="All businesses" compact layout="span-full">
          <ul className="kxd-ws-perf__list">
            {multiSite.sites.map((site) => (
              <li key={site.clientId}>
                <p className="kxd-os-card__title">{site.clientName}</p>
                <p className="kxd-os-meta">
                  {site.completedThisMonth} completed · {site.activeWork} ongoing
                  {site.awaitingClient > 0
                    ? ` · ${site.awaitingClient} waiting on you`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section
        label="Website performance"
        compact
        layout={analyticsReady ? "span-full" : "default"}
      >
        {analyticsReady ? (
          <>
            <p className="kxd-os-meta kxd-ws-perf__source-line">
              {analytics.periodLabel}
              {analytics.freshnessNote ? ` · ${analytics.freshnessNote}` : ""}
              {reportingSource ? ` · ${reportingSource}` : ""}
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
            {showLeads ? (
              <div className="kxd-ws-perf__inline-metric kxd-ws-perf__stack-sm">
                <p className="kxd-os-metric__label">{model.leads.conversionLabel}</p>
                <p className="kxd-os-metric__value">{model.leads.conversionCount}</p>
                <p className="kxd-os-meta">{model.leads.statusNote}</p>
              </div>
            ) : null}
            {model.clientValue?.performanceStory.whatItMeans ? (
              <p className="kxd-os-meta kxd-ws-perf__stack-sm">
                {model.clientValue.performanceStory.whatItMeans}
              </p>
            ) : null}
          </>
        ) : (
          <Empty
            title={model.emptyStates.analytics.title}
            lead={analytics.statusNote ?? model.emptyStates.analytics.lead}
          />
        )}
      </Section>

      <Section label="Ongoing work" compact>
        {kxdOngoing.length === 0 ? (
          <Empty {...model.emptyStates.active} />
        ) : (
          <ul className="kxd-ws-perf__list kxd-ws-perf__list--cards">
            {kxdOngoing.map((item) => (
              <li key={item.id} className="kxd-ws-perf__list-card">
                <p className="kxd-os-body">{item.title}</p>
                <p className="kxd-os-meta">{item.statusLabel}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section label="Finished this month" compact>
        {model.completedThisMonth.length === 0 ? (
          <Empty {...model.emptyStates.completed} />
        ) : (
          <>
            <p className="kxd-os-meta kxd-ws-perf__scope-note">
              {model.monthlySummaryScopeNote}
            </p>
            <ul className="kxd-ws-perf__list kxd-ws-perf__list--cards">
              {model.completedThisMonth.map((item) => (
                <li key={item.id} className="kxd-ws-perf__list-card">
                  <p className="kxd-os-body">{item.title}</p>
                  <p className="kxd-os-meta">
                    {item.categoryLabel ? `${item.categoryLabel} · ` : ""}
                    {item.completedAt
                      ? item.completedAt.slice(0, 10)
                      : "Completion date not recorded"}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      {showCare ? (
        <Section label="What KXD takes care of" compact layout="span-full">
          <p className="kxd-os-card__title">{model.clientValue!.careContinuity.headline}</p>
          <p className="kxd-os-meta kxd-ws-perf__stack-xs">
            {model.clientValue!.careContinuity.lead}
          </p>
          {model.clientValue!.careContinuity.lines.length > 0 ? (
            <ul className="kxd-ws-perf__list kxd-ws-perf__stack-sm">
              {model.clientValue!.careContinuity.lines.map((line) => (
                <li key={line.id}>
                  <p className="kxd-os-body">
                    {line.label}: {line.value}
                  </p>
                  {line.detail ? <p className="kxd-os-meta">{line.detail}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </Section>
      ) : null}

      {waitingOnYou.length > 0 || updateRequests.awaitingClientCount > 0 ? (
        <Section label="Needs your attention" compact layout="span-full">
          {waitingOnYou.length > 0 ? (
            <ul className="kxd-ws-perf__list">
              {waitingOnYou.map((item) => (
                <li key={item.id}>
                  <p className="kxd-os-body">{item.title}</p>
                  <p className="kxd-os-meta">{item.statusLabel}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="kxd-os-meta">
              {updateRequests.awaitingClientCount} website update
              {updateRequests.awaitingClientCount === 1 ? "" : "s"} waiting on you.
            </p>
          )}
        </Section>
      ) : null}

      {showWebsiteFeedback ? (
        <Section label="Website feedback" compact layout="span-full">
          {updateRequests.priority.length > 0 ? (
            <ul className="kxd-ws-perf__list">
              {updateRequests.priority.map((item) => (
                <li key={item.id}>
                  <p className="kxd-os-body">{item.title}</p>
                  <p className="kxd-os-meta">{item.statusLabel}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="kxd-os-meta">
              {updateRequests.openCount} open · {updateRequests.inProgressCount} in progress
            </p>
          )}
          {updateRequests.primaryAction ? (
            <p className="kxd-ws-perf__stack-before">
              <Link href={updateRequests.primaryAction.href} className="kxd-os-link-quiet">
                {updateRequests.primaryAction.label}
              </Link>
            </p>
          ) : null}
        </Section>
      ) : null}

      {showLeads && !analyticsReady ? (
        <Section label="Tracked form activity" compact layout="span-full">
          <p className="kxd-os-meta kxd-ws-perf__source-line">{model.leads.periodLabel}</p>
          <p className="kxd-os-metric__value">{model.leads.conversionCount}</p>
          <p className="kxd-os-metric__label">{model.leads.conversionLabel}</p>
          <p className="kxd-os-meta">{model.leads.statusNote}</p>
        </Section>
      ) : null}

      {showWins ? (
        <Section label="Recent updates" compact layout="span-full">
          <ul className="kxd-ws-perf__list">
            {model.wins.map((win) => (
              <li key={win.id}>
                <p className="kxd-os-card__title">{win.title}</p>
                <p className="kxd-os-meta">{win.lead}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {model.nextMoves.length > 0 ? (
        <Section label="Suggested next steps" compact layout="span-full">
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
        </Section>
      ) : null}
    </div>
  );
}
