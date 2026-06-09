import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HOMEPAGE_SERVICES } from "@/lib/homepage";
import { FinalCtaBand } from "@/components/ui/FinalCtaBand";
import { buildMetadata } from "@/lib/seo/metadata";
import { serviceSchema } from "@/lib/seo/schema";
import { StructuredData } from "@/components/seo/StructuredData";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return HOMEPAGE_SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = HOMEPAGE_SERVICES.find((s) => s.slug === slug);
  if (!service) return {};
  return buildMetadata({
    title: service.title,
    description: service.creates,
    path: `/services/${service.slug}`,
  });
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = HOMEPAGE_SERVICES.find((s) => s.slug === slug);
  if (!service) notFound();

  return (
    <>
      <StructuredData
        data={serviceSchema({
          title: service.title,
          description: service.creates,
          path: `/services/${service.slug}`,
        })}
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
          <p className="kxd-eyebrow">{service.primary ? "Primary Service" : "Service"}</p>
          <h1
            className="kxd-serif-title mt-5"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
          >
            {service.title}
          </h1>
          <p className="kxd-body mt-6">{service.summary}</p>
        </div>
      </section>

      {/* ── Detail ── */}
      <section
        className="kxd-section"
        style={{ background: "var(--kxd-black-base)" }}
      >
        <div className="kxd-container" style={{ maxWidth: "50rem" }}>
          <div className="space-y-10">
            {[
              { label: "Who it is for",    value: service.forWho },
              { label: "What it creates",  value: service.creates },
              { label: "Why it matters",   value: service.whyMatters },
            ].map((item) => (
              <div
                key={item.label}
                className="border-t pt-8"
                style={{ borderColor: "var(--kxd-border-gold)" }}
              >
                <p className="kxd-eyebrow">{item.label}</p>
                <p className="kxd-body mt-4">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-14">
            <Link href="/contact" className="kxd-btn-primary">
              {service.cta}
            </Link>
          </div>
        </div>
      </section>

      <FinalCtaBand showEmail={false} secondaryHref="/services" secondaryLabel="All Services" />
    </>
  );
}
