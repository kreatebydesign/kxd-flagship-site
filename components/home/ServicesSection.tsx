import Link from "next/link";
import { HOMEPAGE_SERVICES } from "@/lib/homepage";

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
            <p className="kxd-eyebrow">Services</p>

            <h2
              className="kxd-serif-title mt-4"
              style={{
                fontSize: "clamp(1.875rem, 3.5vw, 2.5rem)",
              }}
            >
              Built for Brands Ready to Lead.
            </h2>

            <p
              className="kxd-body-sm mt-5"
              style={{ maxWidth: "36rem" }}
            >
              KXD partners with ambitious businesses to build digital
              experiences, operational systems, and brands designed to endure.
            </p>
          </div>

          <Link
            href="/services"
            className="kxd-ui-label inline-flex items-center gap-2 self-end text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
          >
            Explore Capabilities
            <span aria-hidden>→</span>
          </Link>
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
                  style={{ maxWidth: "38rem" }}
                >
                  {service.summary}
                </p>
              </div>

              <span
                aria-hidden
                className="kxd-ui-label mt-1 shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                style={{
                  color: "var(--kxd-gold)",
                }}
              >
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}