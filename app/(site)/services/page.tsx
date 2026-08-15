import type { Metadata } from "next";
import Link from "next/link";
import {
  STATIC_SERVICE_DETAILS,
  STATIC_SERVICE_SLUGS,
} from "@/lib/content/service-details";
import { HOMEPAGE_SERVICES } from "@/lib/homepage";
import { FinalCtaBand } from "@/components/ui/FinalCtaBand";
import { GoldAtmosphere } from "@/components/ui/surfaces/GoldAtmosphere";
import { buildMetadata } from "@/lib/seo/metadata";
import { serviceSchema } from "@/lib/seo/schema";
import { StructuredData } from "@/components/seo/StructuredData";

export const metadata: Metadata = buildMetadata({
  title: "Services",
  description:
    "Brand systems, website experiences, growth infrastructure, and operational platforms — built with discipline by Kreate by Design.",
  path: "/services",
  keywords: [
    "Website Redesign",
    "Brand Systems",
    "Growth Infrastructure",
    "Operational Systems",
    "Client Portals",
  ],
});

interface ServiceItem {
  slug: string;
  title: string;
  categoryLabel: string;
  headline: string;
  summary: string;
  bestFor: string[];
  ctaLabel: string;
}

/**
 * Overview uses static service details in homepage ladder order so CMS seed
 * copy cannot drift acquisition positioning.
 */
function fetchServices(): ServiceItem[] {
  const orderedSlugs = [
    ...HOMEPAGE_SERVICES.map((s) => String(s.slug)),
    ...STATIC_SERVICE_SLUGS.filter(
      (slug) => !HOMEPAGE_SERVICES.some((s) => s.slug === slug),
    ),
  ];

  return orderedSlugs
    .map((slug) => STATIC_SERVICE_DETAILS[slug])
    .filter(Boolean)
    .map((detail) => ({
      slug: detail.slug,
      title: detail.title,
      categoryLabel: detail.categoryLabel,
      headline: detail.headline,
      summary: detail.summary,
      bestFor: detail.bestFor.slice(0, 3),
      ctaLabel: "Explore Service",
    }));
}

export default function ServicesPage() {
  const services = fetchServices();

  return (
    <>
      <StructuredData
        data={services.map((s) =>
          serviceSchema({
            title: s.title,
            description: s.summary,
            path: `/services/${s.slug}`,
          }),
        )}
      />

      <section
        className="relative overflow-hidden border-b"
        style={{
          paddingTop: "calc(var(--nav-height) + var(--section-py))",
          paddingBottom: "var(--section-py)",
          background: "var(--kxd-black-pure)",
          borderColor: "var(--kxd-border-white)",
        }}
      >
        <GoldAtmosphere intensity="hero" />

        <div className="kxd-container relative z-10" style={{ maxWidth: "58rem" }}>
          <p className="kxd-eyebrow">Services</p>

          <h1
            className="mt-5 font-serif font-light"
            style={{
              fontSize: "clamp(3rem, 6vw, 5rem)",
              lineHeight: 1.02,
              letterSpacing: "-0.01em",
              color: "var(--kxd-cream)",
            }}
          >
            Presence. Growth.
            <br />
            <em style={{ fontStyle: "italic", color: "var(--kxd-cream-soft)" }}>
              Deeper Systems.
            </em>
          </h1>

          <p
            className="mt-7 font-serif font-light"
            style={{
              fontSize: "clamp(1rem, 1.5vw, 1.1875rem)",
              lineHeight: 1.8,
              color: "var(--kxd-cream-muted)",
              maxWidth: "40rem",
            }}
          >
            KXD starts where the business needs clarity most — brand, website,
            growth infrastructure, or operational platforms — and goes deeper
            only when the work requires it.
          </p>
        </div>
      </section>

      <section
        style={{
          background: "var(--kxd-black-deep)",
          borderTop: "1px solid var(--kxd-border-white)",
          borderBottom: "1px solid var(--kxd-border-white)",
        }}
      >
        <div
          className="kxd-container"
          style={{
            paddingBlock: "clamp(3rem, 6vw, 4.5rem)",
            maxWidth: "64rem",
          }}
        >
          <p className="kxd-eyebrow">How Engagements Move</p>

          <h2
            className="mt-5 font-serif font-light"
            style={{
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
              lineHeight: 1.15,
              color: "var(--kxd-cream)",
              maxWidth: "28ch",
            }}
          >
            Enter through brand, website, growth, or systems. Expand only when
            it makes business sense.
          </h2>

          <p
            className="mt-6 font-serif font-light"
            style={{
              fontSize: "clamp(1rem, 1.4vw, 1.125rem)",
              lineHeight: 1.9,
              color: "var(--kxd-cream-muted)",
              maxWidth: "40rem",
            }}
          >
            Some clients need a stronger presence. Others need measurement and
            demand structure. A smaller set needs portals, workflows, and
            operational infrastructure. KXD stays involved deeper than a
            traditional agency when the business requires it — without forcing
            every engagement into a funnel.
          </p>
        </div>
      </section>

      <section style={{ background: "var(--kxd-black-base)" }}>
        <div className="kxd-container">
          {services.map((service, i) => (
            <article
              key={service.slug}
              id={service.slug}
              className="border-t"
              style={{ borderColor: "var(--kxd-border-white)" }}
            >
              <div className="py-14 lg:py-20">
                <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16 xl:gap-24">
                  <div className="relative">
                    <span
                      aria-hidden
                      className="absolute -top-2 right-0 select-none font-serif font-light leading-none lg:left-0 lg:right-auto"
                      style={{
                        fontSize: "clamp(4rem, 8vw, 7rem)",
                        color: "var(--kxd-gold)",
                        opacity: 0.06,
                        letterSpacing: "-0.04em",
                        pointerEvents: "none",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    <div className="relative pt-1">
                      <span
                        className="inline-block border font-sans uppercase"
                        style={{
                          fontSize: "0.5rem",
                          letterSpacing: "var(--tracking-label)",
                          color: "var(--kxd-gold)",
                          borderColor: "var(--kxd-border-gold)",
                          padding: "0.25rem 0.625rem",
                        }}
                      >
                        {service.categoryLabel}
                      </span>

                      <h2
                        className="mt-5 font-serif font-light"
                        style={{
                          fontSize: "clamp(1.5rem, 2.75vw, 2.125rem)",
                          lineHeight: 1.15,
                          letterSpacing: "0.01em",
                          color: "var(--kxd-cream)",
                        }}
                      >
                        {service.title}
                      </h2>

                      <p
                        className="mt-5 font-serif font-light italic"
                        style={{
                          fontSize: "clamp(0.9375rem, 1.3vw, 1.0625rem)",
                          lineHeight: 1.8,
                          color: "var(--kxd-cream-muted)",
                        }}
                      >
                        {service.summary}
                      </p>

                      <Link
                        href={`/services/${service.slug}`}
                        className="group mt-7 inline-flex items-center gap-2.5 font-sans uppercase"
                        style={{
                          fontSize: "0.625rem",
                          letterSpacing: "var(--tracking-button)",
                          color: "var(--kxd-gold)",
                        }}
                      >
                        <span className="transition-opacity group-hover:opacity-70">
                          {service.ctaLabel}
                        </span>
                        <span
                          aria-hidden
                          className="inline-block transition-transform duration-300 group-hover:translate-x-1"
                        >
                          →
                        </span>
                      </Link>
                    </div>
                  </div>

                  {service.bestFor.length > 0 && (
                    <div className="self-start lg:pt-2">
                      <p
                        className="mb-5 font-sans uppercase"
                        style={{
                          fontSize: "0.5rem",
                          letterSpacing: "var(--tracking-label)",
                          color: "var(--kxd-cream-muted)",
                          opacity: 0.55,
                        }}
                      >
                        Built For
                      </p>

                      <ul className="space-y-4">
                        {service.bestFor.map((item, j) => (
                          <li
                            key={j}
                            className="flex items-start gap-4 border-l pl-5"
                            style={{ borderColor: "var(--kxd-border-gold)" }}
                          >
                            <span
                              aria-hidden
                              className="mt-[3px] shrink-0"
                              style={{
                                fontSize: "0.375rem",
                                color: "var(--kxd-gold)",
                                opacity: 0.7,
                              }}
                            >
                              ◆
                            </span>

                            <p
                              className="font-sans font-light"
                              style={{
                                fontSize: "clamp(0.875rem, 1.15vw, 1rem)",
                                lineHeight: 1.75,
                                color: "var(--kxd-cream-soft)",
                              }}
                            >
                              {item}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <FinalCtaBand
        headline="Ready to Build With Intention?"
        subCopy="KXD partners with a limited number of businesses at a time — whether the next step is presence, growth, or deeper systems."
        secondaryHref="/investment"
        secondaryLabel="View Investment"
      />
    </>
  );
}
