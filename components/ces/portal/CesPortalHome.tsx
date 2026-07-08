import Link from "next/link";
import type { ResolvedExperienceProfile } from "@/lib/ces";
import { isCesModuleEnabled } from "@/lib/ces";
import { portalCopy, PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";
import type { WebsiteReviewLandingData } from "@/lib/ces/modules/website-review/types";
import { reviewStatusLabel } from "@/lib/ces/vocabulary/website-review";
import { portalFirstName, portalTimeGreeting } from "@/lib/portal/greeting";
import { CesHero, CesPage } from "@/components/ces/primitives";
import { WebsiteReviewCard } from "@/components/ces/modules/website-review/WebsiteReviewCard";
import { WebsiteReviewEmptyGuide } from "@/components/ces/modules/website-review/WebsiteReviewReassurance";

export interface CesPortalHomeProps {
  displayName: string;
  profile: ResolvedExperienceProfile;
  websiteReview: WebsiteReviewLandingData;
}

export function CesPortalHome({
  displayName,
  profile,
  websiteReview,
}: CesPortalHomeProps) {
  const t = profile.terminology;
  const awaitingInput = websiteReview.activeReviews.filter(
    (r) => r.status === "awaiting-your-input",
  );
  const inProgress = websiteReview.activeReviews.filter(
    (r) => r.status !== "awaiting-your-input",
  );

  const firstName = portalFirstName(displayName);
  const eyebrow = portalCopy(t, "portal.home.eyebrow", profile.hospitality.welcomeEyebrow);
  const title = portalTimeGreeting(firstName);
  const lead = portalCopy(t, "portal.home.lead", PORTAL_CLIENT_LANGUAGE.homeLead);

  return (
    <CesPage className="kxd-ces-portal-home kxd-ces-page--enter">
      <CesHero eyebrow={eyebrow} title={title} lead={lead} />

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
          <p className="kxd-ces-focus-card__reassurance">
            {profile.hospitality.reassuranceLine ?? PORTAL_CLIENT_LANGUAGE.focusReassurance}
          </p>
        </div>
        <div className="kxd-ces-focus-card__actions">
          {websiteReview.websiteUrl ? (
            <Link
              href="/portal/website-review/session/new"
              className="kxd-ces-btn kxd-ces-btn--primary"
            >
              {portalCopy(t, "website-review.cta.visual", PORTAL_CLIENT_LANGUAGE.reviewCtaVisual)}
            </Link>
          ) : null}
          <Link href="/portal/website-review/request" className="kxd-ces-btn kxd-ces-btn--ghost">
            {portalCopy(t, "website-review.cta.request", PORTAL_CLIENT_LANGUAGE.reviewCtaPrimary)}
          </Link>
          <Link href="/portal/website-review" className="kxd-ces-btn kxd-ces-btn--ghost">
            {PORTAL_CLIENT_LANGUAGE.viewAllRevisions}
          </Link>
        </div>
      </section>

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

      {inProgress.length > 0 ? (
        <section className="kxd-ces-section kxd-ces-section--supporting" aria-labelledby="ces-happening-heading">
          <div className="kxd-ces-section__head">
            <h2 id="ces-happening-heading" className="kxd-ces-section__title">
              {PORTAL_CLIENT_LANGUAGE.happeningHeading}
            </h2>
            <Link href="/portal/website-review" className="kxd-ces-section__link">
              {PORTAL_CLIENT_LANGUAGE.viewAllRevisions}
            </Link>
          </div>
          <div className="kxd-ces-review-list">
            {inProgress.slice(0, 3).map((review) => (
              <WebsiteReviewCard key={review.id} review={review} />
            ))}
          </div>
        </section>
      ) : websiteReview.activeReviews.length === 0 ? (
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
            {websiteReview.completedReviews.slice(0, 2).map((review) => (
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
