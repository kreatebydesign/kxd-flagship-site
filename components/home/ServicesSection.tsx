import Link from "next/link";
import { HOMEPAGE_SERVICES } from "@/lib/homepage";
import { SYSTEMS_MOMENTUM_VISUALS } from "@/lib/homepage/work-visuals";
import { SystemsMomentumCard } from "./SystemsMomentumCard";

export function ServicesSection() {
  return (
    <section
      className="kxd-section border-t"
      style={{
        background: "var(--kxd-black-deep)",
        borderColor: "var(--kxd-border-white)",
      }}
    >
      <div className="kxd-container">
        <div className="mb-14 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="kxd-eyebrow">Capabilities</p>

            <h2
              className="kxd-serif-title mt-4"
              style={{
                fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
                maxWidth: "24ch",
              }}
            >
              Systems Designed to Create Momentum.
            </h2>

            <p
              className="kxd-body-sm mt-5"
              style={{
                maxWidth: "38rem",
                lineHeight: 1.85,
              }}
            >
              We don&apos;t offer disconnected services. KXD combines strategy,
              execution, and operational thinking to help ambitious businesses
              build stronger brands, improve performance, and support long-term
              growth.
            </p>
          </div>

          <Link
            href="/services"
            className="kxd-ui-label inline-flex items-center gap-2 self-end text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
          >
            Explore Capabilities
            <span
              aria-hidden
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </div>

        <div className="mb-14 grid gap-4 md:grid-cols-3">
          {SYSTEMS_MOMENTUM_VISUALS.map((visual) => (
            <SystemsMomentumCard key={visual.src} visual={visual} />
          ))}
        </div>

        <div className="kxd-gold-rule" />

        <div>
          {HOMEPAGE_SERVICES.map((service) => (
            <Link
              key={service.slug}
              href={`/services/${service.slug}`}
              className="kxd-service-index-row group"
              aria-label={service.title}
            >
              <span
                className="kxd-label pt-1 text-[var(--kxd-gold)]"
                style={{
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {service.number}
              </span>

              <div className="min-w-0">
                <h3
                  className="font-serif font-light transition-colors duration-200 group-hover:text-[var(--kxd-gold-light)]"
                  style={{
                    fontSize: "clamp(1.125rem, 2vw, 1.5rem)",
                    letterSpacing: "0.01em",
                    lineHeight: 1.15,
                    color: "var(--kxd-cream)",
                  }}
                >
                  {service.title}
                </h3>

                <p
                  className="kxd-body-sm mt-2.5"
                  style={{
                    maxWidth: "38rem",
                    lineHeight: 1.8,
                  }}
                >
                  {service.summary}
                </p>

                <p
                  className="mt-3 font-sans text-[0.625rem] font-medium uppercase tracking-[0.14em]"
                  style={{
                    color: "var(--kxd-gold)",
                    opacity: 0.75,
                  }}
                >
                  {service.creates}
                </p>
              </div>

              <span
                aria-hidden
                className="kxd-ui-label mt-1 shrink-0 opacity-0 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100"
                style={{
                  color: "var(--kxd-gold)",
                }}
              >
                →
              </span>
            </Link>
          ))}
        </div>

        <div
          className="mt-16 grid gap-6 border-t pt-10 md:grid-cols-3"
          style={{
            borderColor: "var(--kxd-border-white)",
          }}
        >
          {[
            {
              title: "Strategy",
              description:
                "Every engagement begins with understanding your business, audience, and growth objectives.",
            },
            {
              title: "Systems",
              description:
                "We build operational foundations designed to support efficiency, consistency, and scale.",
            },
            {
              title: "Growth",
              description:
                "The goal isn't launch day. It's creating momentum that compounds over time.",
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
      </div>
    </section>
  );
}
