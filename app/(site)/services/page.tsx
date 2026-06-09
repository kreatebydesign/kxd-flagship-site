import type { Metadata } from "next";
import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import { HOMEPAGE_SERVICES } from "@/lib/homepage";
import { FinalCtaBand } from "@/components/ui/FinalCtaBand";
import { GoldAtmosphere } from "@/components/ui/surfaces/GoldAtmosphere";
import { buildMetadata } from "@/lib/seo/metadata";
import { serviceSchema } from "@/lib/seo/schema";
import { StructuredData } from "@/components/seo/StructuredData";

export const metadata: Metadata = buildMetadata({
  title: "Services",
  description:
    "Luxury websites, brand systems, growth infrastructure, and operational platforms — built with discipline by Kreate by Design.",
  path: "/services",
  keywords: [
    "Luxury Website Design",
    "Los Angeles Web Design",
    "Growth Infrastructure",
    "Operational Systems",
  ],
});

// ── Unified service shape ─────────────────────────────────────────────────────

interface ServiceItem {
  slug: string;
  title: string;
  category: string;
  headline: string;
  summary: string;
  bestFor: string[];
  ctaLabel: string;
  featured: boolean;
}

const CATEGORY_NAMES: Record<string, string> = {
  "luxury-websites": "Flagship Offering",
  "brand-systems-identity": "Brand",
  "growth-infrastructure": "Growth",
  "operational-platforms": "Platforms",
  "enterprise-systems": "Enterprise",
  "ecommerce": "Commerce",
  "ongoing-partnership": "Partnership",
};

function categoryDisplay(cat: string): string {
  return CATEGORY_NAMES[cat] ?? cat;
}

async function fetchServices(): Promise<ServiceItem[]> {
  try {
    const payload = await getPayload({ config });
    const { docs } = await payload.find({
      collection: "services",
      where: { status: { equals: "published" } },
      sort: "order",
      limit: 20,
      depth: 0,
    });
    if (docs.length > 0) {
      return (docs as unknown as Array<Record<string, unknown>>).map((doc) => ({
        slug: String(doc.slug),
        title: String(doc.title),
        category: String(doc.category),
        headline: String((doc.headline as string) || doc.title),
        summary: String(doc.summary),
        bestFor: (Array.isArray(doc.bestFor) ? doc.bestFor as Array<{item: string}> : [])
          .slice(0, 3)
          .map((b) => b.item),
        ctaLabel: String((doc.ctaLabel as string) || "Explore Service"),
        featured: Boolean(doc.featured),
      }));
    }
  } catch {
    // fall through to static data
  }
  return HOMEPAGE_SERVICES.map((s) => ({
    slug: String(s.slug),
    title: s.title,
    category: String(s.slug),
    headline: s.summary,
    summary: s.creates,
    bestFor: [s.forWho],
    ctaLabel: String(s.cta),
    featured: s.primary,
  }));
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ServicesPage() {
  const services = await fetchServices();

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

      {/* ── Hero ── */}
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
        <div className="kxd-container relative z-10" style={{ maxWidth: "56rem" }}>
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
            Built Beyond
            <br />
            <em style={{ fontStyle: "italic", color: "var(--kxd-cream-soft)" }}>
              Standards.
            </em>
          </h1>
          <p
            className="mt-7 font-serif font-light"
            style={{
              fontSize: "clamp(1rem, 1.5vw, 1.1875rem)",
              lineHeight: 1.8,
              color: "var(--kxd-cream-muted)",
              maxWidth: "34rem",
            }}
          >
            Strategy first. Design with intent. No noise. Every engagement
            is built to perform from first impression to final conversion.
          </p>
        </div>
      </section>

      {/* ── Service list ── */}
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

                  {/* ── Left: number / title / CTA ── */}
                  <div className="relative">
                    <span
                      aria-hidden
                      className="absolute -top-2 right-0 select-none font-serif font-light leading-none lg:right-auto lg:left-0"
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
                        {categoryDisplay(service.category)}
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
                        {service.headline}
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

                  {/* ── Right: best for ── */}
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
        secondaryHref="/work"
        secondaryLabel="View the Work"
        headline="Build What Others Can't."
        subCopy="For brands ready to move with clarity, discipline, and presence."
      />
    </>
  );
}
