"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ResolvedExperienceProfile } from "@/lib/ces";
import type { WebsiteReviewItem, WebsiteReviewLandingData } from "@/lib/ces/modules/website-review/types";
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

function pageFilterKey(review: WebsiteReviewItem): string {
  return (
    review.pageLabel?.trim() ||
    review.pagePath?.trim() ||
    review.pageContext?.split("·")[0]?.trim() ||
    "Other"
  );
}

export function WebsiteReviewLanding({ profile, data }: WebsiteReviewLandingProps) {
  const t = profile.terminology;
  const eyebrow = portalCopy(t, "website-review.landing.eyebrow", profile.hospitality.welcomeEyebrow);
  const title = portalCopy(t, "website-review.landing.title", PORTAL_CLIENT_LANGUAGE.reviewHeroTitle);
  const lead = portalCopy(t, "website-review.landing.lead", PORTAL_CLIENT_LANGUAGE.reviewHeroLead);

  const [pageFilter, setPageFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  const pageOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const review of [...data.activeReviews, ...data.completedReviews]) {
      const key = pageFilterKey(review);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [data.activeReviews, data.completedReviews]);

  function matchesFilters(review: WebsiteReviewItem): boolean {
    if (pageFilter !== "all" && pageFilterKey(review) !== pageFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      review.title.toLowerCase().includes(q) ||
      review.details.toLowerCase().includes(q) ||
      (review.pageLabel ?? "").toLowerCase().includes(q) ||
      (review.pageUrl ?? "").toLowerCase().includes(q) ||
      (review.section ?? "").toLowerCase().includes(q) ||
      (review.pageContext ?? "").toLowerCase().includes(q)
    );
  }

  const activeReviews = data.activeReviews.filter(matchesFilters);
  const completedReviews = data.completedReviews.filter(matchesFilters);
  const visibleCompleted = showAllCompleted
    ? completedReviews
    : completedReviews.slice(0, 5);

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

      <section className="kxd-ces-section kxd-ces-review-filters" aria-label="Filter revisions">
        <label className="kxd-ces-review-filters__search">
          <span>Search</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Title, page, notes…"
          />
        </label>
        <div className="kxd-ces-review-filters__pages" role="tablist" aria-label="Pages">
          <button
            type="button"
            role="tab"
            aria-selected={pageFilter === "all"}
            className={`kxd-ces-review-filters__pill${pageFilter === "all" ? " kxd-ces-review-filters__pill--active" : ""}`}
            onClick={() => setPageFilter("all")}
          >
            All pages
          </button>
          {pageOptions.map((page) => (
            <button
              key={page.label}
              type="button"
              role="tab"
              aria-selected={pageFilter === page.label}
              className={`kxd-ces-review-filters__pill${pageFilter === page.label ? " kxd-ces-review-filters__pill--active" : ""}`}
              onClick={() => setPageFilter(page.label)}
            >
              {page.label}
              <span>{page.count}</span>
            </button>
          ))}
        </div>
      </section>

      {activeReviews.length > 0 ? (
        <section className="kxd-ces-section" aria-labelledby="active-reviews-heading">
          <h2 id="active-reviews-heading" className="kxd-ces-section__title">
            {PORTAL_CLIENT_LANGUAGE.reviewActiveSection}
          </h2>
          <div className="kxd-ces-review-list">
            {activeReviews.map((review) => (
              <WebsiteReviewCard key={review.id} review={review} />
            ))}
          </div>
        </section>
      ) : data.activeReviews.length === 0 && data.completedReviews.length === 0 ? (
        <WebsiteReviewEmptyGuide websiteUrl={data.websiteUrl} />
      ) : (
        <section className="kxd-ces-section kxd-ces-section--quiet">
          <p className="kxd-ces-detail-prose kxd-ces-detail-prose--muted">
            No active revisions match this filter.
          </p>
        </section>
      )}

      {completedReviews.length > 0 ? (
        <section
          className="kxd-ces-section kxd-ces-section--quiet kxd-ces-review-history"
          aria-labelledby="completed-reviews-heading"
        >
          <div className="kxd-ces-review-history__head">
            <h2 id="completed-reviews-heading" className="kxd-ces-section__title">
              {PORTAL_CLIENT_LANGUAGE.reviewCompletedSection}
            </h2>
            <p className="kxd-ces-review-history__lead">
              Permanent record of completed website work — nothing disappears.
            </p>
          </div>
          <div className="kxd-ces-review-list">
            {visibleCompleted.map((review) => (
              <WebsiteReviewCard key={review.id} review={review} emphasizeCompleted />
            ))}
          </div>
          {completedReviews.length > 5 ? (
            <button
              type="button"
              className="kxd-ces-btn kxd-ces-btn--ghost"
              onClick={() => setShowAllCompleted((v) => !v)}
            >
              {showAllCompleted
                ? "Show fewer"
                : `Show all ${completedReviews.length} completed`}
            </button>
          ) : null}
        </section>
      ) : null}
    </CesPage>
  );
}
