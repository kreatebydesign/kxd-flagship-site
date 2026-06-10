/**
 * ReviewsSection — async server component.
 *
 * Fetches reviews from Google Business Profile (via lib/google-reviews.ts)
 * when GOOGLE_PLACES_API_KEY + GOOGLE_PLACE_ID are configured.
 * Falls back silently to PLACEHOLDER_REVIEWS if credentials are absent or if
 * anything in the fetch pipeline fails.
 *
 * Cached at the Next.js data layer (1hr revalidation). The page renders as
 * fully static during build when credentials are not present.
 */

import { getGoogleReviews, getAggregateRating } from "@/lib/google-reviews";
import type { ReviewItem } from "@/lib/reviews";

function GoldStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          width="11"
          height="11"
          viewBox="0 0 11 11"
          fill="none"
          aria-hidden
        >
          <path
            d="M5.5 0.917L6.714 3.758L9.9 3.993L7.587 5.906L8.344 8.99L5.5 7.25L2.656 8.99L3.413 5.906L1.1 3.993L4.286 3.758L5.5 0.917Z"
            fill={i < Math.floor(rating) ? "#C5A65C" : "transparent"}
            stroke="#C5A65C"
            strokeWidth="0.7"
            opacity={i < Math.floor(rating) ? 1 : 0.3}
          />
        </svg>
      ))}
    </div>
  );
}

function GoogleBadge() {
  return (
    <span
      className="inline-flex items-center gap-1"
      style={{
        fontSize: "0.5625rem",
        fontFamily: "var(--font-outfit, sans-serif)",
        fontWeight: 500,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--kxd-gold)",
        opacity: 0.7,
      }}
    >
      via Google
    </span>
  );
}

function ReviewCard({
  review,
  isLast,
  isFirst,
}: {
  review: ReviewItem;
  isLast: boolean;
  isFirst: boolean;
}) {
  return (
    <article
      className="grid gap-8 py-9 lg:grid-cols-[14rem_1fr]"
      style={{
        borderTop: isFirst ? undefined : "1px solid var(--kxd-border-white)",
        ...(isLast ? { borderBottom: "1px solid var(--kxd-border-white)" } : {}),
      }}
    >
      <div className="flex flex-col gap-1.5 lg:pt-1">
        <GoldStars rating={review.rating} />

        <p className="mt-3 text-[0.9375rem] font-medium text-[var(--kxd-cream)]">
          {review.author}
        </p>

        {review.company && (
          <p className="kxd-label">{review.company}</p>
        )}

        {review.source === "google" && <GoogleBadge />}
      </div>

      <div
        className="border-l pl-8"
        style={{ borderColor: "var(--kxd-border-gold)" }}
      >
        <p
          className="font-serif font-light leading-[1.7]"
          style={{
            fontSize: "clamp(1.0625rem, 1.8vw, 1.25rem)",
            letterSpacing: "0.005em",
            color: "var(--kxd-cream-soft)",
          }}
        >
          &ldquo;{review.text}&rdquo;
        </p>
      </div>
    </article>
  );
}

export async function ReviewsSection() {
  const reviews     = await getGoogleReviews();
  const avgRating   = getAggregateRating(reviews);
  const displayRating = avgRating > 0 ? avgRating.toFixed(1) : "5.0";
  const isFromGoogle = reviews.some(r => r.source === "google");

  return (
    <section
      className="kxd-section border-t"
      style={{
        background: "var(--kxd-black-base)",
        borderColor: "var(--kxd-border-white)",
      }}
    >
      <div className="kxd-container">
        <div className="mb-14 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="kxd-eyebrow">Client Trust</p>

            <h2
              className="kxd-serif-title mt-4"
              style={{
                fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
                maxWidth: "32rem",
              }}
            >
              Partnerships built on clarity, trust, and execution.
            </h2>

            <p
              className="kxd-body-sm mt-5"
              style={{
                maxWidth: "38rem",
                lineHeight: 1.85,
              }}
            >
              KXD partnerships are built for businesses that value sharp strategy,
              premium execution, and the confidence that comes from having the right
              creative partner in the room.
            </p>
          </div>

          <div
            className="flex items-center gap-5 self-end border-l pl-8"
            style={{ borderColor: "var(--kxd-border-gold)" }}
          >
            <div>
              <p
                className="font-serif font-light"
                style={{
                  fontSize: "2.5rem",
                  color: "var(--kxd-gold)",
                  lineHeight: 1,
                }}
              >
                {displayRating}
              </p>

              <GoldStars rating={avgRating || 5} />
            </div>

            <div
              className="h-10 w-px"
              aria-hidden
              style={{ background: "var(--kxd-border-white)" }}
            />

            <div>
              <p className="kxd-label">{isFromGoogle ? "Google" : "Verified"}</p>
              <p className="kxd-label mt-1">Client Reviews</p>
            </div>
          </div>
        </div>

        <div>
          {reviews.map((review, i) => (
            <ReviewCard
              key={review.id}
              review={review}
              isFirst={i === 0}
              isLast={i === reviews.length - 1}
            />
          ))}
        </div>

        <div
          className="mt-10 grid gap-6 border-t pt-10 md:grid-cols-3"
          style={{
            borderColor: "var(--kxd-border-white)",
          }}
        >
          {[
            {
              label: "Strategic Confidence",
              copy: "Clients know where the work is going and why each decision matters.",
            },
            {
              label: "Founder-Led Execution",
              copy: "Every engagement receives direct oversight and senior-level decision-making.",
            },
            {
              label: "Long-Term Value",
              copy: "The work is built to support the brand beyond the first launch window.",
            },
          ].map((item) => (
            <div key={item.label}>
              <p
                className="font-sans text-[0.625rem] font-medium uppercase tracking-[0.14em]"
                style={{
                  color: "var(--kxd-gold)",
                }}
              >
                {item.label}
              </p>

              <p
                className="kxd-body-sm mt-3"
                style={{
                  lineHeight: 1.8,
                }}
              >
                {item.copy}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
