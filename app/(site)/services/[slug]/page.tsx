import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import { HOMEPAGE_SERVICES } from "@/lib/homepage";
import { FinalCtaBand } from "@/components/ui/FinalCtaBand";
import { GoldAtmosphere } from "@/components/ui/surfaces/GoldAtmosphere";
import { buildMetadata } from "@/lib/seo/metadata";
import { serviceSchema } from "@/lib/seo/schema";
import { StructuredData } from "@/components/seo/StructuredData";

type Props = { params: Promise<{ slug: string }> };

// ── Unified service detail shape ──────────────────────────────────────────────

interface ServiceDetail {
  slug: string;
  title: string;
  category: string;
  eyebrow: string | null;
  headline: string;
  summary: string;
  bestFor: string[];
  deliverables: string[];
  outcomes: string[];
  process: Array<{ stepTitle: string; stepDescription: string }>;
  investmentLabel: string | null;
  investmentRange: string | null;
  timelineLabel: string | null;
  engagementType: string | null;
  ctaLabel: string;
  ctaHref: string;
  secondaryCtaLabel: string | null;
  secondaryCtaHref: string | null;
  faqs: Array<{ question: string; answer: string }>;
}

// ── Data helpers ─────────────────────────────────────────────────────────────

function arr<T>(val: unknown): T[] {
  return Array.isArray(val) ? (val as T[]) : [];
}

function str(val: unknown, fallback = ""): string {
  return typeof val === "string" && val.length > 0 ? val : fallback;
}

function docToDetail(d: Record<string, unknown>): ServiceDetail {
  return {
    slug: str(d.slug),
    title: str(d.title),
    category: str(d.category),
    eyebrow: str(d.eyebrow) || null,
    headline: str(d.headline) || str(d.title),
    summary: str(d.summary),
    bestFor: arr<{ item: string }>(d.bestFor).map((b) => b.item),
    deliverables: arr<{ item: string }>(d.deliverables).map((b) => b.item),
    outcomes: arr<{ item: string }>(d.outcomes).map((b) => b.item),
    process: arr<{ stepTitle: string; stepDescription: string }>(d.process),
    investmentLabel: str(d.investmentLabel) || null,
    investmentRange: str(d.investmentRange) || null,
    timelineLabel: str(d.timelineLabel) || null,
    engagementType: str(d.engagementType) || null,
    ctaLabel: str(d.ctaLabel) || "Start a Project",
    ctaHref: str(d.ctaHref) || "/contact",
    secondaryCtaLabel: str(d.secondaryCtaLabel) || null,
    secondaryCtaHref: str(d.secondaryCtaHref) || null,
    faqs: arr<{ question: string; answer: string }>(d.faqs),
  };
}

function staticFallback(slug: string): ServiceDetail | null {
  const s = HOMEPAGE_SERVICES.find((x) => x.slug === slug);
  if (!s) return null;
  return {
    slug: String(s.slug),
    title: s.title,
    category: String(s.slug),
    eyebrow: null,
    headline: s.summary,
    summary: s.creates,
    bestFor: [s.forWho],
    deliverables: [s.creates],
    outcomes: [s.whyMatters],
    process: [],
    investmentLabel: null,
    investmentRange: null,
    timelineLabel: null,
    engagementType: null,
    ctaLabel: String(s.cta),
    ctaHref: "/contact",
    secondaryCtaLabel: "All Services",
    secondaryCtaHref: "/services",
    faqs: [],
  };
}

async function getAllSlugs(): Promise<string[]> {
  try {
    const payload = await getPayload({ config });
    const { docs } = await payload.find({
      collection: "services",
      where: { status: { equals: "published" } },
      limit: 50,
      depth: 0,
    });
    if (docs.length > 0) {
      return (docs as unknown as Array<{ slug: string }>).map((d) => d.slug);
    }
  } catch {
    // fall through
  }
  return HOMEPAGE_SERVICES.map((s) => String(s.slug));
}

async function fetchService(slug: string): Promise<ServiceDetail | null> {
  try {
    const payload = await getPayload({ config });
    const { docs } = await payload.find({
      collection: "services",
      where: {
        and: [
          { slug: { equals: slug } },
          { status: { equals: "published" } },
        ],
      },
      limit: 1,
      depth: 0,
    });
    if (docs.length > 0) {
      return docToDetail(docs[0] as unknown as Record<string, unknown>);
    }
  } catch {
    // fall through to static
  }
  return staticFallback(slug);
}

// ── Next.js exports ───────────────────────────────────────────────────────────

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = await fetchService(slug);
  if (!service) return {};
  return buildMetadata({
    title: service.title,
    description: service.summary,
    path: `/services/${service.slug}`,
    keywords: [service.title, "KXD Service", "Luxury Digital Studio"],
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

const ENGAGEMENT_LABELS: Record<string, string> = {
  project: "Fixed Project",
  retainer: "Monthly Retainer",
  hybrid: "Hybrid Engagement",
  enterprise: "Enterprise Program",
};

function SectionHeading({ label, title }: { label: string; title: string }) {
  return (
    <>
      <p className="kxd-eyebrow">{label}</p>
      <h2
        className="mt-5 font-serif font-light"
        style={{
          fontSize: "clamp(1.625rem, 3vw, 2.25rem)",
          lineHeight: 1.2,
          color: "var(--kxd-cream)",
          maxWidth: "38rem",
        }}
      >
        {title}
      </h2>
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = await fetchService(slug);
  if (!service) notFound();

  const hasInvestmentInfo =
    Boolean(service.investmentRange) ||
    Boolean(service.timelineLabel) ||
    Boolean(service.engagementType);
  const hasBestFor = service.bestFor.length > 0;
  const hasDeliverables = service.deliverables.length > 0;
  const hasOutcomes = service.outcomes.length > 0;
  const hasProcess = service.process.length > 0;
  const hasFaqs = service.faqs.length > 0;

  return (
    <>
      <StructuredData
        data={serviceSchema({
          title: service.title,
          description: service.summary,
          path: `/services/${service.slug}`,
        })}
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
        <div className="kxd-container relative z-10" style={{ maxWidth: "58rem" }}>
          {/* Back link */}
          <Link
            href="/services"
            className="inline-flex items-center gap-2 font-sans uppercase transition-colors hover:text-[var(--kxd-cream)]"
            style={{
              fontSize: "0.5625rem",
              letterSpacing: "var(--tracking-label)",
              color: "var(--kxd-cream-muted)",
            }}
          >
            <span aria-hidden>←</span>
            <span>All Services</span>
          </Link>

          <div className="mt-8">
            <p className="kxd-eyebrow">
              {service.eyebrow ||
                (service.category === "luxury-websites"
                  ? "Flagship Offering"
                  : "Service")}
            </p>

            <h1
              className="mt-5 font-serif font-light"
              style={{
                fontSize: "clamp(2.5rem, 5vw, 4.25rem)",
                lineHeight: 1.04,
                letterSpacing: "-0.01em",
                color: "var(--kxd-cream)",
              }}
            >
              {service.headline}
            </h1>

            <p
              className="mt-7 font-serif font-light italic"
              style={{
                fontSize: "clamp(1rem, 1.5vw, 1.1875rem)",
                lineHeight: 1.8,
                color: "var(--kxd-cream-soft)",
                maxWidth: "40rem",
              }}
            >
              {service.summary}
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link href={service.ctaHref} className="kxd-btn-primary">
                {service.ctaLabel}
              </Link>
              {service.secondaryCtaLabel && service.secondaryCtaHref && (
                <Link
                  href={service.secondaryCtaHref}
                  className="group inline-flex items-center gap-2 font-sans uppercase"
                  style={{
                    fontSize: "0.625rem",
                    letterSpacing: "var(--tracking-button)",
                    color: "var(--kxd-cream-muted)",
                  }}
                >
                  <span className="transition-colors group-hover:text-[var(--kxd-cream)]">
                    {service.secondaryCtaLabel}
                  </span>
                  <span
                    aria-hidden
                    className="inline-block transition-transform duration-300 group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Investment strip ── */}
      {hasInvestmentInfo && (
        <div
          style={{
            background: "var(--kxd-black-deep)",
            borderBottom: "1px solid var(--kxd-border-white)",
          }}
        >
          <div className="kxd-container py-8 lg:py-10">
            <div className="grid gap-8 sm:grid-cols-3">
              {service.investmentRange && (
                <div>
                  <p
                    className="font-sans uppercase"
                    style={{
                      fontSize: "0.5rem",
                      letterSpacing: "var(--tracking-label)",
                      color: "var(--kxd-cream-muted)",
                      opacity: 0.6,
                    }}
                  >
                    {service.investmentLabel || "Investment"}
                  </p>
                  <p
                    className="mt-2 font-serif font-light"
                    style={{
                      fontSize: "clamp(1rem, 1.4vw, 1.125rem)",
                      color: "var(--kxd-cream-soft)",
                    }}
                  >
                    {service.investmentRange}
                  </p>
                </div>
              )}
              {service.timelineLabel && (
                <div>
                  <p
                    className="font-sans uppercase"
                    style={{
                      fontSize: "0.5rem",
                      letterSpacing: "var(--tracking-label)",
                      color: "var(--kxd-cream-muted)",
                      opacity: 0.6,
                    }}
                  >
                    Timeline
                  </p>
                  <p
                    className="mt-2 font-serif font-light"
                    style={{
                      fontSize: "clamp(1rem, 1.4vw, 1.125rem)",
                      color: "var(--kxd-cream-soft)",
                    }}
                  >
                    {service.timelineLabel}
                  </p>
                </div>
              )}
              {service.engagementType && (
                <div>
                  <p
                    className="font-sans uppercase"
                    style={{
                      fontSize: "0.5rem",
                      letterSpacing: "var(--tracking-label)",
                      color: "var(--kxd-cream-muted)",
                      opacity: 0.6,
                    }}
                  >
                    Engagement
                  </p>
                  <p
                    className="mt-2 font-serif font-light"
                    style={{
                      fontSize: "clamp(1rem, 1.4vw, 1.125rem)",
                      color: "var(--kxd-cream-soft)",
                    }}
                  >
                    {ENGAGEMENT_LABELS[service.engagementType] ??
                      service.engagementType}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Who It's For ── */}
      {hasBestFor && (
        <section
          className="kxd-section"
          style={{ background: "var(--kxd-black-base)" }}
        >
          <div className="kxd-container">
            <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-20">
              <div>
                <SectionHeading
                  label="Who It's For"
                  title="This engagement is built for your stage."
                />
              </div>
              <ul className="space-y-5 self-start lg:pt-2">
                {service.bestFor.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-5 border-l pl-6"
                    style={{ borderColor: "var(--kxd-border-gold)" }}
                  >
                    <span
                      aria-hidden
                      className="mt-[5px] shrink-0"
                      style={{ fontSize: "0.375rem", color: "var(--kxd-gold)" }}
                    >
                      ◆
                    </span>
                    <p
                      className="font-sans font-light"
                      style={{
                        fontSize: "clamp(0.9375rem, 1.2vw, 1.0625rem)",
                        lineHeight: 1.78,
                        color: "var(--kxd-cream-soft)",
                      }}
                    >
                      {item}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* ── What We Deliver ── */}
      {hasDeliverables && (
        <section
          className="kxd-section"
          style={{ background: "var(--kxd-black-deep)" }}
        >
          <div className="kxd-container">
            <SectionHeading
              label="What We Deliver"
              title="Every engagement includes the following."
            />
            <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {service.deliverables.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 border p-5"
                  style={{
                    borderColor: "var(--kxd-border-white)",
                    background: "var(--kxd-black-base)",
                  }}
                >
                  <span
                    aria-hidden
                    className="mt-[5px] shrink-0"
                    style={{ fontSize: "0.375rem", color: "var(--kxd-gold)" }}
                  >
                    ◆
                  </span>
                  <p
                    className="font-sans font-light"
                    style={{
                      fontSize: "clamp(0.875rem, 1.1vw, 0.9375rem)",
                      lineHeight: 1.65,
                      color: "var(--kxd-cream-soft)",
                    }}
                  >
                    {item}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Client Outcomes ── */}
      {hasOutcomes && (
        <section
          className="kxd-section"
          style={{ background: "var(--kxd-black-base)" }}
        >
          <div className="kxd-container" style={{ maxWidth: "54rem" }}>
            <SectionHeading
              label="Client Outcomes"
              title="The results that follow."
            />
            <ul className="mt-12 space-y-5">
              {service.outcomes.map((item, i) => (
                <li
                  key={i}
                  className="border-l pl-6"
                  style={{ borderColor: "var(--kxd-border-gold-strong)" }}
                >
                  <p
                    className="font-serif font-light"
                    style={{
                      fontSize: "clamp(1rem, 1.5vw, 1.25rem)",
                      lineHeight: 1.65,
                      color: "var(--kxd-cream-soft)",
                    }}
                  >
                    {item}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── How We Work ── */}
      {hasProcess && (
        <section
          className="kxd-section"
          style={{ background: "var(--kxd-black-deep)" }}
        >
          <div className="kxd-container">
            <SectionHeading
              label="How We Work"
              title="A clear path from brief to launch."
            />
            <ol className="mt-14 grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
              {service.process.map((step, i) => (
                <li
                  key={i}
                  className="relative border-t pt-8"
                  style={{ borderColor: "var(--kxd-border-gold)" }}
                >
                  <span
                    className="absolute -top-px left-0 font-sans"
                    style={{
                      fontSize: "0.5rem",
                      letterSpacing: "0.12em",
                      color: "var(--kxd-gold)",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3
                    className="font-serif font-light"
                    style={{
                      fontSize: "clamp(1rem, 1.4vw, 1.125rem)",
                      lineHeight: 1.3,
                      color: "var(--kxd-cream)",
                    }}
                  >
                    {step.stepTitle}
                  </h3>
                  <p
                    className="mt-3 font-sans font-light"
                    style={{
                      fontSize: "clamp(0.875rem, 1.1vw, 0.9375rem)",
                      lineHeight: 1.78,
                      color: "var(--kxd-cream-muted)",
                    }}
                  >
                    {step.stepDescription}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* ── Common Questions ── */}
      {hasFaqs && (
        <section
          className="kxd-section"
          style={{ background: "var(--kxd-black-base)" }}
        >
          <div className="kxd-container" style={{ maxWidth: "54rem" }}>
            <SectionHeading
              label="Common Questions"
              title="What clients ask us most."
            />
            <dl className="mt-12">
              {service.faqs.map((faq, i) => (
                <div
                  key={i}
                  className="border-t py-8"
                  style={{ borderColor: "var(--kxd-border-white)" }}
                >
                  <dt
                    className="font-serif font-light"
                    style={{
                      fontSize: "clamp(1rem, 1.4vw, 1.125rem)",
                      lineHeight: 1.35,
                      color: "var(--kxd-cream)",
                    }}
                  >
                    {faq.question}
                  </dt>
                  <dd
                    className="mt-4 font-sans font-light"
                    style={{
                      fontSize: "clamp(0.875rem, 1.15vw, 1rem)",
                      lineHeight: 1.82,
                      color: "var(--kxd-cream-muted)",
                    }}
                  >
                    {faq.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      <FinalCtaBand
        showEmail={false}
        secondaryHref="/services"
        secondaryLabel="All Services"
        headline={`Begin Your ${service.title} Engagement.`}
        subCopy="KXD partners with select brands. Every project starts with a conversation."
      />
    </>
  );
}
