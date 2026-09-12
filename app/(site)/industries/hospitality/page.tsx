import type { Metadata } from "next";
import Link from "next/link";
import { FinalCtaBand } from "@/components/ui/FinalCtaBand";
import { GoldAtmosphere } from "@/components/ui/surfaces/GoldAtmosphere";
import { StructuredData } from "@/components/seo/StructuredData";
import {
  HOSPITALITY_CAPABILITIES,
  HOSPITALITY_FAQS,
  HOSPITALITY_INSIGHT_LINKS,
  HOSPITALITY_PAGE,
  HOSPITALITY_PHILOSOPHY,
  HOSPITALITY_SELECTED_WORK,
} from "@/lib/content/hospitality-authority";
import { PROJECTS } from "@/lib/projects";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbSchema,
  faqPageSchema,
  webPageSchema,
} from "@/lib/seo/schema";

export const metadata: Metadata = buildMetadata({
  title: HOSPITALITY_PAGE.title,
  description: HOSPITALITY_PAGE.description,
  path: HOSPITALITY_PAGE.path,
  keywords: [...HOSPITALITY_PAGE.keywords],
});

function workImage(slug: string): string | null {
  return PROJECTS.find((p) => p.slug === slug)?.image ?? null;
}

const featuredWork = HOSPITALITY_SELECTED_WORK.find((w) => w.featured)!;
const supportingWork = HOSPITALITY_SELECTED_WORK.filter((w) => !w.featured);

export default function HospitalityIndustryPage() {
  const faqSchema = faqPageSchema([...HOSPITALITY_FAQS]);
  const schema = [
    breadcrumbSchema([{ name: "Hospitality", path: HOSPITALITY_PAGE.path }]),
    webPageSchema({
      title: HOSPITALITY_PAGE.title,
      description: HOSPITALITY_PAGE.description,
      path: HOSPITALITY_PAGE.path,
    }),
    ...(faqSchema ? [faqSchema] : []),
  ];

  const heroImage = workImage(featuredWork.slug);

  return (
    <>
      <StructuredData data={schema} />

      {/* ── Cinematic hero ─────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{
          minHeight: "min(88vh, 52rem)",
          background: "var(--kxd-black-pure)",
        }}
      >
        {heroImage ? (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${heroImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.28,
              transform: "scale(1.04)",
            }}
          />
        ) : null}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.72) 42%, rgba(0,0,0,0.45) 100%)",
          }}
        />
        <GoldAtmosphere position="center" intensity="hero" />

        <div
          className="kxd-container relative z-10 flex flex-col justify-end"
          style={{
            minHeight: "min(88vh, 52rem)",
            paddingTop: "calc(var(--nav-height) + 4rem)",
            paddingBottom: "clamp(3.5rem, 8vw, 5.5rem)",
          }}
        >
          <p className="kxd-eyebrow kxd-reveal">{HOSPITALITY_PAGE.eyebrow}</p>
          <h1
            className="kxd-serif-title kxd-reveal kxd-reveal-delay-1 mt-6"
            style={{
              fontSize: "clamp(2.75rem, 6.5vw, 4.75rem)",
              lineHeight: 1.02,
              maxWidth: "14ch",
              letterSpacing: "-0.02em",
            }}
          >
            {HOSPITALITY_PAGE.headline}
          </h1>
          <p
            className="kxd-body kxd-reveal kxd-reveal-delay-2 mt-8"
            style={{ maxWidth: "32rem", lineHeight: 1.75, color: "var(--kxd-cream-muted)" }}
          >
            {HOSPITALITY_PAGE.lead}
          </p>
          <div className="kxd-reveal kxd-reveal-delay-3 mt-12 flex flex-wrap items-center gap-x-10 gap-y-4">
            <Link href={HOSPITALITY_PAGE.primaryCta.href} className="kxd-btn-primary">
              {HOSPITALITY_PAGE.primaryCta.label}
            </Link>
            <Link
              href="#selected-work"
              className="group inline-flex items-center gap-2 font-sans font-medium uppercase"
              style={{
                fontSize: "0.6875rem",
                letterSpacing: "var(--tracking-button)",
                color: "var(--kxd-cream-muted)",
              }}
            >
              <span className="transition-colors duration-200 group-hover:text-[var(--kxd-cream)]">
                Selected work
              </span>
              <span
                aria-hidden
                className="inline-block transition-transform duration-300 group-hover:translate-x-1"
                style={{ color: "var(--kxd-gold)" }}
              >
                →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Selected work — visual centerpiece ─────────────────────── */}
      <section
        id="selected-work"
        className="relative"
        style={{ background: "var(--kxd-black-pure)" }}
      >
        <div className="kxd-container" style={{ paddingTop: "clamp(3rem, 6vw, 5rem)" }}>
          <div className="mb-10 flex flex-col gap-3 lg:mb-14 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="kxd-eyebrow">Selected work</p>
              <h2
                className="kxd-serif-title mt-4"
                style={{ fontSize: "clamp(1.85rem, 3.5vw, 2.75rem)", maxWidth: "16ch" }}
              >
                Restaurants, venues, and dining brands.
              </h2>
            </div>
            <Link
              href="/work"
              className="kxd-ui-label inline-flex items-center gap-2 self-start text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)] lg:self-auto"
            >
              All work
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        {/* Featured — full bleed cinematic */}
        <Link
          href={`/work/${featuredWork.slug}`}
          className="group relative block overflow-hidden border-y"
          style={{
            borderColor: "var(--kxd-border-white)",
            minHeight: "min(72vh, 40rem)",
          }}
        >
          {workImage(featuredWork.slug) ? (
            <div
              aria-hidden
              className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              style={{
                backgroundImage: `url(${workImage(featuredWork.slug)})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          ) : null}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.35) 48%, rgba(0,0,0,0.2) 100%)",
            }}
          />
          <div className="relative z-10 flex h-full min-h-[min(72vh,40rem)] flex-col justify-end p-8 lg:p-14">
            <p className="kxd-eyebrow">{featuredWork.industry}</p>
            <h3
              className="mt-4 font-serif font-light"
              style={{
                fontSize: "clamp(2rem, 4.5vw, 3.25rem)",
                lineHeight: 1.08,
                color: "var(--kxd-cream)",
                maxWidth: "16ch",
              }}
            >
              {featuredWork.title}
            </h3>
            <p
              className="mt-5 font-sans font-light"
              style={{
                fontSize: "1.0625rem",
                lineHeight: 1.7,
                color: "var(--kxd-cream-muted)",
                maxWidth: "34rem",
              }}
            >
              {featuredWork.summary}
            </p>
            <p
              className="mt-8 inline-flex items-center gap-2 font-sans font-medium uppercase"
              style={{
                fontSize: "0.6875rem",
                letterSpacing: "var(--tracking-button)",
                color: "var(--kxd-cream-muted)",
              }}
            >
              <span className="transition-colors group-hover:text-[var(--kxd-cream)]">
                View case study
              </span>
              <span
                aria-hidden
                className="transition-transform duration-300 group-hover:translate-x-1"
                style={{ color: "var(--kxd-gold)" }}
              >
                →
              </span>
            </p>
          </div>
        </Link>

        {/* Supporting — asymmetric mosaic */}
        <div className="grid md:grid-cols-2 lg:grid-cols-12">
          {supportingWork.map((item, index) => {
            const image = workImage(item.slug);
            const wide = index === 0;
            return (
              <Link
                key={item.slug}
                href={`/work/${item.slug}`}
                className={`group relative block overflow-hidden border-b md:border-r ${
                  wide ? "lg:col-span-7" : "lg:col-span-5"
                }`}
                style={{
                  borderColor: "var(--kxd-border-white)",
                  minHeight: wide ? "min(56vh, 32rem)" : "min(48vh, 28rem)",
                }}
              >
                {image ? (
                  <div
                    aria-hidden
                    className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    style={{
                      backgroundImage: `url(${image})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center top",
                      opacity: 0.55,
                    }}
                  />
                ) : null}
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.28) 100%)",
                  }}
                />
                <div className="relative z-10 flex h-full min-h-[inherit] flex-col justify-end p-8 lg:p-10">
                  <p className="kxd-eyebrow">{item.industry}</p>
                  <h3
                    className="mt-3 font-serif font-light"
                    style={{
                      fontSize: wide
                        ? "clamp(1.65rem, 3vw, 2.35rem)"
                        : "clamp(1.45rem, 2.5vw, 2rem)",
                      lineHeight: 1.12,
                      color: "var(--kxd-cream)",
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="mt-4 font-sans font-light"
                    style={{
                      fontSize: "0.9375rem",
                      lineHeight: 1.65,
                      color: "var(--kxd-cream-muted)",
                      maxWidth: "28rem",
                    }}
                  >
                    {item.summary}
                  </p>
                  <p
                    className="mt-6 inline-flex items-center gap-2 font-sans font-medium uppercase"
                    style={{
                      fontSize: "0.6875rem",
                      letterSpacing: "var(--tracking-button)",
                      color: "var(--kxd-cream-muted)",
                    }}
                  >
                    <span className="transition-colors group-hover:text-[var(--kxd-cream)]">
                      View case study
                    </span>
                    <span aria-hidden style={{ color: "var(--kxd-gold)" }}>
                      →
                    </span>
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Philosophy ─────────────────────────────────────────────── */}
      <section
        className="kxd-section border-t"
        style={{
          background: "var(--kxd-black-base)",
          borderColor: "var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "44rem" }}>
          <p className="kxd-eyebrow">{HOSPITALITY_PHILOSOPHY.eyebrow}</p>
          <h2
            className="kxd-serif-title mt-5"
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              lineHeight: 1.12,
              maxWidth: "16ch",
            }}
          >
            {HOSPITALITY_PHILOSOPHY.title}
          </h2>
          <div className="mt-10 space-y-6">
            {HOSPITALITY_PHILOSOPHY.body.map((paragraph) => (
              <p
                key={paragraph}
                className="font-sans font-light"
                style={{
                  fontSize: "clamp(1.0625rem, 1.6vw, 1.1875rem)",
                  lineHeight: 1.8,
                  color: "var(--kxd-cream-muted)",
                }}
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ── Capabilities — editorial, not a map ───────────────────── */}
      <section
        className="kxd-section border-t"
        style={{
          background: "var(--kxd-black-pure)",
          borderColor: "var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "58rem" }}>
          <p className="kxd-eyebrow">Engagements</p>
          <h2
            className="kxd-serif-title mt-5"
            style={{ fontSize: "clamp(1.75rem, 3.2vw, 2.5rem)", maxWidth: "14ch" }}
          >
            Built around the experience.
          </h2>

          <div className="mt-16">
            {HOSPITALITY_CAPABILITIES.map((capability, index) => (
              <article
                key={capability.href}
                className="grid gap-6 py-12 lg:grid-cols-[11rem_1fr] lg:gap-16"
                style={{
                  borderTop:
                    index === 0
                      ? "1px solid color-mix(in srgb, var(--kxd-gold) 45%, transparent)"
                      : "1px solid var(--kxd-border-white)",
                }}
              >
                <p className="kxd-eyebrow" style={{ marginTop: "0.4rem" }}>
                  {capability.eyebrow}
                </p>
                <div>
                  <h3
                    className="font-serif font-light"
                    style={{
                      fontSize: "clamp(1.35rem, 2.4vw, 1.85rem)",
                      lineHeight: 1.25,
                      color: "var(--kxd-cream)",
                      maxWidth: "22ch",
                    }}
                  >
                    {capability.title}
                  </h3>
                  <p
                    className="mt-5 font-sans font-light"
                    style={{
                      fontSize: "1rem",
                      lineHeight: 1.8,
                      color: "var(--kxd-cream-muted)",
                      maxWidth: "38rem",
                    }}
                  >
                    {capability.body}
                  </p>
                  <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-3">
                    <Link
                      href={capability.href}
                      className="kxd-ui-label inline-flex items-center gap-2 text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
                    >
                      {capability.linkLabel}
                      <span aria-hidden>→</span>
                    </Link>
                    {"secondaryHref" in capability && capability.secondaryHref ? (
                      <Link
                        href={capability.secondaryHref}
                        className="kxd-ui-label inline-flex items-center gap-2 text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
                      >
                        {capability.secondaryLinkLabel}
                        <span aria-hidden>→</span>
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Insights ───────────────────────────────────────────────── */}
      <section
        className="kxd-section border-t"
        style={{
          background: "var(--kxd-black-base)",
          borderColor: "var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "48rem" }}>
          <p className="kxd-eyebrow">Journal</p>
          <h2
            className="kxd-serif-title mt-5"
            style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.15rem)" }}
          >
            Further reading.
          </h2>
          <ul className="mt-12 space-y-0">
            {HOSPITALITY_INSIGHT_LINKS.map((insight) => (
              <li
                key={insight.slug}
                className="border-t py-7"
                style={{ borderColor: "var(--kxd-border-white)" }}
              >
                <Link
                  href={`/insights/${insight.slug}`}
                  className="group flex items-baseline justify-between gap-6"
                >
                  <span
                    className="font-serif font-light transition-colors group-hover:text-[var(--kxd-gold)]"
                    style={{
                      fontSize: "clamp(1.125rem, 2vw, 1.35rem)",
                      lineHeight: 1.35,
                      color: "var(--kxd-cream)",
                    }}
                  >
                    {insight.title}
                  </span>
                  <span
                    aria-hidden
                    className="shrink-0 transition-transform duration-300 group-hover:translate-x-1"
                    style={{ color: "var(--kxd-gold)" }}
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────── */}
      <section
        className="kxd-section border-t"
        style={{
          background: "var(--kxd-black-base)",
          borderColor: "var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "48rem" }}>
          <p className="kxd-eyebrow">Questions</p>
          <h2
            className="kxd-serif-title mt-5"
            style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.15rem)", maxWidth: "16ch" }}
          >
            Straight answers.
          </h2>
          <dl className="mt-12">
            {HOSPITALITY_FAQS.map((faq) => (
              <div
                key={faq.question}
                className="border-t py-8"
                style={{ borderColor: "var(--kxd-border-white)" }}
              >
                <dt
                  className="font-serif font-light"
                  style={{
                    fontSize: "clamp(1.0625rem, 1.5vw, 1.1875rem)",
                    lineHeight: 1.35,
                    color: "var(--kxd-cream)",
                    maxWidth: "36rem",
                  }}
                >
                  {faq.question}
                </dt>
                <dd
                  className="mt-4 font-sans font-light"
                  style={{
                    fontSize: "clamp(0.9375rem, 1.2vw, 1rem)",
                    lineHeight: 1.8,
                    color: "var(--kxd-cream-muted)",
                    maxWidth: "38rem",
                  }}
                >
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <FinalCtaBand
        headline="Begin a hospitality project."
        subCopy="Selective engagements for restaurants, venues, and dining brands that want digital presence at the same standard as the room."
        primaryLabel="Start a Project"
        primaryHref="/start-project"
        secondaryLabel="Website Audit"
        secondaryHref="/website-audit"
      />
    </>
  );
}
