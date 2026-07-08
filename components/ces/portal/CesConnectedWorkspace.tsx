import Link from "next/link";
import type { ResolvedExperienceProfile } from "@/lib/ces";
import { portalCopy, PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";
import type { ConnectedWorkspaceData, ConnectedWorkGroup, ConnectedQuickAction } from "@/lib/portal/connected-workspace";
import { WebsiteReviewStatus } from "@/components/ces/modules/website-review/WebsiteReviewStatus";

function formatActivityDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatDeliverableDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const WORK_GROUP_LABELS: Record<ConnectedWorkGroup, string> = {
  "awaiting-you": PORTAL_CLIENT_LANGUAGE.connectedWorkAwaiting,
  "in-progress": PORTAL_CLIENT_LANGUAGE.connectedWorkInProgress,
  "recently-complete": PORTAL_CLIENT_LANGUAGE.connectedWorkRecentlyComplete,
};

const WORK_GROUP_ORDER: ConnectedWorkGroup[] = [
  "awaiting-you",
  "in-progress",
  "recently-complete",
];

const QUICK_ACTION_LABELS: Record<ConnectedQuickAction["id"], string> = {
  "review-website": PORTAL_CLIENT_LANGUAGE.connectedQuickActionReviewWebsite,
  "start-review": PORTAL_CLIENT_LANGUAGE.connectedQuickActionStartReview,
  "upload-assets": PORTAL_CLIENT_LANGUAGE.connectedQuickActionUploadAssets,
  "message-kxd": PORTAL_CLIENT_LANGUAGE.connectedQuickActionMessageKxd,
};

export interface CesConnectedWorkspaceProps {
  profile: ResolvedExperienceProfile;
  connected: ConnectedWorkspaceData;
}

export function CesConnectedWorkspace({ profile, connected }: CesConnectedWorkspaceProps) {
  const t = profile.terminology;
  const quickActions = connected.quickActions.filter((action) => action.enabled);
  const showDeliverablesPanel =
    connected.showDeliverablesLink || connected.deliverables.length > 0;
  const workByGroup = WORK_GROUP_ORDER.map((group) => ({
    group,
    label: WORK_GROUP_LABELS[group],
    items: connected.currentWork.filter((item) => item.group === group),
  })).filter((section) => section.items.length > 0);

  return (
    <div className="kxd-ces-connected">
      <section className="kxd-ces-connected__quick" aria-labelledby="connected-quick-heading">
        <h2 id="connected-quick-heading" className="kxd-ces-connected__section-title">
          {portalCopy(t, "portal.home.quickActions", PORTAL_CLIENT_LANGUAGE.connectedQuickActions)}
        </h2>
        <div className="kxd-ces-connected__quick-grid">
          {quickActions.map((action) =>
            action.href ? (
              <Link key={action.id} href={action.href} className="kxd-ces-connected__quick-action">
                <span className="kxd-ces-connected__quick-label">
                  {portalCopy(t, `portal.home.quick.${action.id}`, QUICK_ACTION_LABELS[action.id])}
                </span>
              </Link>
            ) : null,
          )}
        </div>
      </section>

      <div className="kxd-ces-connected__grid">
        <section className="kxd-ces-connected__panel" aria-labelledby="connected-website-heading">
          <h2 id="connected-website-heading" className="kxd-ces-connected__section-title">
            {portalCopy(t, "portal.home.website", PORTAL_CLIENT_LANGUAGE.connectedWebsite)}
          </h2>
          <div className="kxd-ces-connected__website-card">
            <div className="kxd-ces-connected__website-head">
              <p className="kxd-ces-connected__website-module">
                {portalCopy(t, "website-review.landing.title", PORTAL_CLIENT_LANGUAGE.reviewHeroTitle)}
              </p>
              <span className="kxd-ces-connected__website-badge">
                {connected.website.reviewEnabled
                  ? PORTAL_CLIENT_LANGUAGE.connectedWebsiteAvailable
                  : PORTAL_CLIENT_LANGUAGE.connectedWebsiteUnavailable}
              </span>
            </div>
            {connected.website.websiteUrl ? (
              <a
                href={connected.website.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="kxd-ces-connected__website-url"
              >
                {connected.website.websiteUrl.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              <p className="kxd-ces-connected__muted">{PORTAL_CLIENT_LANGUAGE.connectedWebsiteUrlMissing}</p>
            )}
            <dl className="kxd-ces-connected__meta-list">
              <div>
                <dt>{portalCopy(t, "portal.home.stat.active", PORTAL_CLIENT_LANGUAGE.statActiveRevisions)}</dt>
                <dd>{connected.website.activeRevisionCount}</dd>
              </div>
              <div>
                <dt>{portalCopy(t, "portal.home.stat.awaiting", PORTAL_CLIENT_LANGUAGE.statAwaitingYou)}</dt>
                <dd>{connected.website.awaitingCount}</dd>
              </div>
              <div>
                <dt>{PORTAL_CLIENT_LANGUAGE.connectedWebsiteLatestStatus}</dt>
                <dd>
                  {connected.website.latestStatus ? (
                    <WebsiteReviewStatus status={connected.website.latestStatus} />
                  ) : (
                    PORTAL_CLIENT_LANGUAGE.statAllClear
                  )}
                </dd>
              </div>
              <div>
                <dt>{PORTAL_CLIENT_LANGUAGE.connectedWebsiteLastActivity}</dt>
                <dd>
                  {connected.website.lastActivityAt
                    ? formatActivityDate(connected.website.lastActivityAt)
                    : PORTAL_CLIENT_LANGUAGE.connectedWebsiteNoActivity}
                </dd>
              </div>
            </dl>
            <div className="kxd-ces-connected__panel-actions">
              {connected.website.websiteUrl ? (
                <Link href="/portal/website-review/session/new" className="kxd-ces-btn kxd-ces-btn--primary">
                  {portalCopy(t, "website-review.cta.visual", PORTAL_CLIENT_LANGUAGE.reviewCtaVisual)}
                </Link>
              ) : null}
              {connected.latestRevisionHref ? (
                <Link href={connected.latestRevisionHref} className="kxd-ces-btn kxd-ces-btn--ghost">
                  {portalCopy(
                    t,
                    "portal.home.cta.latestRevision",
                    PORTAL_CLIENT_LANGUAGE.openLatestRevision,
                  )}
                </Link>
              ) : null}
              <Link href="/portal/website-review/request" className="kxd-ces-btn kxd-ces-btn--ghost">
                {portalCopy(t, "website-review.cta.request", PORTAL_CLIENT_LANGUAGE.reviewCtaPrimary)}
              </Link>
            </div>
          </div>
        </section>

        <section className="kxd-ces-connected__panel" aria-labelledby="connected-work-heading">
          <div className="kxd-ces-connected__panel-head">
            <h2 id="connected-work-heading" className="kxd-ces-connected__section-title">
              {portalCopy(t, "portal.home.currentWork", PORTAL_CLIENT_LANGUAGE.connectedCurrentWork)}
            </h2>
            {connected.viewAllRevisionsHref && workByGroup.length > 0 ? (
              <Link href={connected.viewAllRevisionsHref} className="kxd-ces-section__link">
                {portalCopy(t, "portal.home.viewAllRevisions", PORTAL_CLIENT_LANGUAGE.viewAllRevisions)}
              </Link>
            ) : null}
          </div>
          {workByGroup.length > 0 ? (
            <div className="kxd-ces-connected__work-groups">
              {workByGroup.map((section) => (
                <div key={section.group} className="kxd-ces-connected__work-group">
                  <p className="kxd-ces-connected__work-group-label">{section.label}</p>
                  <ul className="kxd-ces-connected__work-list">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <Link href={item.href} className="kxd-ces-connected__work-item">
                          <span className="kxd-ces-connected__work-title">{item.title}</span>
                          <span className="kxd-ces-connected__work-meta">
                            <WebsiteReviewStatus status={item.status} />
                            <time dateTime={item.updatedAt}>{formatActivityDate(item.updatedAt)}</time>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="kxd-ces-connected__empty">
              <p>{PORTAL_CLIENT_LANGUAGE.connectedCurrentWorkEmpty}</p>
              <Link href="/portal/website-review/request" className="kxd-ces-btn kxd-ces-btn--ghost">
                {portalCopy(t, "website-review.cta.request", PORTAL_CLIENT_LANGUAGE.reviewCtaPrimary)}
              </Link>
            </div>
          )}
        </section>

        <section className="kxd-ces-connected__panel" aria-labelledby="connected-activity-heading">
          <h2 id="connected-activity-heading" className="kxd-ces-connected__section-title">
            {portalCopy(t, "portal.home.recentActivity", PORTAL_CLIENT_LANGUAGE.connectedRecentActivity)}
          </h2>
          {connected.recentActivity.length > 0 ? (
            <ul className="kxd-ces-connected__activity-list">
              {connected.recentActivity.map((item) => (
                <li key={item.id}>
                  {item.href ? (
                    <Link href={item.href} className="kxd-ces-connected__activity-item">
                      <span className="kxd-ces-connected__activity-label">{item.label}</span>
                      {item.detail ? (
                        <span className="kxd-ces-connected__activity-detail">{item.detail}</span>
                      ) : null}
                      <time dateTime={item.at}>{formatActivityDate(item.at)}</time>
                    </Link>
                  ) : (
                    <div className="kxd-ces-connected__activity-item kxd-ces-connected__activity-item--static">
                      <span className="kxd-ces-connected__activity-label">{item.label}</span>
                      {item.detail ? (
                        <span className="kxd-ces-connected__activity-detail">{item.detail}</span>
                      ) : null}
                      <time dateTime={item.at}>{formatActivityDate(item.at)}</time>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="kxd-ces-connected__empty-text">
              {PORTAL_CLIENT_LANGUAGE.connectedRecentActivityEmpty}
            </p>
          )}
        </section>

        {showDeliverablesPanel ? (
        <section className="kxd-ces-connected__panel" aria-labelledby="connected-deliverables-heading">
          <div className="kxd-ces-connected__panel-head">
            <h2 id="connected-deliverables-heading" className="kxd-ces-connected__section-title">
              {portalCopy(t, "portal.home.deliverables", PORTAL_CLIENT_LANGUAGE.connectedDeliverables)}
            </h2>
            {connected.showDeliverablesLink ? (
              <Link href="/portal/deliverables" className="kxd-ces-section__link">
                {PORTAL_CLIENT_LANGUAGE.connectedViewDeliverables}
              </Link>
            ) : null}
          </div>
          {connected.deliverables.length > 0 ? (
            <ul className="kxd-ces-connected__deliverable-list">
              {connected.deliverables.map((item) => (
                <li key={item.id} className="kxd-ces-connected__deliverable-item">
                  <p className="kxd-ces-connected__deliverable-title">{item.title}</p>
                  <p className="kxd-ces-connected__deliverable-meta">
                    <span>{item.statusLabel}</span>
                    {item.categoryLabel ? <span>{item.categoryLabel}</span> : null}
                    <time dateTime={item.updatedAt}>{formatDeliverableDate(item.updatedAt)}</time>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="kxd-ces-connected__empty-text">
              {PORTAL_CLIENT_LANGUAGE.connectedDeliverablesEmpty}
            </p>
          )}
        </section>
        ) : null}
      </div>
    </div>
  );
}
