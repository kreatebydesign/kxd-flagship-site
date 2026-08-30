import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FinalCtaBand } from "@/components/ui/FinalCtaBand";
import { StructuredData } from "@/components/seo/StructuredData";
import {
  CONSTRUCTION_CAPABILITIES,
  CONSTRUCTION_FAQS,
  CONSTRUCTION_PAGE,
  CONSTRUCTION_PHILOSOPHY,
  CONSTRUCTION_SELECTED_WORK,
} from "@/lib/content/construction-authority";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbSchema,
  faqPageSchema,
  webPageSchema,
} from "@/lib/seo/schema";

export const metadata: Metadata = buildMetadata({
  title: CONSTRUCTION_PAGE.title,
  description: CONSTRUCTION_PAGE.description,
  path: CONSTRUCTION_PAGE.path,
  keywords: [...CONSTRUCTION_PAGE.keywords],
});

const martinsen = CONSTRUCTION_SELECTED_WORK.find((w) => w.featured)!;
const eDavis = CONSTRUCTION_SELECTED_WORK.find((w) => !w.featured)!;

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="grid grid-cols-[7rem_1fr] gap-4 border-t py-3"
      style={{ borderColor: "var(--kxd-border-white)" }}
    >
      <dt
        className="font-sans font-medium uppercase"
        style={{
          fontSize: "0.625rem",
          letterSpacing: "0.16em",
          color: "var(--kxd-cream-muted)",
          paddingTop: "0.15rem",
        }}
      >
        {label}
      </dt>
      <dd
        className="font-sans font-light"
        style={{ fontSize: "0.9375rem", color: "var(--kxd-cream)", lineHeight: 1.45 }}
      >
        {value}
      </dd>
    </div>
  );
}

export default function ConstructionIndustryPage() {
  const faqSchema = faqPageSchema([...CONSTRUCTION_FAQS]);
  const schema = [
    breadcrumbSchema([{ name: "Construction & Trades", path: CONSTRUCTION_PAGE.path }]),
    webPageSchema({
      title: CONSTRUCTION_PAGE.title,
      description: CONSTRUCTION_PAGE.description,
      path: CONSTRUCTION_PAGE.path,
    }),
    ...(faqSchema ? [faqSchema] : []),
  ];

  return (
    <>
      <StructuredData data={schema} />

      {/* ── Typographic architectural hero — no project imagery ───── */}
      <section
        className="relative overflow-hidden border-b"
        style={{
          background: "var(--kxd-black-pure)",
          borderColor: "var(--kxd-border-white)",
          paddingTop: "var(--nav-height)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden lg:grid lg:grid-cols-12"
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-full border-r"
              style={{ borderColor: "rgba(255,255,255,0.035)" }}
            />
          ))}
        </div>

        <div className="kxd-container relative z-10">
          <div
            className="grid lg:grid-cols-12"
            style={{
              minHeight: "min(78vh, 42rem)",
              paddingTop: "clamp(3.5rem, 8vw, 6rem)",
              paddingBottom: "clamp(3rem, 6vw, 4.5rem)",
            }}
          >
            <div className="flex flex-col justify-end lg:col-span-7 lg:pr-10">
              <div
                aria-hidden
                className="mb-10 h-px w-12"
                style={{ background: "color-mix(in srgb, var(--kxd-gold) 55%, transparent)" }}
              />
              <p className="kxd-eyebrow kxd-reveal">{CONSTRUCTION_PAGE.eyebrow}</p>
              <h1
                className="kxd-serif-title kxd-reveal kxd-reveal-delay-1 mt-5"
                style={{
                  fontSize: "clamp(2.5rem, 5.5vw, 4.25rem)",
                  lineHeight: 1.04,
                  maxWidth: "12ch",
                  letterSpacing: "-0.02em",
                }}
              >
                {CONSTRUCTION_PAGE.headline}
              </h1>
              <p
                className="kxd-body kxd-reveal kxd-reveal-delay-2 mt-8"
                style={{
                  maxWidth: "30rem",
                  lineHeight: 1.7,
                  color: "var(--kxd-cream-muted)",
                  fontSize: "clamp(0.9375rem, 1.2vw, 1.0625rem)",
                }}
              >
                {CONSTRUCTION_PAGE.lead}
              </p>
              <div className="kxd-reveal kxd-reveal-delay-3 mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
                <Link href={CONSTRUCTION_PAGE.primaryCta.href} className="kxd-btn-primary">
                  {CONSTRUCTION_PAGE.primaryCta.label}
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
                  <span aria-hidden style={{ color: "var(--kxd-gold)" }}>
                    →
                  </span>
                </Link>
              </div>
            </div>

            <div
              className="relative mt-14 hidden flex-col justify-between border-l pl-8 lg:col-span-5 lg:mt-0 lg:flex lg:pl-12"
              style={{ borderColor: "var(--kxd-border-white)" }}
              aria-hidden
            >
              <p
                className="font-sans font-light tabular-nums"
                style={{
                  fontSize: "clamp(4.5rem, 8vw, 7rem)",
                  lineHeight: 0.9,
                  letterSpacing: "-0.04em",
                  color: "rgba(245,241,232,0.08)",
                }}
              >
                01
              </p>
              <div>
                <div
                  className="mb-6 h-px w-full"
                  style={{ background: "var(--kxd-border-white)" }}
                />
                <dl className="space-y-4">
                  <div className="flex justify-between gap-6">
                    <dt
                      className="font-sans font-medium uppercase"
                      style={{
                        fontSize: "0.625rem",
                        letterSpacing: "0.16em",
                        color: "var(--kxd-cream-muted)",
                      }}
                    >
                      Focus
                    </dt>
                    <dd
                      className="text-right font-sans font-light"
                      style={{ fontSize: "0.8125rem", color: "var(--kxd-cream)" }}
                    >
                      Construction &amp; Trades
                    </dd>
                  </div>
                  <div className="flex justify-between gap-6">
                    <dt
                      className="font-sans font-medium uppercase"
                      style={{
                        fontSize: "0.625rem",
                        letterSpacing: "0.16em",
                        color: "var(--kxd-cream-muted)",
                      }}
                    >
                      Proof
                    </dt>
                    <dd
                      className="text-right font-sans font-light"
                      style={{ fontSize: "0.8125rem", color: "var(--kxd-cream)" }}
                    >
                      Project plates below
                    </dd>
                  </div>
                  <div className="flex justify-between gap-6">
                    <dt
                      className="font-sans font-medium uppercase"
                      style={{
                        fontSize: "0.625rem",
                        letterSpacing: "0.16em",
                        color: "var(--kxd-cream-muted)",
                      }}
                    >
                      Studio
                    </dt>
                    <dd
                      className="text-right font-sans font-light"
                      style={{ fontSize: "0.8125rem", color: "var(--kxd-cream)" }}
                    >
                      KXD
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Martinsen dossier — dominant project plate ─────────────── */}
      <section
        id="selected-work"
        style={{ background: "var(--kxd-black-base)" }}
      >
        <div className="kxd-container" style={{ paddingTop: "clamp(2.75rem, 5vw, 4rem)", paddingBottom: "clamp(2.5rem, 4vw, 3.25rem)" }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="kxd-eyebrow">Selected work</p>
              <h2
                className="kxd-serif-title mt-3"
                style={{ fontSize: "clamp(1.65rem, 3vw, 2.35rem)", maxWidth: "18ch" }}
              >
                Project plates.
              </h2>
            </div>
            <Link
              href="/work"
              className="kxd-ui-label inline-flex items-center gap-2 self-start text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
            >
              All work
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        <div
          className="border-y"
          style={{ borderColor: "var(--kxd-border-white)" }}
        >
          <div className="grid lg:grid-cols-12">
            <Link
              href={`/work/${martinsen.slug}`}
              className="group relative block overflow-hidden lg:col-span-8"
              style={{ minHeight: "min(78vh, 44rem)" }}
            >
              <Image
                src={martinsen.image}
                alt="Martinsen Construction — structural framing"
                fill
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                style={{ objectPosition: "72% 48%" }}
              />
            </Link>

            <div
              className="flex flex-col justify-between border-t px-6 py-10 sm:px-10 lg:col-span-4 lg:border-l lg:border-t-0 lg:px-10 lg:py-12"
              style={{
                borderColor: "var(--kxd-border-white)",
                background: "var(--kxd-black-pure)",
              }}
            >
              <div>
                <p className="kxd-eyebrow">01</p>
                <h3
                  className="mt-5 font-serif font-light"
                  style={{
                    fontSize: "clamp(1.75rem, 2.8vw, 2.25rem)",
                    lineHeight: 1.12,
                    color: "var(--kxd-cream)",
                    maxWidth: "12ch",
                  }}
                >
                  {martinsen.title}
                </h3>
                <p
                  className="mt-6 font-sans font-light"
                  style={{
                    fontSize: "0.9375rem",
                    lineHeight: 1.7,
                    color: "var(--kxd-cream-muted)",
                  }}
                >
                  {martinsen.summary}
                </p>
                <dl className="mt-10">
                  <SpecRow label="Industry" value={martinsen.industry} />
                  <SpecRow label="Region" value={martinsen.region} />
                  <SpecRow label="Scope" value={martinsen.scope} />
                  <SpecRow label="Year" value={martinsen.year} />
                </dl>
              </div>
              <Link
                href={`/work/${martinsen.slug}`}
                className="kxd-ui-label mt-12 inline-flex items-center gap-2 text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
              >
                View case study
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── E. Davis — secondary contrasting story ─────────────────── */}
      <section style={{ background: "var(--kxd-black-pure)" }}>
        <div className="grid lg:grid-cols-12">
          <div
            className="order-2 flex flex-col justify-center border-b px-6 py-12 sm:px-10 lg:order-1 lg:col-span-5 lg:border-b-0 lg:border-r lg:px-12 lg:py-16"
            style={{ borderColor: "var(--kxd-border-white)" }}
          >
            <p className="kxd-eyebrow">02</p>
            <h3
              className="mt-5 font-serif font-light"
              style={{
                fontSize: "clamp(1.55rem, 2.6vw, 2rem)",
                lineHeight: 1.15,
                color: "var(--kxd-cream)",
                maxWidth: "14ch",
              }}
            >
              {eDavis.title}
            </h3>
            <p
              className="mt-5 font-sans font-light"
              style={{
                fontSize: "0.9375rem",
                lineHeight: 1.7,
                color: "var(--kxd-cream-muted)",
                maxWidth: "30rem",
              }}
            >
              {eDavis.summary}
            </p>
            <dl className="mt-8 max-w-sm">
              <SpecRow label="Industry" value={eDavis.industry} />
              <SpecRow label="Region" value={eDavis.region} />
              <SpecRow label="Scope" value={eDavis.scope} />
              <SpecRow label="Year" value={eDavis.year} />
            </dl>
            <Link
              href={`/work/${eDavis.slug}`}
              className="kxd-ui-label mt-10 inline-flex items-center gap-2 text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
            >
              View case study
              <span aria-hidden>→</span>
            </Link>
          </div>

          <Link
            href={`/work/${eDavis.slug}`}
            className="group relative order-1 block overflow-hidden lg:order-2 lg:col-span-7"
            style={{ minHeight: "min(48vh, 28rem)" }}
          >
            <Image
              src={eDavis.image}
              alt="E. Davis Enterprises — field installation work"
              fill
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
              style={{ objectPosition: eDavis.imagePosition }}
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(0deg, rgba(5,5,5,0.35) 0%, transparent 40%)",
              }}
            />
          </Link>
        </div>
      </section>

      {/* ── Philosophy — dense architectural statement ─────────────── */}
      <section
        className="border-t"
        style={{
          background: "var(--kxd-black-base)",
          borderColor: "var(--kxd-border-white)",
          paddingTop: "clamp(3rem, 5.5vw, 4.5rem)",
          paddingBottom: "clamp(3rem, 5.5vw, 4.5rem)",
        }}
      >
        <div className="kxd-container">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-3">
              <p className="kxd-eyebrow">{CONSTRUCTION_PHILOSOPHY.eyebrow}</p>
            </div>
            <div
              className="relative lg:col-span-8 lg:col-start-5"
              style={{
                borderLeft: "1px solid color-mix(in srgb, var(--kxd-gold) 40%, transparent)",
                paddingLeft: "clamp(1.25rem, 2.5vw, 2rem)",
              }}
            >
              <h2
                className="kxd-serif-title"
                style={{
                  fontSize: "clamp(1.65rem, 3.2vw, 2.5rem)",
                  lineHeight: 1.15,
                  maxWidth: "18ch",
                }}
              >
                {CONSTRUCTION_PHILOSOPHY.title}
              </h2>
              <p
                className="mt-6 font-sans font-light"
                style={{
                  fontSize: "clamp(1rem, 1.4vw, 1.125rem)",
                  lineHeight: 1.75,
                  color: "var(--kxd-cream-muted)",
                  maxWidth: "36rem",
                }}
              >
                {CONSTRUCTION_PHILOSOPHY.body}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Capabilities — drawing-sheet index, not Hospitality stack ─ */}
      <section
        className="border-t"
        style={{
          background: "var(--kxd-black-pure)",
          borderColor: "var(--kxd-border-white)",
          paddingTop: "clamp(3rem, 5.5vw, 4.5rem)",
          paddingBottom: "clamp(3rem, 5.5vw, 4.5rem)",
        }}
      >
        <div className="kxd-container">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
            <p className="kxd-eyebrow">Scope of work</p>
            <p
              className="font-sans font-light"
              style={{
                fontSize: "0.875rem",
                color: "var(--kxd-cream-muted)",
                maxWidth: "28rem",
                lineHeight: 1.6,
              }}
            >
              Only capabilities demonstrated by the work above.
            </p>
          </div>

          <div
            className="mt-12 grid border-t md:grid-cols-2"
            style={{ borderColor: "var(--kxd-border-white)" }}
          >
            {CONSTRUCTION_CAPABILITIES.map((capability, index) => (
              <article
                key={capability.href}
                className={`border-b px-0 py-10 md:border-b-0 md:px-8 md:py-12 lg:px-10 ${
                  index === 0 ? "md:border-r" : ""
                }`}
                style={{ borderColor: "var(--kxd-border-white)" }}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <p className="kxd-eyebrow">{capability.eyebrow}</p>
                  <span
                    className="font-sans font-light tabular-nums"
                    style={{ fontSize: "0.75rem", color: "var(--kxd-cream-muted)" }}
                  >
                    {capability.index}
                  </span>
                </div>
                <h3
                  className="mt-6 font-serif font-light"
                  style={{
                    fontSize: "clamp(1.25rem, 2vw, 1.55rem)",
                    lineHeight: 1.25,
                    color: "var(--kxd-cream)",
                    maxWidth: "18ch",
                  }}
                >
                  {capability.title}
                </h3>
                <p
                  className="mt-4 font-sans font-light"
                  style={{
                    fontSize: "0.9375rem",
                    lineHeight: 1.75,
                    color: "var(--kxd-cream-muted)",
                    maxWidth: "32rem",
                  }}
                >
                  {capability.body}
                </p>
                <Link
                  href={capability.href}
                  className="kxd-ui-label mt-8 inline-flex items-center gap-2 text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
                >
                  {capability.linkLabel}
                  <span aria-hidden>→</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ — visually subordinate ─────────────────────────────── */}
      <section
        className="border-t"
        style={{
          background: "var(--kxd-black-base)",
          borderColor: "var(--kxd-border-white)",
          paddingTop: "clamp(2.5rem, 4.5vw, 3.5rem)",
          paddingBottom: "clamp(2.5rem, 4.5vw, 3.5rem)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "42rem" }}>
          <p
            className="font-sans font-medium uppercase"
            style={{
              fontSize: "0.625rem",
              letterSpacing: "0.18em",
              color: "rgba(191,183,170,0.55)",
            }}
          >
            Questions
          </p>
          <dl className="mt-8">
            {CONSTRUCTION_FAQS.map((faq) => (
              <div
                key={faq.question}
                className="border-t py-5"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <dt
                  className="font-sans font-medium"
                  style={{
                    fontSize: "0.875rem",
                    lineHeight: 1.45,
                    color: "rgba(245,240,232,0.88)",
                    maxWidth: "34rem",
                  }}
                >
                  {faq.question}
                </dt>
                <dd
                  className="mt-2.5 font-sans font-light"
                  style={{
                    fontSize: "0.8125rem",
                    lineHeight: 1.7,
                    color: "rgba(191,183,170,0.62)",
                    maxWidth: "36rem",
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
        headline="Begin a construction or trades project."
        subCopy="Selective engagements for construction companies, contractors, and trades businesses ready for digital presence at the standard of their fieldwork."
        primaryLabel="Start a Project"
        primaryHref="/start-project"
        secondaryLabel="Website Audit"
        secondaryHref="/website-audit"
      />
    </>
  );
}
