import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CASE_STUDIES, PROJECTS } from "@/lib/projects";
import type { ShowcaseImage } from "@/lib/projects";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { buildMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cs = CASE_STUDIES[slug];
  if (!cs) return {};
  return buildMetadata({
    title: cs.title,
    description: cs.tagline,
    path: `/work/${cs.slug}`,
    keywords: [cs.industry, ...cs.scope, "KXD Case Study"],
  });
}

/* ─── Shared prose style ─── */
const proseStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "clamp(1rem, 1.35vw, 1.125rem)",
  fontWeight: 300,
  lineHeight: 1.88,
  color: "var(--kxd-cream-muted)",
};

/* ─── Section label + serif heading component ─── */
function SectionLabel({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-4">
      <span
        aria-hidden
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "0.75rem",
          fontWeight: 300,
          color: "var(--kxd-gold)",
          opacity: 0.55,
          letterSpacing: "0.08em",
        }}
      >
        {number}
      </span>
      <p className="kxd-eyebrow">{label}</p>
    </div>
  );
}

/* ─── Showcase image frame ─── */
function ShowcaseFrame({
  image,
  aspectRatio = "16 / 9",
  priority = false,
}: {
  image: ShowcaseImage;
  aspectRatio?: string;
  priority?: boolean;
}) {
  return (
    <div className="group relative overflow-hidden" style={{ aspectRatio, border: "1px solid var(--kxd-border-gold)" }}>
      <Image
        src={image.src}
        alt={image.alt}
        fill
        className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.015]"
        sizes="(max-width: 1024px) 100vw, 78rem"
        priority={priority}
      />
      {/* Cinematic framing overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, transparent 25%, transparent 72%, rgba(0,0,0,0.38) 100%)",
        }}
      />
      {image.caption ? (
        <p
          className="kxd-label absolute bottom-4 right-5"
          style={{ color: "rgba(197,166,92,0.55)", letterSpacing: "0.16em", fontSize: "0.5rem" }}
        >
          {image.caption}
        </p>
      ) : null}
    </div>
  );
}

export default async function CaseStudyPage({ params }: Props) {
  const { slug } = await params;
  const cs = CASE_STUDIES[slug];

  if (!cs) notFound();

  const related = PROJECTS.filter((p) => p.slug !== slug).slice(0, 3);

  return (
    <>
      {/* ══════════════════════════════════════════
          01 — CINEMATIC HERO
          ══════════════════════════════════════════ */}
      <section
        className="relative flex min-h-[92dvh] flex-col overflow-hidden"
        style={{ background: "var(--kxd-black-pure)" }}
      >
        {/* Architectural light shafts */}
        <div
          aria-hidden
          className="kxd-atmosphere-enter kxd-atmosphere-breathe pointer-events-none absolute inset-0"
          style={{
            background: [
              "radial-gradient(ellipse 26% 68% at 50% -4%, rgba(197,166,92,0.060) 0%, transparent 60%)",
              "radial-gradient(ellipse 13% 54% at 34% -6%, rgba(197,166,92,0.026) 0%, transparent 54%)",
              "radial-gradient(ellipse 13% 54% at 66% -6%, rgba(197,166,92,0.022) 0%, transparent 54%)",
              "radial-gradient(ellipse 70% 28% at 50% 110%, rgba(197,166,92,0.014) 0%, transparent 60%)",
            ].join(", "),
          }}
        />
        <div aria-hidden className="kxd-vignette pointer-events-none absolute inset-0" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-44 kxd-hero-bottom-fade"
        />

        {/* Top nav row */}
        <div
          className="relative z-10 kxd-container flex items-center justify-between"
          style={{ paddingTop: "calc(var(--nav-height) + 2.25rem)" }}
        >
          <Link
            href="/work"
            className="group inline-flex items-center gap-2.5 font-sans font-medium uppercase"
            style={{
              fontSize: "0.5625rem",
              letterSpacing: "0.18em",
              color: "rgba(191,183,170,0.45)",
            }}
          >
            <span
              aria-hidden
              className="inline-block transition-transform duration-300 group-hover:-translate-x-0.5"
              style={{ color: "var(--kxd-gold)" }}
            >
              ←
            </span>
            <span className="transition-colors duration-200 group-hover:text-[var(--kxd-cream-muted)]">
              Selected Work
            </span>
          </Link>

          {cs.url ? (
            <a
              href={cs.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 font-sans font-medium uppercase"
              style={{
                fontSize: "0.5625rem",
                letterSpacing: "0.18em",
                color: "rgba(191,183,170,0.45)",
              }}
            >
              <span className="transition-colors duration-200 group-hover:text-[var(--kxd-cream-muted)]">
                Visit Live Site
              </span>
              <span
                aria-hidden
                className="inline-block transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                style={{ color: "var(--kxd-gold)" }}
              >
                ↗
              </span>
            </a>
          ) : null}
        </div>

        {/* Hero content — anchored to bottom */}
        <div
          className="relative z-10 kxd-container mt-auto"
          style={{ paddingBottom: "clamp(4.5rem, 9vw, 7rem)" }}
        >
          {/* Industry + Year */}
          <div className="mb-7 flex flex-wrap items-center gap-3">
            <span className="kxd-tag">{cs.industry}</span>
            {cs.scope.slice(1).map((s) => (
              <span key={s} className="kxd-tag">{s}</span>
            ))}
            <span
              className="kxd-label ml-1"
              style={{ color: "rgba(191,183,170,0.30)" }}
            >
              {cs.year}
            </span>
          </div>

          {/* Title */}
          <h1
            className="kxd-reveal font-serif font-light"
            style={{
              fontSize: "clamp(2.75rem, 6.5vw, 5.5rem)",
              lineHeight: 1.05,
              letterSpacing: "0.01em",
              color: "var(--kxd-cream)",
              maxWidth: "17ch",
            }}
          >
            {cs.title}
          </h1>

          {/* Tagline */}
          <p
            className="kxd-reveal kxd-reveal-delay-1 mt-6 font-serif font-light italic"
            style={{
              fontSize: "clamp(1.0625rem, 2vw, 1.3125rem)",
              lineHeight: 1.58,
              letterSpacing: "0.012em",
              color: "var(--kxd-cream-soft)",
              maxWidth: "46ch",
            }}
          >
            {cs.tagline}
          </p>

          {/* Primary scope tag */}
          <div className="kxd-reveal kxd-reveal-delay-2 mt-8">
            <span className="kxd-tag">{cs.scope[0]}</span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PROJECT SNAPSHOT STRIP
          ══════════════════════════════════════════ */}
      <div
        style={{
          background: "var(--kxd-black-deep)",
          borderTop: "1px solid var(--kxd-border-gold)",
          borderBottom: "1px solid var(--kxd-border-white)",
        }}
      >
        <div
          className="kxd-container grid grid-cols-2 gap-px sm:grid-cols-4"
          style={{ paddingBlock: "clamp(2rem, 4.5vw, 3.25rem)" }}
        >
          {[
            { label: "Client", value: cs.title },
            { label: "Industry", value: cs.industry },
            { label: "Scope", value: cs.scope[0] },
            { label: "Status", value: cs.status },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="kxd-eyebrow">{label}</p>
              <p
                className="mt-2.5 font-serif font-light"
                style={{
                  fontSize: "clamp(0.9375rem, 1.4vw, 1.125rem)",
                  lineHeight: 1.4,
                  letterSpacing: "0.01em",
                  color: "var(--kxd-cream)",
                }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          02 — CONTEXT & OPPORTUNITY
          ══════════════════════════════════════════ */}
      <section
        className="kxd-section"
        style={{ background: "var(--kxd-black-base)" }}
      >
        <div className="kxd-container">
          <div className="grid gap-10 lg:grid-cols-[15rem_1fr] lg:gap-20">
            <div>
              <SectionLabel number="02" label="Context & Opportunity" />
              <div className="kxd-white-rule mt-6" />
            </div>
            <div>
              <p style={proseStyle}>{cs.context}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          03 — THE CHALLENGE
          ══════════════════════════════════════════ */}
      <section
        className="kxd-section"
        style={{
          background: "var(--kxd-black-soft)",
          borderTop: "1px solid var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container">
          <div className="grid gap-10 lg:grid-cols-[15rem_1fr] lg:gap-20">
            <div>
              <SectionLabel number="03" label="The Challenge" />
              <div className="kxd-white-rule mt-6" />
            </div>
            <div>
              {/* Oversized opener */}
              <p
                className="mb-0 font-serif font-light italic"
                style={{
                  fontSize: "clamp(1.25rem, 2.2vw, 1.625rem)",
                  lineHeight: 1.5,
                  letterSpacing: "0.012em",
                  color: "var(--kxd-cream-soft)",
                  marginBottom: "1.75rem",
                }}
              >
                {cs.challenge.split(".")[0]}.
              </p>
              <p style={{ ...proseStyle, color: "rgba(191,183,170,0.65)" }}>
                {cs.challenge.split(".").slice(1).join(".").trim()}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          04 — STRATEGIC APPROACH
          ══════════════════════════════════════════ */}
      <section
        className="kxd-section"
        style={{
          background: "var(--kxd-black-pure)",
          borderTop: "1px solid var(--kxd-border-gold)",
        }}
      >
        <div className="kxd-container">
          <div className="grid gap-10 lg:grid-cols-[15rem_1fr] lg:gap-20">
            <div>
              <SectionLabel number="04" label="Strategic Approach" />
              <div className="kxd-gold-rule mt-6" />
              <p
                className="mt-6 font-serif font-light italic"
                style={{
                  fontSize: "0.8125rem",
                  lineHeight: 1.65,
                  letterSpacing: "0.01em",
                  color: "var(--kxd-gold)",
                  opacity: 0.7,
                }}
              >
                How KXD thinks.
              </p>
            </div>
            <div>
              <p
                style={{
                  ...proseStyle,
                  fontSize: "clamp(1rem, 1.5vw, 1.1875rem)",
                  lineHeight: 1.9,
                }}
              >
                {cs.strategy}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          05 — EXECUTION
          ══════════════════════════════════════════ */}
      <section
        className="kxd-section"
        style={{
          background: "var(--kxd-black-deep)",
          borderTop: "1px solid var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container">
          <div className="mb-12">
            <SectionLabel number="05" label="Execution" />
          </div>

          <div className="kxd-gold-rule mb-12" />

          <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3">
            {cs.execution.map((item, i) => {
              const parts = item.split(" — ");
              const heading = parts[0];
              const body = parts[1] || "";
              return (
                <div
                  key={i}
                  style={{
                    padding: "clamp(1.75rem, 3.5vw, 2.5rem)",
                    borderLeft: "1px solid var(--kxd-border-white)",
                    borderBottom:
                      i < cs.execution.length - 1
                        ? "1px solid var(--kxd-border-white)"
                        : "none",
                  }}
                >
                  <p
                    className="font-serif font-light"
                    style={{
                      fontSize: "clamp(1rem, 1.4vw, 1.125rem)",
                      lineHeight: 1.4,
                      letterSpacing: "0.01em",
                      color: "var(--kxd-cream)",
                      marginBottom: body ? "0.875rem" : 0,
                    }}
                  >
                    {heading}
                  </p>
                  {body ? (
                    <p
                      className="kxd-body-sm"
                      style={{ fontSize: "0.9375rem", lineHeight: 1.75 }}
                    >
                      {body}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          06 — EXPERIENCE SHOWCASE
          ══════════════════════════════════════════ */}
      <section
        style={{
          background: "var(--kxd-black-pure)",
          borderTop: "1px solid var(--kxd-border-white)",
        }}
      >
        <div
          className="kxd-container"
          style={{ paddingBlock: "clamp(3.5rem, 7vw, 5.5rem)" }}
        >
          <div className="mb-10 flex items-end justify-between gap-6">
            <SectionLabel number="06" label="Experience Showcase" />
            {cs.url ? (
              <a
                href={cs.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group hidden items-center gap-2 font-sans font-medium uppercase sm:inline-flex"
                style={{
                  fontSize: "0.5625rem",
                  letterSpacing: "0.18em",
                  color: "var(--kxd-gold)",
                  opacity: 0.65,
                }}
              >
                <span className="transition-opacity group-hover:opacity-100">View Live</span>
                <span
                  aria-hidden
                  className="inline-block transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                >
                  ↗
                </span>
              </a>
            ) : null}
          </div>

          {cs.showcaseImages.length > 0 ? (
            <div className="flex flex-col gap-3">
              {/* Primary image — full width, tall */}
              <ShowcaseFrame
                image={cs.showcaseImages[0]}
                aspectRatio="16 / 8"
                priority
              />

              {/* Secondary images — side by side grid */}
              {cs.showcaseImages.length > 1 ? (
                <div
                  className="grid gap-3"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(cs.showcaseImages.length - 1, 3)}, 1fr)`,
                  }}
                >
                  {cs.showcaseImages.slice(1).map((img, i) => (
                    <ShowcaseFrame key={i} image={img} aspectRatio="16 / 10" />
                  ))}
                </div>
              ) : null}
            </div>
          ) : cs.image ? (
            /* Fallback: single image from project card */
            <ShowcaseFrame
              image={{ src: cs.image, alt: `${cs.title} — digital experience` }}
              aspectRatio="16 / 9"
              priority
            />
          ) : (
            /* Premium placeholder */
            <div
              className="relative flex flex-col items-center justify-center overflow-hidden"
              style={{
                aspectRatio: "16 / 9",
                border: "1px solid var(--kxd-border-gold)",
                background: "var(--kxd-black-deep)",
              }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background: [
                    "radial-gradient(ellipse 50% 40% at 50% 80%, rgba(197,166,92,0.04) 0%, transparent 65%)",
                    "radial-gradient(ellipse 30% 20% at 50% 0%, rgba(197,166,92,0.02) 0%, transparent 60%)",
                  ].join(", "),
                }}
              />
              {cs.logo ? (
                <Image
                  src={cs.logo}
                  alt=""
                  width={220}
                  height={88}
                  className="relative z-[1] h-16 w-auto max-w-[38%] object-contain brightness-0 invert"
                  style={{ opacity: 0.22 }}
                />
              ) : (
                <p
                  className="kxd-label relative z-[1]"
                  style={{ color: "rgba(197,166,92,0.20)", letterSpacing: "0.22em" }}
                >
                  {cs.title}
                </p>
              )}
              <p
                className="kxd-label absolute bottom-7"
                style={{ color: "rgba(197,166,92,0.25)", letterSpacing: "0.2em", fontSize: "0.5rem" }}
              >
                Visual Documentation in Progress
              </p>
            </div>
          )}

          {cs.url ? (
            <div className="mt-8 flex items-center gap-5">
              <a
                href={cs.url}
                target="_blank"
                rel="noopener noreferrer"
                className="kxd-btn-primary"
              >
                Visit Live Site
              </a>
              <span className="kxd-label" style={{ color: "rgba(191,183,170,0.28)" }}>
                {cs.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </span>
            </div>
          ) : null}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          07 — OUTCOMES & IMPACT
          ══════════════════════════════════════════ */}
      <section
        className="kxd-section"
        style={{
          background: "var(--kxd-black-base)",
          borderTop: "1px solid var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container">
          <div className="mb-12">
            <SectionLabel number="07" label="Outcomes & Impact" />
          </div>

          {/* Pull statement */}
          <p
            className="mb-12 font-serif font-light"
            style={{
              fontSize: "clamp(1.5rem, 3vw, 2.375rem)",
              lineHeight: 1.22,
              letterSpacing: "0.008em",
              color: "var(--kxd-cream)",
              maxWidth: "32ch",
            }}
          >
            {cs.tagline}
          </p>

          <div className="kxd-gold-rule" />

          <ul>
            {cs.qualitativeOutcomes.map((outcome, i) => (
              <li
                key={i}
                className="flex items-start gap-6 py-6"
                style={{
                  borderBottom:
                    i < cs.qualitativeOutcomes.length - 1
                      ? "1px solid var(--kxd-border-white)"
                      : "none",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    color: "var(--kxd-gold)",
                    fontFamily: "var(--font-serif)",
                    fontSize: "1rem",
                    lineHeight: 1.75,
                    flexShrink: 0,
                    opacity: 0.55,
                  }}
                >
                  —
                </span>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "clamp(0.9375rem, 1.2vw, 1.0625rem)",
                    fontWeight: 300,
                    lineHeight: 1.7,
                    color: "var(--kxd-cream-muted)",
                  }}
                >
                  {outcome}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          08 — WHY IT WORKED
          ══════════════════════════════════════════ */}
      <section
        className="kxd-section"
        style={{
          background: "var(--kxd-black-pure)",
          borderTop: "1px solid var(--kxd-border-gold)",
        }}
      >
        <div className="kxd-container">
          <div className="grid gap-10 lg:grid-cols-[15rem_1fr] lg:gap-20">
            <div>
              <SectionLabel number="08" label="Why It Worked" />
              <div className="kxd-gold-rule mt-6" />
              <p
                className="mt-6 font-serif font-light italic"
                style={{
                  fontSize: "0.8125rem",
                  lineHeight: 1.65,
                  color: "var(--kxd-gold)",
                  opacity: 0.65,
                }}
              >
                KXD methodology.
              </p>
            </div>
            <div>
              {/* Blockquote-style treatment */}
              <div
                style={{
                  paddingLeft: "1.75rem",
                  borderLeft: "2px solid var(--kxd-border-gold-strong)",
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "clamp(1.125rem, 1.8vw, 1.4375rem)",
                    fontWeight: 300,
                    lineHeight: 1.62,
                    letterSpacing: "0.01em",
                    color: "var(--kxd-cream-soft)",
                    fontStyle: "normal",
                  }}
                >
                  {cs.whyItWorked}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          09 — RELATED WORK
          ══════════════════════════════════════════ */}
      {related.length > 0 ? (
        <section
          className="kxd-section"
          style={{
            background: "var(--kxd-black-deep)",
            borderTop: "1px solid var(--kxd-border-white)",
          }}
        >
          <div className="kxd-container">
            <div className="mb-10 flex items-end justify-between gap-6">
              <div>
                <SectionLabel number="09" label="Related Work" />
                <h2
                  className="kxd-serif-title mt-4"
                  style={{ fontSize: "clamp(1.375rem, 2.5vw, 1.875rem)" }}
                >
                  More from the portfolio.
                </h2>
              </div>
              <Link
                href="/work"
                className="group hidden items-center gap-2 font-sans font-medium uppercase sm:inline-flex"
                style={{
                  fontSize: "0.5625rem",
                  letterSpacing: "0.18em",
                  color: "var(--kxd-cream-muted)",
                }}
              >
                <span className="transition-colors group-hover:text-[var(--kxd-cream)]">
                  All Work
                </span>
                <span
                  aria-hidden
                  className="inline-block transition-transform group-hover:translate-x-0.5"
                  style={{ color: "var(--kxd-gold)" }}
                >
                  →
                </span>
              </Link>
            </div>

            <div className="kxd-gold-rule mb-10" />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((project, i) => (
                <ProjectCard key={project.slug} project={project} index={i} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ══════════════════════════════════════════
          10 — FINAL CTA
          ══════════════════════════════════════════ */}
      <section
        className="kxd-section"
        style={{
          background: "var(--kxd-black-pure)",
          borderTop: "1px solid var(--kxd-border-gold)",
        }}
      >
        <div className="kxd-container">
          <div className="mx-auto max-w-[44rem] text-center">
            <p className="kxd-eyebrow mb-8">10 — Start a Project</p>

            <div className="kxd-gold-rule mb-10" />

            <h2
              className="font-serif font-light"
              style={{
                fontSize: "clamp(2rem, 4.5vw, 3.5rem)",
                lineHeight: 1.1,
                letterSpacing: "0.01em",
                color: "var(--kxd-cream)",
              }}
            >
              Build Something That Lasts.
            </h2>

            <p
              className="mx-auto mt-7"
              style={{
                ...proseStyle,
                fontSize: "clamp(0.9375rem, 1.3vw, 1.0625rem)",
                maxWidth: "40ch",
                textAlign: "center",
              }}
            >
              From luxury websites to operational platforms, KXD helps ambitious brands
              create digital experiences designed to hold weight long after launch.
            </p>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              <Link href="/contact" className="kxd-btn-primary">
                Start a Project
              </Link>
              <Link
                href="/work"
                className="group inline-flex items-center gap-2.5 font-sans font-medium uppercase"
                style={{
                  fontSize: "0.6875rem",
                  letterSpacing: "var(--tracking-button)",
                  color: "var(--kxd-cream-muted)",
                }}
              >
                <span className="transition-colors duration-200 group-hover:text-[var(--kxd-cream)]">
                  View All Work
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
        </div>
      </section>
    </>
  );
}
