import Link from "next/link";
import type { ResolvedExperienceProfile } from "@/lib/ces";
import { isCesModuleEnabled } from "@/lib/ces";
import { portalCopy, PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";
import type {
  WebsiteReviewItem,
  WebsiteReviewLandingData,
} from "@/lib/ces/modules/website-review/types";
import {
  reviewStatusLabel,
  WEBSITE_REVIEW_ACTIVITY_DETAILS,
} from "@/lib/ces/vocabulary/website-review";
import { PRIMAL_CLIENT_SLUG } from "@/lib/ces/profile/primal";
import { portalFirstName, portalTimeGreeting } from "@/lib/portal/greeting";
import { CesHero, CesPage } from "@/components/ces/primitives";
import { WebsiteReviewCard } from "@/components/ces/modules/website-review/WebsiteReviewCard";
import { WebsiteReviewEmptyGuide } from "@/components/ces/modules/website-review/WebsiteReviewReassurance";
import { WebsiteReviewStatus } from "@/components/ces/modules/website-review/WebsiteReviewStatus";
import { CesPortalLaunchGuide } from "./CesPortalLaunchGuide";

export interface CesPortalHomeProps {
  displayName: string;
  profile: ResolvedExperienceProfile;
  websiteReview: WebsiteReviewLandingData;
}

function sortByUpdatedDesc(a: WebsiteReviewItem, b: WebsiteReviewItem): number {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

function workspaceEyebrow(
  profile: ResolvedExperienceProfile,
  terminology: Record<string, string>,
): string {
  if (profile.identity.clientSlug === PRIMAL_CLIENT_SLUG) {
    return portalCopy(
      terminology,
      "portal.home.workspaceLabel",
      PORTAL_CLIENT_LANGUAGE.primalWorkspaceLabel,
    );
  }

  return portalCopy(
    terminology,
    "portal.home.eyebrow",
    profile.hospitality.welcomeEyebrow ?? PORTAL_CLIENT_LANGUAGE.homeEyebrow,
  );
}

export function CesPortalHome({
  displayName,
  profile,
  websiteReview,
}: CesPortalHomeProps) {
  const t = profile.terminology;
  const allReviews = [...websiteReview.activeReviews, ...websiteReview.completedReviews].sort(
    sortByUpdatedDesc,
  );
  const latestRevision = allReviews[0] ?? null;
  const latestActiveRevision =
    websiteReview.activeReviews.sort(sortByUpdatedDesc)[0] ?? null;
  const recentRevisions = websiteReview.activeReviews.sort(sortByUpdatedDesc).slice(0, 3);

  const awaitingInput = websiteReview.activeReviews
    .filter((review) => review.status === "awaiting-your-input")
    .sort(sortByUpdatedDesc);

  const activeCount = websiteReview.activeReviews.length;
  const hasRevisions = allReviews.length > 0;
  const firstName = portalFirstName(displayName);
  const eyebrow = workspaceEyebrow(profile, t);
  const title = portalTimeGreeting(firstName);
  const lead = portalCopy(t, "portal.home.lead", PORTAL_CLIENT_LANGUAGE.homeLead);
  const statusDetail = latestActiveRevision
    ? WEBSITE_REVIEW_ACTIVITY_DETAILS[latestActiveRevision.status]
    : null;

  return (
    <CesPage
      className={`kxd-ces-portal-home kxd-ces-page--enter${
        profile.identity.clientSlug === PRIMAL_CLIENT_SLUG ? " kxd-ces-portal-home--primal" : ""
      }`}
    >
      <CesHero eyebrow={eyebrow} title={title} lead={lead} presence />

      <CesPortalLaunchGuide
        profile={profile}
        websiteUrl={websiteReview.websiteUrl}
        hasRevisions={hasRevisions}
      />

      <section className="kxd-ces-dashboard-stats" aria-label="Workspace overview">
        <div className="kxd-ces-dashboard-stat">
          <p className="kxd-ces-dashboard-stat__value">{activeCount}</p>
          <p className="kxd-ces-dashboard-stat__label">
            {portalCopy(t, "portal.home.stat.active", PORTAL_CLIENT_LANGUAGE.statActiveRevisions)}
          </p>
        </div>
        <div className="kxd-ces-dashboard-stat">
          <p className="kxd-ces-dashboard-stat__value">{awaitingInput.length}</p>
          <p className="kxd-ces-dashboard-stat__label">
            {portalCopy(t, "portal.home.stat.awaiting", PORTAL_CLIENT_LANGUAGE.statAwaitingYou)}
          </p>
        </div>
        <div className="kxd-ces-dashboard-stat kxd-ces-dashboard-stat--status">
          <p className="kxd-ces-dashboard-stat__label">
            {portalCopy(t, "portal.home.stat.current", PORTAL_CLIENT_LANGUAGE.statCurrentReview)}
          </p>
          {latestActiveRevision ? (
            <>
              <WebsiteReviewStatus status={latestActiveRevision.status} />
              <p className="kxd-ces-dashboard-stat__hint">{statusDetail}</p>
            </>
          ) : (
            <p className="kxd-ces-dashboard-stat__empty">
              {portalCopy(t, "portal.home.stat.clear", PORTAL_CLIENT_LANGUAGE.statAllClear)}
            </p>
          )}
        </div>
      </section>

      <section className="kxd-ces-focus-card kxd-ces-focus-card--hero" aria-labelledby="ces-focus-heading">
        <div className="kxd-ces-focus-card__content">
          <p className="kxd-ces-focus-card__eyebrow">
            {portalCopy(t, "website-review.landing.eyebrow", PORTAL_CLIENT_LANGUAGE.focusEyebrow)}
          </p>
          <h2 id="ces-focus-heading" className="kxd-ces-focus-card__title">
            {portalCopy(t, "website-review.landing.title", PORTAL_CLIENT_LANGUAGE.reviewHeroTitle)}
          </h2>
          <p className="kxd-ces-focus-card__lead">
            {portalCopy(t, "website-review.landing.lead", PORTAL_CLIENT_LANGUAGE.reviewHeroLead)}
          </p>
          {activeCount > 0 ? (
            <p className="kxd-ces-focus-card__meta">
              {PORTAL_CLIENT_LANGUAGE.moduleActiveCount(activeCount)}
            </p>
          ) : null}
          <p className="kxd-ces-focus-card__reassurance">
            {profile.hospitality.reassuranceLine ?? PORTAL_CLIENT_LANGUAGE.focusReassurance}
          </p>
        </div>
        <div className="kxd-ces-focus-card__actions">
          <Link href="/portal/website-review/request" className="kxd-ces-btn kxd-ces-btn--primary">
            {portalCopy(t, "website-review.cta.request", PORTAL_CLIENT_LANGUAGE.reviewCtaPrimary)}
          </Link>
          {latestRevision ? (
            <Link
              href={`/portal/website-review/${latestRevision.id}`}
              className="kxd-ces-btn kxd-ces-btn--ghost"
            >
              {portalCopy(
                t,
                "portal.home.cta.latestRevision",
                PORTAL_CLIENT_LANGUAGE.openLatestRevision,
              )}
            </Link>
          ) : null}
          {websiteReview.websiteUrl ? (
            <Link
              href="/portal/website-review/session/new"
              className="kxd-ces-btn kxd-ces-btn--ghost"
            >
              {portalCopy(t, "website-review.cta.visual", PORTAL_CLIENT_LANGUAGE.reviewCtaVisual)}
            </Link>
          ) : null}
          <Link href="/portal/website-review" className="kxd-ces-btn kxd-ces-btn--ghost">
            {PORTAL_CLIENT_LANGUAGE.viewAllRevisions}
          </Link>
        </div>
      </section>

      {latestActiveRevision ? (
        <section className="kxd-ces-status-card" aria-labelledby="ces-current-status-heading">
          <div className="kxd-ces-status-card__head">
            <h2 id="ces-current-status-heading" className="kxd-ces-status-card__title">
              {portalCopy(t, "portal.home.currentStatus", PORTAL_CLIENT_LANGUAGE.currentStatusHeading)}
            </h2>
            <WebsiteReviewStatus status={latestActiveRevision.status} />
          </div>
          <p className="kxd-ces-status-card__revision-title">{latestActiveRevision.title}</p>
          {statusDetail ? <p className="kxd-ces-status-card__detail">{statusDetail}</p> : null}
          <Link
            href={`/portal/website-review/${latestActiveRevision.id}`}
            className="kxd-ces-status-card__link"
          >
            {portalCopy(t, "portal.home.openRevision", PORTAL_CLIENT_LANGUAGE.openRevision)}
          </Link>
        </section>
      ) : null}

      <section className="kxd-ces-section kxd-ces-section--supporting" aria-labelledby="ces-attention-heading">
        <h2 id="ces-attention-heading" className="kxd-ces-section__title">
          {PORTAL_CLIENT_LANGUAGE.attentionHeading}
        </h2>
        {awaitingInput.length > 0 ? (
          <ul className="kxd-ces-attention-list">
            {awaitingInput.map((review) => (
              <li key={review.id}>
                <Link href={`/portal/website-review/${review.id}`} className="kxd-ces-attention-item">
                  <span className="kxd-ces-attention-item__label">
                    {reviewStatusLabel(review.status)}
                  </span>
                  <span className="kxd-ces-attention-item__title">{review.title}</span>
                  <span className="kxd-ces-attention-item__hint">
                    {PORTAL_CLIENT_LANGUAGE.attentionTapHint}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="kxd-ces-attention-empty">{PORTAL_CLIENT_LANGUAGE.attentionEmpty}</p>
        )}
      </section>

      {recentRevisions.length > 0 ? (
        <section className="kxd-ces-section kxd-ces-section--supporting" aria-labelledby="ces-recent-heading">
          <div className="kxd-ces-section__head">
            <h2 id="ces-recent-heading" className="kxd-ces-section__title">
              {portalCopy(t, "portal.home.recentRevisions", PORTAL_CLIENT_LANGUAGE.recentRevisionsHeading)}
            </h2>
            <Link href="/portal/website-review" className="kxd-ces-section__link">
              {PORTAL_CLIENT_LANGUAGE.viewAllRevisions}
            </Link>
          </div>
          <div className="kxd-ces-review-list">
            {recentRevisions.map((review) => (
              <WebsiteReviewCard key={review.id} review={review} />
            ))}
          </div>
        </section>
      ) : !hasRevisions ? (
        <WebsiteReviewEmptyGuide websiteUrl={websiteReview.websiteUrl} />
      ) : null}

      {websiteReview.completedReviews.length > 0 ? (
        <section
          className="kxd-ces-section kxd-ces-section--quiet kxd-ces-section--supporting"
          aria-labelledby="ces-complete-heading"
        >
          <h2 id="ces-complete-heading" className="kxd-ces-section__title">
            {PORTAL_CLIENT_LANGUAGE.reviewCompletedSection}
          </h2>
          <div className="kxd-ces-review-list">
            {websiteReview.completedReviews.sort(sortByUpdatedDesc).slice(0, 2).map((review) => (
              <WebsiteReviewCard key={review.id} review={review} />
            ))}
          </div>
        </section>
      ) : null}

      {websiteReview.websiteUrl ? (
        <p className="kxd-ces-portal-home__site-link">
          <a href={websiteReview.websiteUrl} target="_blank" rel="noopener noreferrer">
            {PORTAL_CLIENT_LANGUAGE.reviewCtaSecondary}
          </a>
        </p>
      ) : null}
    </CesPage>
  );
}

export function shouldUseCesPortalHome(
  profile: ResolvedExperienceProfile | null | undefined,
): boolean {
  return Boolean(profile && isCesModuleEnabled(profile, "website-review"));
}
