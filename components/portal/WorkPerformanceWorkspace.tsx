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
}: {
  label: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      className={`kxd-ws-perf__section${compact ? " kxd-ws-perf__section--compact" : ""}`}
      aria-label={label}
    >
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

  return (
    <div
      className="kxd-ws-perf"
      data-workspace-client={model.clientId}
      data-reporting-month={model.reportingMonthLabel}
    >
      <header className="kxd-ws-perf__hero kxd-ws-perf__hero--compact">
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
        <Section label="All businesses" compact>
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

      <Section label="Recent verified work" compact>
        <p className="kxd-os-meta" style={{ marginBottom: "0.35rem" }}>
          {model.monthlySummaryScopeNote}
        </p>
        {model.completedThisMonth.length === 0 ? (
          <Empty {...model.emptyStates.completed} />
        ) : (
          <ul className="kxd-ws-perf__list">
            {model.completedThisMonth.map((item) => (
              <li key={item.id}>
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
        )}
      </Section>

      <Section label="Ongoing work" compact>
        <p className="kxd-os-meta" style={{ marginBottom: "0.35rem" }}>
          Open items KXD is working on. These are not limited to the month above.
        </p>
        {kxdOngoing.length === 0 ? (
          <Empty {...model.emptyStates.active} />
        ) : (
          <ul className="kxd-ws-perf__list">
            {kxdOngoing.map((item) => (
              <li key={item.id}>
                <p className="kxd-os-body">{item.title}</p>
                <p className="kxd-os-meta">{item.statusLabel}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section label="Website performance" compact>
        {analytics.availability === "ready" && analytics.metrics.length > 0 ? (
          <>
            <p className="kxd-os-meta" style={{ marginBottom: "0.35rem" }}>
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

      {showCare ? (
        <Section label="What KXD takes care of" compact>
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
        <Section label="Needs your attention" compact>
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
        <Section label="Website feedback" compact>
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

      {showLeads ? (
        <Section label="Tracked actions" compact>
          <p className="kxd-os-metric__value">{model.leads.conversionCount}</p>
          <p className="kxd-os-meta">{model.leads.conversionLabel}</p>
        </Section>
      ) : null}

      {showWins ? (
        <Section label="Recent updates" compact>
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
        <Section label="Suggested next steps" compact>
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
