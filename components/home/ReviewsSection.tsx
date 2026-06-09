import { HOMEPAGE_REVIEWS } from "@/lib/homepage";

function GoldStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
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

export function ReviewsSection() {
  const reviews = HOMEPAGE_REVIEWS;

  return (
    <section
      className="kxd-section border-t"
      style={{
        background: "var(--kxd-black-base)",
        borderColor: "var(--kxd-border-white)",
      }}
    >
      <div className="kxd-container">
        {/* Header */}
        <div className="mb-14 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="kxd-eyebrow">Client Reviews</p>
            <h2
              className="kxd-serif-title mt-4"
              style={{ fontSize: "clamp(1.875rem, 3.5vw, 2.5rem)" }}
            >
              Trusted by brands that expect more.
            </h2>
          </div>

          {/* Score — restrained */}
          <div
            className="flex items-center gap-5 self-end border-l pl-8"
            style={{ borderColor: "var(--kxd-border-gold)" }}
          >
            <div>
              <p
                className="font-serif font-light"
                style={{ fontSize: "2.5rem", color: "var(--kxd-gold)", lineHeight: 1 }}
              >
                5.0
              </p>
              <GoldStars rating={5} />
            </div>
            <div
              className="h-10 w-px"
              aria-hidden
              style={{ background: "var(--kxd-border-white)" }}
            />
            <div>
              <p className="kxd-label">Google</p>
              <p className="kxd-label mt-1">Reviews</p>
            </div>
          </div>
        </div>

        {/* Reviews — editorial, not grid cards */}
        <div>
          {reviews.map((review, i) => (
            <article
              key={review.id}
              className="grid gap-8 py-8 lg:grid-cols-[14rem_1fr]"
              style={{
                borderTop: "1px solid var(--kxd-border-white)",
                ...(i === reviews.length - 1
                  ? { borderBottom: "1px solid var(--kxd-border-white)" }
                  : {}),
              }}
            >
              {/* Attribution */}
              <div className="flex flex-col gap-1.5 lg:pt-1">
                <GoldStars rating={review.rating} />
                <p className="mt-3 text-[0.9375rem] font-medium text-[var(--kxd-cream)]">
                  {review.author}
                </p>
                <p className="kxd-label">{review.company}</p>
              </div>

              {/* Quote */}
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
          ))}
        </div>
      </div>
    </section>
  );
}
