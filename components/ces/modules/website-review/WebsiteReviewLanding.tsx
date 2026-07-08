import Link from "next/link";
import type { ResolvedExperienceProfile } from "@/lib/ces";
import type { WebsiteReviewLandingData } from "@/lib/ces/modules/website-review/types";
import { portalCopy, PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";
import { CesHero, CesPage } from "@/components/ces/primitives";
import { WebsiteReviewCard } from "./WebsiteReviewCard";
import {
  WebsiteReviewEmptyGuide,
  WebsiteReviewReassurance,
} from "./WebsiteReviewReassurance";

export interface WebsiteReviewLandingProps {
  profile: ResolvedExperienceProfile;
  data: WebsiteReviewLandingData;
}

export function WebsiteReviewLanding({ profile, data }: WebsiteReviewLandingProps) {
  const t = profile.terminology;
  const eyebrow = portalCopy(t, "website-review.landing.eyebrow", profile.hospitality.welcomeEyebrow);
  const title = portalCopy(t, "website-review.landing.title", PORTAL_CLIENT_LANGUAGE.reviewHeroTitle);
  const lead = portalCopy(t, "website-review.landing.lead", PORTAL_CLIENT_LANGUAGE.reviewHeroLead);

  return (
    <CesPage>
      <CesHero
        eyebrow={eyebrow}
        title={title}
        lead={lead}
        presence
        actions={
          <div className="kxd-ces-hero__action-row">
            {data.websiteUrl ? (
              <Link
                href="/portal/website-review/session/new"
                className="kxd-ces-btn kxd-ces-btn--primary"
              >
                {portalCopy(
                  t,
                  "website-review.cta.visual",
                  PORTAL_CLIENT_LANGUAGE.reviewCtaVisual,
                )}
              </Link>
            ) : null}
            <Link href="/portal/website-review/request" className="kxd-ces-btn kxd-ces-btn--ghost">
              {portalCopy(t, "website-review.cta.request", PORTAL_CLIENT_LANGUAGE.reviewCtaPrimary)}
            </Link>
            {data.websiteUrl ? (
              <a
                href={data.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="kxd-ces-btn kxd-ces-btn--ghost"
              >
                {PORTAL_CLIENT_LANGUAGE.reviewCtaSecondary}
              </a>
            ) : null}
          </div>
        }
      />

      <WebsiteReviewReassurance />

      {data.activeReviews.length > 0 ? (
        <section className="kxd-ces-section" aria-labelledby="active-reviews-heading">
          <h2 id="active-reviews-heading" className="kxd-ces-section__title">
            {PORTAL_CLIENT_LANGUAGE.reviewActiveSection}
          </h2>
          <div className="kxd-ces-review-list">
            {data.activeReviews.map((review) => (
              <WebsiteReviewCard key={review.id} review={review} />
            ))}
          </div>
        </section>
      ) : (
        <WebsiteReviewEmptyGuide websiteUrl={data.websiteUrl} />
      )}

      {data.completedReviews.length > 0 ? (
        <section className="kxd-ces-section kxd-ces-section--quiet" aria-labelledby="completed-reviews-heading">
          <h2 id="completed-reviews-heading" className="kxd-ces-section__title">
            {PORTAL_CLIENT_LANGUAGE.reviewCompletedSection}
          </h2>
          <div className="kxd-ces-review-list">
            {data.completedReviews.map((review) => (
              <WebsiteReviewCard key={review.id} review={review} />
            ))}
          </div>
        </section>
      ) : null}
    </CesPage>
  );
}
