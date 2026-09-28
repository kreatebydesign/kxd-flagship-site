import type { AuthorizedPortfolioModel } from "@/lib/portal/authorized-portfolio";
import { AuthorizedPortfolioOpenAccount } from "./AuthorizedPortfolioOpenAccount";

function reportingLabel(
  availability: AuthorizedPortfolioModel["sites"][number]["analyticsAvailability"],
): string {
  if (availability === "ready") return "Google reporting ready";
  if (availability === "empty") return "Reporting period has limited data";
  if (availability === "not-entitled") return "Reporting not included yet";
  return "Reporting update pending";
}

function completedLabel(
  site: AuthorizedPortfolioModel["sites"][number],
): string | null {
  if (site.completedThisMonth <= 0) return null;
  // completedThisMonth is reporting-period scoped — never imply the calendar month.
  if (site.reportingPeriodLabel) {
    return `${site.completedThisMonth} completed · ${site.reportingPeriodLabel}`;
  }
  return `${site.completedThisMonth} recently completed`;
}

function activityLine(site: AuthorizedPortfolioModel["sites"][number]): string {
  const parts: string[] = [];
  const completed = completedLabel(site);
  if (completed) parts.push(completed);
  if (site.activeWork > 0) {
    parts.push(`${site.activeWork} in progress`);
  }
  if (site.awaitingClient > 0) {
    parts.push(
      site.awaitingClient === 1
        ? "1 item waiting on you"
        : `${site.awaitingClient} items waiting on you`,
    );
  }
  if (parts.length === 0) {
    return "No open client work recorded right now";
  }
  return parts.join(" · ");
}

function performanceLine(site: AuthorizedPortfolioModel["sites"][number]): string | null {
  if (site.performanceSignals.length === 0) return null;
  const period = site.reportingPeriodLabel
    ? `Google · ${site.reportingPeriodLabel}`
    : "Google reporting";
  const signals = site.performanceSignals
    .map((s) => `${s.label} ${s.valueLabel}`)
    .join(" · ");
  return `${period}: ${signals}`;
}

export function AuthorizedPortfolioWorkspace({
  model,
}: {
  model: AuthorizedPortfolioModel;
}) {
  if (model.availability !== "ready" || !model.overview.totals) {
    return (
      <div className="kxd-portal-portfolio__empty" role="status">
        <p className="kxd-os-body">{model.emptyState.title}</p>
        <p className="kxd-os-meta">{model.emptyState.lead}</p>
      </div>
    );
  }

  const { totals } = model.overview;
  const reportingPeriodLabel =
    model.sites.find((s) => s.reportingPeriodLabel)?.reportingPeriodLabel ?? null;

  return (
    <div
      className="kxd-portal-portfolio"
      data-portfolio-sites={totals.siteCount}
      data-active-client={model.activeClientId}
    >
      <section className="kxd-portal-portfolio__totals" aria-label="Portfolio at a glance">
        <div className="kxd-portal-portfolio__kpi">
          <p className="kxd-os-metric__label">Your businesses</p>
          <p className="kxd-portal-portfolio__kpi-value">{totals.siteCount}</p>
        </div>
        <div className="kxd-portal-portfolio__kpi">
          <p className="kxd-os-metric__label">
            {reportingPeriodLabel
              ? `Completed · ${reportingPeriodLabel}`
              : "Recently completed"}
          </p>
          <p className="kxd-portal-portfolio__kpi-value">{totals.completedThisMonth}</p>
        </div>
        <div className="kxd-portal-portfolio__kpi">
          <p className="kxd-os-metric__label">In progress</p>
          <p className="kxd-portal-portfolio__kpi-value">{totals.activeWork}</p>
        </div>
        <div className="kxd-portal-portfolio__kpi">
          <p className="kxd-os-metric__label">Waiting on you</p>
          <p className="kxd-portal-portfolio__kpi-value">{totals.awaitingClient}</p>
        </div>
      </section>

      <section aria-label="Your businesses">
        <p className="kxd-os-section__label">Businesses</p>
        <p className="kxd-os-meta" style={{ marginBottom: "1.15rem" }}>
          A private summary of the businesses on this login. Open any business to
          see its performance, KXD work, and reports. Nothing here mixes data across
          accounts.
        </p>
        <ul className="kxd-portal-portfolio__roster">
          {model.sites.map((site) => {
            const performance = performanceLine(site);
            return (
            <li
              key={site.clientId}
              className={`kxd-portal-portfolio__row${
                site.isActive ? " kxd-portal-portfolio__row--active" : ""
              }`}
            >
              <div className="kxd-portal-portfolio__row-main">
                <div>
                  <p className="kxd-os-card__title">{site.clientName}</p>
                  {site.isActive ? (
                    <p className="kxd-os-meta">Currently selected</p>
                  ) : null}
                  <p className="kxd-os-body" style={{ marginTop: "0.4rem" }}>
                    {activityLine(site)}
                  </p>
                  {performance ? (
                    <p className="kxd-os-body" style={{ marginTop: "0.35rem" }}>
                      {performance}
                    </p>
                  ) : null}
                  <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
                    {reportingLabel(site.analyticsAvailability)}
                    {site.primaryWinTitle ? ` · ${site.primaryWinTitle}` : ""}
                  </p>
                </div>
                <AuthorizedPortfolioOpenAccount
                  clientId={site.clientId}
                  clientName={site.clientName}
                  isActive={site.isActive}
                />
              </div>
            </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
