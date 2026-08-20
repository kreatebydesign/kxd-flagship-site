import type { Metadata } from "next";
import Link from "next/link";
import { FinalCtaBand } from "@/components/ui/FinalCtaBand";
import { StructuredData } from "@/components/seo/StructuredData";
import {
  MOTORSPORTS_CAPABILITIES,
  MOTORSPORTS_CONNECTED_SYSTEM,
  MOTORSPORTS_ENGAGEMENT,
  MOTORSPORTS_FAQS,
  MOTORSPORTS_INSIGHT_LINKS,
  MOTORSPORTS_PAGE,
  MOTORSPORTS_REQUIREMENTS,
  MOTORSPORTS_SELECTED_WORK,
} from "@/lib/content/motorsports-authority";
import { PROJECTS } from "@/lib/projects";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbSchema,
  faqPageSchema,
  webPageSchema,
} from "@/lib/seo/schema";

export const metadata: Metadata = buildMetadata({
  title: MOTORSPORTS_PAGE.title,
  description: MOTORSPORTS_PAGE.description,
  path: MOTORSPORTS_PAGE.path,
  keywords: [...MOTORSPORTS_PAGE.keywords],
});

function workImage(slug: string): string | null {
  return PROJECTS.find((p) => p.slug === slug)?.image ?? null;
}

export default function MotorsportsIndustryPage() {
  const faqSchema = faqPageSchema([...MOTORSPORTS_FAQS]);
  const schema = [
    breadcrumbSchema([
      { name: "Motorsports & Automotive", path: MOTORSPORTS_PAGE.path },
    ]),
    webPageSchema({
      title: MOTORSPORTS_PAGE.title,
      description: MOTORSPORTS_PAGE.description,
      path: MOTORSPORTS_PAGE.path,
    }),
    ...(faqSchema ? [faqSchema] : []),
  ];

  return (
    <>
      <StructuredData data={schema} />

      {/* Hero */}
      <section
        style={{
          paddingTop: "calc(var(--nav-height) + var(--section-py))",
          paddingBottom: "var(--section-py)",
          background: "var(--kxd-black-pure)",
          borderBottom: "1px solid var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "58rem" }}>
          <p className="kxd-eyebrow">{MOTORSPORTS_PAGE.eyebrow}</p>
          <h1
            className="kxd-serif-title mt-5"
            style={{
              fontSize: "clamp(2.5rem, 5.2vw, 3.75rem)",
              lineHeight: 1.06,
              maxWidth: "18ch",
            }}
          >
            {MOTORSPORTS_PAGE.headline}
          </h1>
          <p className="kxd-body mt-7" style={{ maxWidth: "38rem", lineHeight: 1.8 }}>
            {MOTORSPORTS_PAGE.lead}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link href={MOTORSPORTS_PAGE.primaryCta.href} className="kxd-btn-primary">
              {MOTORSPORTS_PAGE.primaryCta.label}
            </Link>
            <Link
              href={MOTORSPORTS_PAGE.secondaryCta.href}
              className="group inline-flex items-center gap-2 font-sans font-medium uppercase"
              style={{
                fontSize: "0.6875rem",
                letterSpacing: "var(--tracking-button)",
                color: "var(--kxd-cream-muted)",
              }}
            >
              <span className="transition-colors duration-200 group-hover:text-[var(--kxd-cream)]">
                {MOTORSPORTS_PAGE.secondaryCta.label}
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

      {/* Requirements */}
      <section
        className="kxd-section"
        style={{ background: "var(--kxd-black-base)" }}
      >
        <div className="kxd-container" style={{ maxWidth: "62rem" }}>
          <p className="kxd-eyebrow">{MOTORSPORTS_REQUIREMENTS.eyebrow}</p>
          <h2
            className="kxd-serif-title mt-5"
            style={{ fontSize: "clamp(1.75rem, 3.2vw, 2.5rem)", maxWidth: "22ch" }}
          >
            {MOTORSPORTS_REQUIREMENTS.title}
          </h2>
          <p className="kxd-body mt-6" style={{ maxWidth: "40rem", lineHeight: 1.8 }}>
            {MOTORSPORTS_REQUIREMENTS.lead}
          </p>
          <div className="mt-14 grid gap-px md:grid-cols-2 lg:grid-cols-3">
            {MOTORSPORTS_REQUIREMENTS.points.map((point) => (
              <article
                key={point.title}
                className="border p-8"
                style={{
                  borderColor: "var(--kxd-border-white)",
                  background: "rgba(255,255,255,0.015)",
                }}
              >
                <h3
                  className="font-serif font-light"
                  style={{
                    fontSize: "1.125rem",
                    lineHeight: 1.35,
                    color: "var(--kxd-cream)",
                  }}
                >
                  {point.title}
                </h3>
                <p
                  className="mt-4 font-sans font-light"
                  style={{
                    fontSize: "0.9375rem",
                    lineHeight: 1.75,
                    color: "var(--kxd-cream-muted)",
                  }}
                >
                  {point.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Capability map */}
      <section
        className="kxd-section border-t"
        style={{
          background: "var(--kxd-black-pure)",
          borderColor: "var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "62rem" }}>
          <p className="kxd-eyebrow">Capability map</p>
          <h2
            className="kxd-serif-title mt-5"
            style={{ fontSize: "clamp(1.75rem, 3.2vw, 2.5rem)", maxWidth: "20ch" }}
          >
            Three connected layers. Scoped to the engagement.
          </h2>
          <div className="mt-14 space-y-0">
            {MOTORSPORTS_CAPABILITIES.map((capability, index) => (
              <article
                key={capability.href}
                className="grid gap-6 py-12 lg:grid-cols-[10rem_1fr] lg:gap-12"
                style={{
                  borderTop:
                    index === 0
                      ? "1px solid var(--kxd-border-gold)"
                      : "1px solid var(--kxd-border-white)",
                }}
              >
                <p className="kxd-eyebrow" style={{ marginTop: "0.35rem" }}>
                  {capability.eyebrow}
                </p>
                <div>
                  <h3
                    className="font-serif font-light"
                    style={{
                      fontSize: "clamp(1.35rem, 2.4vw, 1.75rem)",
                      lineHeight: 1.25,
                      color: "var(--kxd-cream)",
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
                      maxWidth: "40rem",
                    }}
                  >
                    {capability.body}
                  </p>
                  <p
                    className="mt-4 font-sans"
                    style={{
                      fontSize: "0.8125rem",
                      lineHeight: 1.65,
                      color: "rgba(191,183,170,0.55)",
                      maxWidth: "40rem",
                    }}
                  >
                    {capability.proofNote}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
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

      {/* Selected work */}
      <section
        className="kxd-section border-t"
        style={{
          background: "var(--kxd-black-base)",
          borderColor: "var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container">
          <div className="mb-12 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="kxd-eyebrow">Selected work</p>
              <h2
                className="kxd-serif-title mt-4"
                style={{ fontSize: "clamp(1.75rem, 3.2vw, 2.5rem)" }}
              >
                Evidence from the field.
              </h2>
            </div>
            <p className="kxd-body-sm lg:text-right" style={{ maxWidth: "26rem" }}>
              Public case studies only. No invented metrics. On Track Performance remains
              distinct from any other OTP brands.
            </p>
          </div>

          <div className="grid gap-px md:grid-cols-2">
            {MOTORSPORTS_SELECTED_WORK.map((item) => {
              const image = workImage(item.slug);
              return (
                <Link
                  key={item.slug}
                  href={`/work/${item.slug}`}
                  className="group relative block overflow-hidden border"
                  style={{
                    borderColor: "var(--kxd-border-white)",
                    background: "var(--kxd-black-pure)",
                    minHeight: "22rem",
                  }}
                >
                  {image ? (
                    <div
                      aria-hidden
                      className="absolute inset-0 opacity-35 transition-opacity duration-500 group-hover:opacity-45"
                      style={{
                        backgroundImage: `url(${image})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center top",
                      }}
                    />
                  ) : null}
                  <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.25) 100%)",
                    }}
                  />
                  <div className="relative z-10 flex h-full flex-col justify-end p-8 lg:p-10">
                    <p className="kxd-eyebrow">{item.industry}</p>
                    <h3
                      className="mt-3 font-serif font-light"
                      style={{
                        fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
                        lineHeight: 1.15,
                        color: "var(--kxd-cream)",
                      }}
                    >
                      {item.title}
                    </h3>
                    <p
                      className="mt-4 font-sans font-light"
                      style={{
                        fontSize: "0.9375rem",
                        lineHeight: 1.7,
                        color: "var(--kxd-cream-muted)",
                        maxWidth: "34rem",
                      }}
                    >
                      {item.summary}
                    </p>
                    <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
                      {item.emphasis.map((chip) => (
                        <li
                          key={chip}
                          className="kxd-label"
                          style={{ color: "rgba(197,166,92,0.75)" }}
                        >
                          {chip}
                        </li>
                      ))}
                    </ul>
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
        </div>
      </section>

      {/* Connected system */}
      <section
        className="kxd-section border-t"
        style={{
          background: "var(--kxd-black-pure)",
          borderColor: "var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "58rem" }}>
          <p className="kxd-eyebrow">{MOTORSPORTS_CONNECTED_SYSTEM.eyebrow}</p>
          <h2
            className="kxd-serif-title mt-5"
            style={{ fontSize: "clamp(1.75rem, 3.2vw, 2.5rem)", maxWidth: "22ch" }}
          >
            {MOTORSPORTS_CONNECTED_SYSTEM.title}
          </h2>
          <p className="kxd-body mt-6" style={{ maxWidth: "40rem", lineHeight: 1.8 }}>
            {MOTORSPORTS_CONNECTED_SYSTEM.lead}
          </p>
          <ol className="mt-12 space-y-0">
            {MOTORSPORTS_CONNECTED_SYSTEM.steps.map((step, index) => (
              <li
                key={step.label}
                className="grid gap-3 border-t py-6 sm:grid-cols-[12rem_1fr] sm:gap-8"
                style={{ borderColor: "var(--kxd-border-white)" }}
              >
                <p
                  className="font-sans font-medium uppercase"
                  style={{
                    fontSize: "0.6875rem",
                    letterSpacing: "0.16em",
                    color: "var(--kxd-gold)",
                  }}
                >
                  <span style={{ opacity: 0.45 }}>{String(index + 1).padStart(2, "0")} · </span>
                  {step.label}
                </p>
                <p
                  className="font-sans font-light"
                  style={{
                    fontSize: "0.9375rem",
                    lineHeight: 1.7,
                    color: "var(--kxd-cream-muted)",
                  }}
                >
                  {step.detail}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Engagement */}
      <section
        className="kxd-section border-t"
        style={{
          background: "var(--kxd-black-base)",
          borderColor: "var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "62rem" }}>
          <p className="kxd-eyebrow">{MOTORSPORTS_ENGAGEMENT.eyebrow}</p>
          <h2
            className="kxd-serif-title mt-5"
            style={{ fontSize: "clamp(1.75rem, 3.2vw, 2.5rem)" }}
          >
            {MOTORSPORTS_ENGAGEMENT.title}
          </h2>
          <p className="kxd-body mt-6" style={{ maxWidth: "40rem", lineHeight: 1.8 }}>
            {MOTORSPORTS_ENGAGEMENT.lead}
          </p>
          <div className="mt-14 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            {MOTORSPORTS_ENGAGEMENT.steps.map((step) => (
              <article key={step.number}>
                <p className="kxd-eyebrow">{step.number}</p>
                <h3
                  className="mt-4 font-serif font-light"
                  style={{
                    fontSize: "1.25rem",
                    color: "var(--kxd-cream)",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  className="mt-4 font-sans font-light"
                  style={{
                    fontSize: "0.875rem",
                    lineHeight: 1.75,
                    color: "var(--kxd-cream-muted)",
                  }}
                >
                  {step.body}
                </p>
              </article>
            ))}
          </div>
          <p
            className="mt-12 font-sans font-light"
            style={{
              fontSize: "0.9375rem",
              color: "var(--kxd-cream-muted)",
            }}
          >
            {MOTORSPORTS_ENGAGEMENT.investmentNote}{" "}
            <Link
              href={MOTORSPORTS_ENGAGEMENT.investmentHref}
              className="underline decoration-[rgba(197,166,92,0.45)] underline-offset-4 transition hover:text-[var(--kxd-cream)]"
            >
              {MOTORSPORTS_ENGAGEMENT.investmentLabel}
            </Link>
            {" · "}
            <Link
              href={MOTORSPORTS_ENGAGEMENT.partnershipsHref}
              className="underline decoration-[rgba(197,166,92,0.45)] underline-offset-4 transition hover:text-[var(--kxd-cream)]"
            >
              {MOTORSPORTS_ENGAGEMENT.partnershipsLabel}
            </Link>
          </p>
        </div>
      </section>

      {/* Insights bridge */}
      <section
        className="kxd-section border-t"
        style={{
          background: "var(--kxd-black-pure)",
          borderColor: "var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "54rem" }}>
          <p className="kxd-eyebrow">Further reading</p>
          <h2
            className="kxd-serif-title mt-5"
            style={{ fontSize: "clamp(1.5rem, 2.8vw, 2rem)" }}
          >
            Motorsports strategy notes.
          </h2>
          <ul className="mt-10 space-y-0">
            {MOTORSPORTS_INSIGHT_LINKS.map((insight) => (
              <li
                key={insight.slug}
                className="border-t py-6"
                style={{ borderColor: "var(--kxd-border-white)" }}
              >
                <Link
                  href={`/insights/${insight.slug}`}
                  className="group inline-flex items-center gap-3 font-serif font-light"
                  style={{
                    fontSize: "1.125rem",
                    color: "var(--kxd-cream)",
                  }}
                >
                  <span className="transition-colors group-hover:text-[var(--kxd-gold)]">
                    {insight.title}
                  </span>
                  <span aria-hidden style={{ color: "var(--kxd-gold)" }}>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQs */}
      <section
        className="kxd-section border-t"
        style={{
          background: "var(--kxd-black-base)",
          borderColor: "var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "54rem" }}>
          <p className="kxd-eyebrow">Common questions</p>
          <h2
            className="kxd-serif-title mt-5"
            style={{ fontSize: "clamp(1.75rem, 3.2vw, 2.35rem)" }}
          >
            Straight answers.
          </h2>
          <dl className="mt-12">
            {MOTORSPORTS_FAQS.map((faq) => (
              <div
                key={faq.question}
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

      <FinalCtaBand
        headline="Ready to talk about the work?"
        subCopy="Start a project conversation, review investment levels, or run a website audit if you want a clearer diagnosis first."
        primaryLabel="Start a Project"
        primaryHref="/start-project"
        secondaryLabel="Website Audit"
        secondaryHref="/website-audit"
      />
    </>
  );
}
