import Link from "next/link";
import { EditorialWorkFrame } from "./EditorialWorkFrame";
import {
  OUTCOME_CAPABILITY_VISUALS,
  OUTCOMES_HEADER_VISUAL,
} from "@/lib/homepage/work-visuals";

const CAPABILITIES = [
  {
    category: "Websites",
    headline: "Websites designed to be remembered.",
    result:
      "We create digital experiences that build trust, shape perception, and help businesses stand apart.",
  },
  {
    category: "Branding",
    headline: "Brands built with intention.",
    result:
      "Identity systems designed to create clarity, recognition, and lasting impact.",
  },
  {
    category: "Systems",
    headline: "Systems built to scale.",
    result:
      "Operational infrastructure, automations, and internal tools designed to support growth behind the scenes.",
  },
  {
    category: "Partnership",
    headline: "Partnerships built for what's next.",
    result:
      "Ongoing creative and strategic support for businesses committed to long-term growth.",
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
        <div className="mb-14 grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-end lg:gap-14">
          <div>
            <p className="kxd-eyebrow">Capabilities</p>

            <h2
              className="kxd-serif-title mt-4"
              style={{
                fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
                maxWidth: "26rem",
              }}
            >
              Built for every stage of your growth.
            </h2>

            <p
              className="kxd-body-sm mt-5"
              style={{
                maxWidth: "38rem",
                lineHeight: 1.85,
              }}
            >
              KXD builds the website, the brand, and the systems behind it.
              Every engagement is structured to create output that compounds
              in value long after the work is delivered.
            </p>

            <Link
              href="/services"
              className="kxd-ui-label mt-8 inline-flex items-center gap-2 text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)] lg:hidden"
            >
              Explore Capabilities
              <span aria-hidden>→</span>
            </Link>
          </div>

          <EditorialWorkFrame
            src={OUTCOMES_HEADER_VISUAL.src}
            alt={OUTCOMES_HEADER_VISUAL.alt}
            href={OUTCOMES_HEADER_VISUAL.href}
            label={OUTCOMES_HEADER_VISUAL.label}
            objectPosition={OUTCOMES_HEADER_VISUAL.objectPosition}
            aspectClass="aspect-[16/10] lg:aspect-[5/4]"
            sizes="(max-width: 1024px) 100vw, 42vw"
            reveal
            className="kxd-reveal-delay-2"
          />
        </div>

        <div className="mb-14 hidden items-center justify-end lg:flex">
          <Link
            href="/services"
            className="kxd-ui-label inline-flex items-center gap-2 text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
          >
            Explore Capabilities
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="kxd-gold-rule" />

        <div>
          {CAPABILITIES.map((item, i) => {
            const visual = OUTCOME_CAPABILITY_VISUALS[item.category];

            return (
              <div
                key={item.category}
                className="grid gap-8 py-10 lg:grid-cols-[12rem_1fr_auto] lg:items-start lg:gap-10"
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
                    {item.category}
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
                    {item.headline}
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
                    {item.result}
                  </p>
                </div>

                {visual ? (
                  <div className="hidden w-full max-w-[17.5rem] shrink-0 lg:block">
                    <EditorialWorkFrame
                      src={visual.src}
                      alt={visual.alt}
                      href={visual.href}
                      label={visual.label}
                      objectPosition={visual.objectPosition}
                      aspectClass="aspect-[4/3]"
                      sizes="280px"
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
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
            KXD doesn&apos;t chase vanity metrics. We focus on the outcomes
            that matter most: trust, perception, operational clarity,
            conversion quality, and the long-term strength of the systems
            supporting the brand.
          </p>
        </div>
      </div>
    </section>
  );
}
