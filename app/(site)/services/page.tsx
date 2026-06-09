import type { Metadata } from "next";
import Link from "next/link";
import { HOMEPAGE_SERVICES } from "@/lib/homepage";
import { FinalCtaBand } from "@/components/ui/FinalCtaBand";
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

export default function ServicesPage() {
  return (
    <>
      <StructuredData
        data={HOMEPAGE_SERVICES.map((service) =>
          serviceSchema({
            title: service.title,
            description: service.creates,
            path: `/services/${service.slug}`,
          }),
        )}
      />

      {/* ── Hero ── */}
      <section
        className="border-b"
        style={{
          paddingTop: "calc(var(--nav-height) + var(--section-py))",
          paddingBottom: "var(--section-py)",
          background: "var(--kxd-black-pure)",
          borderColor: "var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "50rem" }}>
          <p className="kxd-eyebrow">Services</p>
          <h1
            className="kxd-serif-title mt-5"
            style={{ fontSize: "clamp(2.25rem, 4.5vw, 3.25rem)" }}
          >
            Built Beyond Standards.
          </h1>
          <p className="kxd-body mt-6">
            Strategy first. Design with intent. No noise.
          </p>
        </div>
      </section>

      {/* ── Service list ── */}
      <section
        className="kxd-section"
        style={{ background: "var(--kxd-black-base)" }}
      >
        <div className="kxd-container">
          {HOMEPAGE_SERVICES.map((service) => (
            <article
              key={service.slug}
              id={service.slug}
              className="grid gap-8 border-t py-10 first:border-t-0 first:pt-0 lg:grid-cols-[1fr_2fr] lg:gap-16 lg:py-14"
              style={{ borderColor: "var(--kxd-border-white)" }}
            >
              <div>
                <p className="kxd-label">{service.number}</p>
                <h2
                  className="kxd-serif-title mt-4"
                  style={{ fontSize: "clamp(1.375rem, 2.5vw, 1.875rem)" }}
                >
                  {service.title}
                </h2>
                <p className="kxd-body mt-4">{service.summary}</p>
                <Link
                  href={`/services/${service.slug}`}
                  className="kxd-ui-label mt-6 inline-flex items-center gap-2 transition"
                  style={{ color: "var(--kxd-gold)" }}
                >
                  {service.cta}
                  <span aria-hidden>→</span>
                </Link>
              </div>
              <div className="grid gap-6 sm:grid-cols-3">
                {[
                  { label: "For",     value: service.forWho },
                  { label: "Creates", value: service.creates },
                  { label: "Matters", value: service.whyMatters },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="border-l pl-5"
                    style={{ borderColor: "var(--kxd-border-gold)" }}
                  >
                    <p className="kxd-label text-[0.5625rem]">{item.label}</p>
                    <p className="kxd-body-sm mt-3">{item.value}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <FinalCtaBand secondaryHref="/work" secondaryLabel="View the Work" headline="Build What Others Can't." subCopy="For brands ready to move with clarity, discipline, and presence." />
    </>
  );
}
