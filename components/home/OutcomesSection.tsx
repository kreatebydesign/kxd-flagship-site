import Link from "next/link";

const OUTCOMES = [
  {
    category: "Motorsports",
    headline: "Operational ecosystems built for performance.",
    result:
      "We unify public-facing experiences, driver operations, CRM architecture, and internal systems into a single ecosystem designed to support growth on and off the track.",
  },
  {
    category: "Hospitality",
    headline: "Experiences that establish trust before arrival.",
    result:
      "Premium hospitality brands require more than beautiful visuals. We align perception, guest expectations, and operational readiness from the very first interaction.",
  },
  {
    category: "Automotive",
    headline: "Digital experiences that qualify opportunities.",
    result:
      "We help automotive brands translate craftsmanship and credibility into stronger positioning that attracts better-fit clients and more intentional conversations.",
  },
  {
    category: "Growth Infrastructure",
    headline: "Systems designed to support expansion.",
    result:
      "From CRM workflows to inquiry architecture and operational tooling, we create foundations that enable businesses to grow without unnecessary complexity.",
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
        <div className="mb-14 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="kxd-eyebrow">Outcomes</p>

            <h2
              className="kxd-serif-title mt-4"
              style={{
                fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
                maxWidth: "26rem",
              }}
            >
              Success measured beyond launch.
            </h2>

            <p
              className="kxd-body-sm mt-5"
              style={{
                maxWidth: "38rem",
                lineHeight: 1.85,
              }}
            >
              KXD measures success by what the work enables: stronger positioning,
              cleaner operations, higher-quality opportunities, and systems that
              continue creating value long after launch.
            </p>
          </div>

          <Link
            href="/work"
            className="kxd-ui-label inline-flex items-center gap-2 self-end text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
          >
            Explore Case Studies
            <span
              aria-hidden
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </div>

        <div className="kxd-gold-rule" />

        <div>
          {OUTCOMES.map((outcome, i) => (
            <div
              key={outcome.category}
              className="grid gap-6 py-10 lg:grid-cols-[12rem_1fr]"
              style={{
                borderTop:
                  i === 0 ? "none" : "1px solid var(--kxd-border-white)",
              }}
            >
              <div className="lg:pt-1">
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

              <div
                className="border-l pl-8"
                style={{ borderColor: "var(--kxd-border-gold)" }}
              >
                <h3
                  className="font-serif font-light"
                  style={{
                    fontSize: "clamp(1.125rem, 1.8vw, 1.5rem)",
                    lineHeight: 1.25,
                    color: "var(--kxd-cream)",
                    letterSpacing: "0.01em",
                    maxWidth: "32rem",
                  }}
                >
                  {outcome.headline}
                </h3>

                <p
                  className="mt-4 font-serif font-light leading-[1.72]"
                  style={{
                    fontSize: "clamp(1rem, 1.6vw, 1.125rem)",
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

        <div
          className="mt-12 grid gap-6 border-t pt-10 md:grid-cols-3"
          style={{
            borderColor: "var(--kxd-border-white)",
          }}
        >
          {[
            {
              title: "Positioning",
              description:
                "Strengthening how brands are perceived by the people they want to reach.",
            },
            {
              title: "Operations",
              description:
                "Creating clarity and efficiency through better systems and workflows.",
            },
            {
              title: "Growth",
              description:
                "Building infrastructure capable of supporting what comes next.",
            },
          ].map((pillar) => (
            <div key={pillar.title}>
              <p
                className="font-sans text-[0.625rem] font-medium uppercase tracking-[0.14em]"
                style={{
                  color: "var(--kxd-gold)",
                }}
              >
                {pillar.title}
              </p>

              <p
                className="kxd-body-sm mt-3"
                style={{
                  lineHeight: 1.8,
                }}
              >
                {pillar.description}
              </p>
            </div>
          ))}
        </div>

        <div
          className="mt-10 border-l pl-6"
          style={{
            borderColor: "var(--kxd-border-gold)",
          }}
        >
          <p
            className="font-serif font-light italic"
            style={{
              fontSize: "clamp(0.9375rem, 1.3vw, 1.0625rem)",
              letterSpacing: "0.01em",
              lineHeight: 1.75,
              color: "var(--foreground-subtle)",
              maxWidth: "46rem",
            }}
          >
            KXD doesn't chase vanity metrics. We focus on the outcomes that
            matter most: trust, perception, operational clarity, conversion
            quality, and the long-term strength of the systems supporting the
            brand.
          </p>
        </div>
      </div>
    </section>
  );
}