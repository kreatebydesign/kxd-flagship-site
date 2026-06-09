import Link from "next/link";

const OUTCOMES = [
  {
    category: "Motorsports",
    result:
      "Operational systems and digital infrastructure supporting a competitive motorsports organization — driver portals, partner platforms, and public-facing brand presence unified into a single ecosystem.",
  },
  {
    category: "Hospitality",
    result:
      "Premium hospitality experiences designed for inquiry conversion — digital presences that carry the same care as the physical space, setting the right expectation before the guest arrives.",
  },
  {
    category: "Automotive",
    result:
      "Brand-forward digital experiences that attract qualified clients before the first conversation — turning precision craft into a filter for the right opportunities.",
  },
  {
    category: "Growth Infrastructure",
    result:
      "End-to-end digital growth systems — combining website, inquiry architecture, CRM integration, and operational tooling into a foundation designed to scale without adding overhead.",
  },
] as const;

export function OutcomesSection() {
  return (
    <section
      className="kxd-section border-t"
      style={{
        background: "var(--kxd-black-pure)",
        borderColor: "var(--kxd-border-white)",
      }}
    >
      <div className="kxd-container">
        {/* Header */}
        <div className="mb-14 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="kxd-eyebrow">Results</p>
            <h2
              className="kxd-serif-title mt-4"
              style={{ fontSize: "clamp(1.875rem, 3.5vw, 2.5rem)" }}
            >
              Selected Outcomes.
            </h2>
          </div>
          <Link
            href="/work"
            className="kxd-ui-label self-end inline-flex items-center gap-2 text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
          >
            View Full Work
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="kxd-gold-rule" />

        {/* Outcomes list */}
        <div>
          {OUTCOMES.map((outcome, i) => (
            <div
              key={outcome.category}
              className="grid gap-6 py-8 lg:grid-cols-[10rem_1fr]"
              style={{
                borderTop: i === 0 ? "none" : "1px solid var(--kxd-border-white)",
              }}
            >
              {/* Category */}
              <div className="lg:pt-0.5">
                <p
                  className="font-sans font-medium uppercase"
                  style={{
                    fontSize: "0.5625rem",
                    letterSpacing: "0.16em",
                    color: "var(--kxd-gold)",
                  }}
                >
                  {outcome.category}
                </p>
              </div>

              {/* Result */}
              <div
                className="border-l pl-8"
                style={{ borderColor: "var(--kxd-border-gold)" }}
              >
                <p
                  className="font-serif font-light leading-[1.72]"
                  style={{
                    fontSize: "clamp(1rem, 1.6vw, 1.1875rem)",
                    letterSpacing: "0.005em",
                    color: "var(--kxd-cream-soft)",
                    maxWidth: "52rem",
                  }}
                >
                  {outcome.result}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <div
          className="mt-8 border-t pt-8"
          style={{ borderColor: "var(--kxd-border-white)" }}
        >
          <p
            className="font-serif font-light italic"
            style={{
              fontSize: "clamp(0.875rem, 1.3vw, 1rem)",
              letterSpacing: "0.01em",
              color: "var(--foreground-subtle)",
              maxWidth: "44rem",
            }}
          >
            KXD does not fabricate metrics. Every outcome above reflects real
            engagements, real brands, and real results — measured by the
            standard each client holds themselves to.
          </p>
        </div>
      </div>
    </section>
  );
}
