import type { AuthorizedPortfolioModel } from "@/lib/portal/authorized-portfolio";
import { AuthorizedPortfolioOpenAccount } from "./AuthorizedPortfolioOpenAccount";

function analyticsLabel(
  availability: AuthorizedPortfolioModel["sites"][number]["analyticsAvailability"],
): string {
  if (availability === "ready") return "Analytics ready";
  if (availability === "empty") return "Analytics empty";
  if (availability === "not-entitled") return "Analytics not included";
  return "Analytics unavailable";
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

  return (
    <div
      className="kxd-portal-portfolio"
      data-portfolio-sites={totals.siteCount}
      data-active-client={model.activeClientId}
    >
      <section className="kxd-portal-portfolio__totals" aria-label="Portfolio totals">
        <div className="kxd-portal-portfolio__kpi">
          <p className="kxd-os-metric__label">Authorized accounts</p>
          <p className="kxd-portal-portfolio__kpi-value">{totals.siteCount}</p>
        </div>
        <div className="kxd-portal-portfolio__kpi">
          <p className="kxd-os-metric__label">Completed this month</p>
          <p className="kxd-portal-portfolio__kpi-value">{totals.completedThisMonth}</p>
        </div>
        <div className="kxd-portal-portfolio__kpi">
          <p className="kxd-os-metric__label">Active work</p>
          <p className="kxd-portal-portfolio__kpi-value">{totals.activeWork}</p>
        </div>
        <div className="kxd-portal-portfolio__kpi">
          <p className="kxd-os-metric__label">Waiting on you</p>
          <p className="kxd-portal-portfolio__kpi-value">{totals.awaitingClient}</p>
        </div>
      </section>

      <section aria-label="Authorized accounts">
        <p className="kxd-os-section__label">Per-account breakdown</p>
        <p className="kxd-os-meta" style={{ marginBottom: "1rem" }}>
          Showing only accounts granted to this login. Each workspace stays isolated
          until you switch.
        </p>
        <ul className="kxd-portal-portfolio__roster">
          {model.sites.map((site) => (
            <li
              key={site.clientId}
              className={`kxd-portal-portfolio__row${
                site.isActive ? " kxd-portal-portfolio__row--active" : ""
              }`}
            >
              <div className="kxd-portal-portfolio__row-main">
                <div>
                  <p className="kxd-os-card__title">{site.clientName}</p>
                  <p className="kxd-os-meta">
                    {site.isActive ? "Current account · " : ""}
                    {site.completedThisMonth} completed · {site.activeWork} active
                    {site.awaitingClient > 0
                      ? ` · ${site.awaitingClient} waiting on you`
                      : ""}
                  </p>
                  <p className="kxd-os-meta">
                    {analyticsLabel(site.analyticsAvailability)}
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
          ))}
        </ul>
      </section>
    </div>
  );
}
