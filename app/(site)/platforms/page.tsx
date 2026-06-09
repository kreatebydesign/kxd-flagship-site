import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo/metadata";
import { FinalCtaBand } from "@/components/ui/FinalCtaBand";

export const metadata: Metadata = buildMetadata({
  title: "Platforms",
  description:
    "Membership platforms, client portals, operational dashboards, and enterprise systems — built as brand extensions, not software products.",
  path: "/platforms",
  noIndex: true,
});

// ── Data ─────────────────────────────────────────────────────────────────────

const PHILOSOPHY_PILLARS = [
  {
    title: "Brand-First Thinking",
    body: "Every system we build reflects the brand it lives inside. Operational tools shouldn't look like operational tools.",
  },
  {
    title: "Operational Clarity",
    body: "We map existing workflows before designing anything. The goal is visibility and alignment, not automation for its own sake.",
  },
  {
    title: "Selective Partnerships",
    body: "KXD only works with organizations we can serve with full commitment. This work demands deep understanding and trust.",
  },
  {
    title: "Long-Term Scalability",
    body: "Systems built to grow with the business — not to be replaced by it. Architecture decisions that compound over time.",
  },
] as const;

const PLATFORM_CATEGORIES = [
  {
    letter: "A",
    name: "Motorsports OS",
    descriptor: "Purpose-built for racing organizations and high-performance brands.",
    capabilities: [
      "Driver portals — licensing, communications, performance data",
      "Operations dashboards — team coordination and live logistics",
      "CRM infrastructure — sponsor and driver relationship management",
      "Enrollment systems — registration, onboarding, and credentialing",
    ],
  },
  {
    letter: "B",
    name: "Hospitality OS",
    descriptor: "Elevating the guest experience through seamless operational systems.",
    capabilities: [
      "Reservation workflows — integrated booking experiences",
      "Membership experiences — member portals and exclusive access",
      "Internal operations — staff tooling and coordination systems",
      "Concierge systems — white-glove request management",
    ],
  },
  {
    letter: "C",
    name: "Membership Platforms",
    descriptor: "Community and content infrastructure for exclusive organizations.",
    capabilities: [
      "Community portals — gated member environments",
      "Content systems — structured delivery of exclusive content",
      "Event management — registration, RSVP, and logistics",
      "Internal communications — seamless member-to-brand interaction",
    ],
  },
  {
    letter: "D",
    name: "Enterprise Systems",
    descriptor: "Operational infrastructure for organizations that have outgrown generic tools.",
    capabilities: [
      "Client dashboards — real-time project and account visibility",
      "Operational workflows — process automation and task coordination",
      "Administrative tooling — internal efficiency systems",
      "Reporting systems — custom data views and business intelligence",
    ],
  },
] as const;

const PROCESS_STEPS = [
  {
    number: "01",
    title: "Discovery",
    body: "We audit how the organization actually operates — not how it's supposed to. Conversations, walkthroughs, and a clear view of the gaps.",
  },
  {
    number: "02",
    title: "Operational Mapping",
    body: "Every workflow, touchpoint, and handoff is documented. We design around how people genuinely work, then improve it.",
  },
  {
    number: "03",
    title: "Experience Design",
    body: "Interfaces and information architecture that reflect both the brand and the user. Clarity without compromise.",
  },
  {
    number: "04",
    title: "Development",
    body: "Built for longevity, not for speed-to-ship. Every decision is made with scale, maintainability, and brand integrity in mind.",
  },
  {
    number: "05",
    title: "Launch & Evolution",
    body: "Systems deployed with precision. Ongoing refinement as the organization grows and the platform earns real-world feedback.",
  },
] as const;

const FEATURED_WORK = [
  {
    slug: "primal-motorsports",
    title: "Primal Motorsports",
    category: "Motorsports OS",
    description:
      "Website, membership architecture, and growth infrastructure for one of motorsports' most ambitious brands — built as a complete operational layer, not a collection of tools.",
    outcome: "Flagship presence for a performance brand that competes at the top.",
  },
  {
    slug: "plate-the-umpqua",
    title: "Plate the Umpqua",
    category: "Hospitality OS",
    description:
      "Brand and digital platform for a culinary destination rooted in Pacific Northwest provenance — designed to elevate the guest experience from first discovery to reservation.",
    outcome: "A hospitality identity built to anchor a growing regional experience.",
  },
] as const;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PlatformsPage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: "calc(var(--nav-height) + var(--section-py))",
          paddingBottom: "var(--section-py)",
          background: "var(--kxd-black-pure)",
          borderBottom: "1px solid var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "62rem" }}>
          <p className="kxd-eyebrow">Operational Platforms</p>

          <h1
            className="kxd-serif-title mt-5"
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4rem)",
              lineHeight: 1.04,
              maxWidth: "28rem",
            }}
          >
            Systems that run the business behind the brand.
          </h1>

          <p
            className="kxd-body mt-7"
            style={{ maxWidth: "38rem", lineHeight: 1.8 }}
          >
            KXD develops operational platforms for organizations that have
            outgrown disconnected tools — creating systems that improve
            visibility, efficiency, and experience without sacrificing brand
            integrity.
          </p>

          {/* Context markers */}
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
            {[
              "Custom-built, never off-the-shelf",
              "Brand-native by design",
              "Selective client partnerships",
            ].map((point) => (
              <div key={point} className="flex items-center gap-2.5">
                <div
                  aria-hidden
                  style={{
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    background: "var(--kxd-gold)",
                    flexShrink: 0,
                  }}
                />
                <p className="kxd-label" style={{ letterSpacing: "0.10em" }}>
                  {point}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform Philosophy ─────────────────────────────────────────────── */}
      <section
        className="kxd-section"
        style={{ background: "var(--kxd-black-base)", borderBottom: "1px solid var(--kxd-border-white)" }}
      >
        <div className="kxd-container">
          {/* Heading */}
          <div style={{ maxWidth: "52rem" }}>
            <p className="kxd-eyebrow">Philosophy</p>
            <h2
              className="mt-5 font-serif font-light"
              style={{
                fontSize: "clamp(1.625rem, 3vw, 2.25rem)",
                lineHeight: 1.2,
                color: "var(--kxd-cream)",
              }}
            >
              KXD does not build software products for mass distribution.
              <br />
              <span
                className="font-serif italic"
                style={{ color: "var(--kxd-cream-soft)" }}
              >
                We build operational systems tailored to the businesses we
                partner with.
              </span>
            </h2>

            <p className="kxd-body mt-6" style={{ maxWidth: "40rem", lineHeight: 1.8 }}>
              That distinction matters. It means every system we design starts
              with a specific organization&rsquo;s actual workflows, constraints,
              and brand — not a template. The result is infrastructure that feels
              native to the business, not bolted on.
            </p>
          </div>

          {/* Pillars */}
          <div
            className="mt-16 grid gap-px sm:grid-cols-2 lg:grid-cols-4"
            style={{
              border: "1px solid var(--kxd-border-white)",
              background: "var(--kxd-border-white)",
            }}
          >
            {PHILOSOPHY_PILLARS.map((pillar, i) => (
              <div
                key={pillar.title}
                className="space-y-4 p-8"
                style={{ background: "var(--kxd-black-elevated)" }}
              >
                <p
                  aria-hidden
                  className="font-serif font-light"
                  style={{
                    fontSize: "2.5rem",
                    lineHeight: 1,
                    color: "var(--kxd-gold)",
                    opacity: 0.18,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3
                  className="font-serif font-light"
                  style={{
                    fontSize: "clamp(1rem, 1.4vw, 1.125rem)",
                    color: "var(--kxd-cream)",
                    lineHeight: 1.3,
                  }}
                >
                  {pillar.title}
                </h3>
                <p
                  className="font-sans font-light leading-relaxed"
                  style={{
                    fontSize: "clamp(0.8125rem, 1.05vw, 0.9375rem)",
                    color: "var(--kxd-cream-muted)",
                  }}
                >
                  {pillar.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform Categories ──────────────────────────────────────────────── */}
      <section
        className="kxd-section"
        style={{ background: "var(--kxd-black-pure)", borderBottom: "1px solid var(--kxd-border-white)" }}
      >
        <div className="kxd-container">
          <p className="kxd-eyebrow">Platform Categories</p>
          <h2
            className="mt-5 font-serif font-light"
            style={{
              fontSize: "clamp(1.5rem, 2.75vw, 2rem)",
              color: "var(--kxd-cream)",
              maxWidth: "32rem",
              lineHeight: 1.2,
            }}
          >
            Four domains. One standard.
          </h2>
          <p className="kxd-body mt-4" style={{ maxWidth: "36rem" }}>
            Each engagement is bespoke — but our work clusters around four
            operational categories where we&rsquo;ve developed deep expertise.
          </p>

          <div className="mt-14 grid gap-px sm:grid-cols-2"
            style={{
              border: "1px solid var(--kxd-border-white)",
              background: "var(--kxd-border-white)",
            }}
          >
            {PLATFORM_CATEGORIES.map((cat) => (
              <div
                key={cat.letter}
                className="group relative p-8 lg:p-10"
                style={{ background: "var(--kxd-black-elevated)" }}
              >
                {/* Large letter */}
                <p
                  aria-hidden
                  className="font-serif font-light leading-none"
                  style={{
                    fontSize: "clamp(4rem, 7vw, 6rem)",
                    color: "var(--kxd-gold)",
                    opacity: 0.09,
                    position: "absolute",
                    top: "1.5rem",
                    right: "2rem",
                    userSelect: "none",
                    lineHeight: 1,
                  }}
                >
                  {cat.letter}
                </p>

                <div className="relative">
                  <h3
                    className="font-serif font-light"
                    style={{
                      fontSize: "clamp(1.25rem, 2vw, 1.5rem)",
                      color: "var(--kxd-cream)",
                      lineHeight: 1.2,
                    }}
                  >
                    {cat.name}
                  </h3>
                  <p
                    className="mt-3 font-serif font-light italic"
                    style={{
                      fontSize: "clamp(0.8125rem, 1.05vw, 0.9375rem)",
                      color: "var(--kxd-cream-muted)",
                    }}
                  >
                    {cat.descriptor}
                  </p>

                  {/* Divider */}
                  <div
                    aria-hidden
                    className="my-6"
                    style={{
                      height: "1px",
                      background:
                        "linear-gradient(to right, var(--kxd-border-gold), transparent)",
                      maxWidth: "8rem",
                    }}
                  />

                  <ul className="space-y-2.5">
                    {cat.capabilities.map((cap) => {
                      const [label, detail] = cap.split(" — ");
                      return (
                        <li key={cap} className="flex items-start gap-3">
                          <span
                            aria-hidden
                            style={{
                              color: "var(--kxd-gold)",
                              opacity: 0.55,
                              fontSize: "0.5rem",
                              lineHeight: "1.7rem",
                              flexShrink: 0,
                            }}
                          >
                            —
                          </span>
                          <p
                            className="font-sans font-light"
                            style={{
                              fontSize: "clamp(0.8125rem, 1.05vw, 0.9375rem)",
                              color: "var(--kxd-cream-muted)",
                              lineHeight: 1.65,
                            }}
                          >
                            <span style={{ color: "var(--kxd-cream)", fontWeight: 400 }}>
                              {label}
                            </span>
                            {detail && (
                              <span style={{ opacity: 0.65 }}> — {detail}</span>
                            )}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Work ──────────────────────────────────────────────────────── */}
      <section
        className="kxd-section"
        style={{ background: "var(--kxd-black-base)", borderBottom: "1px solid var(--kxd-border-white)" }}
      >
        <div className="kxd-container">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="kxd-eyebrow">Featured Work</p>
              <h2
                className="mt-4 font-serif font-light"
                style={{
                  fontSize: "clamp(1.5rem, 2.75vw, 2rem)",
                  color: "var(--kxd-cream)",
                  maxWidth: "28rem",
                  lineHeight: 1.2,
                }}
              >
                Platforms already in the world.
              </h2>
            </div>
            <Link
              href="/work"
              className="hidden shrink-0 font-sans font-medium uppercase transition-colors hover:text-[var(--kxd-cream)] sm:block"
              style={{
                fontSize: "0.6875rem",
                letterSpacing: "var(--tracking-button)",
                color: "var(--kxd-cream-muted)",
              }}
            >
              All Case Studies →
            </Link>
          </div>

          <div className="mt-12 grid gap-px sm:grid-cols-2"
            style={{
              border: "1px solid var(--kxd-border-white)",
              background: "var(--kxd-border-white)",
            }}
          >
            {FEATURED_WORK.map((project) => (
              <Link
                key={project.slug}
                href={`/work/${project.slug}`}
                className="group block p-8 transition-colors lg:p-10"
                style={{
                  background: "var(--kxd-black-elevated)",
                  textDecoration: "none",
                }}
              >
                {/* Category chip */}
                <p
                  className="kxd-label inline-block"
                  style={{
                    color: "var(--kxd-gold)",
                    border: "1px solid var(--kxd-border-gold)",
                    padding: "0.2rem 0.75rem",
                    letterSpacing: "0.10em",
                  }}
                >
                  {project.category}
                </p>

                <h3
                  className="mt-5 font-serif font-light transition-colors"
                  style={{
                    fontSize: "clamp(1.25rem, 2vw, 1.625rem)",
                    color: "var(--kxd-cream)",
                    lineHeight: 1.15,
                  }}
                >
                  {project.title}
                </h3>

                <p
                  className="mt-4 font-sans font-light leading-relaxed"
                  style={{
                    fontSize: "clamp(0.875rem, 1.1vw, 0.9375rem)",
                    color: "var(--kxd-cream-muted)",
                    maxWidth: "30rem",
                  }}
                >
                  {project.description}
                </p>

                <p
                  className="mt-5 font-serif italic"
                  style={{
                    fontSize: "0.9375rem",
                    color: "var(--kxd-cream-soft)",
                    borderLeft: "1px solid var(--kxd-border-gold)",
                    paddingLeft: "0.875rem",
                    lineHeight: 1.6,
                  }}
                >
                  {project.outcome}
                </p>

                <p
                  className="mt-7 inline-flex items-center gap-2 font-sans font-medium uppercase transition-colors"
                  style={{
                    fontSize: "0.625rem",
                    letterSpacing: "var(--tracking-button)",
                    color: "var(--kxd-gold)",
                  }}
                >
                  View case study
                  <span
                    aria-hidden
                    className="inline-block transition-transform duration-300 group-hover:translate-x-1"
                  >
                    →
                  </span>
                </p>
              </Link>
            ))}
          </div>

          <div className="mt-8 sm:hidden">
            <Link
              href="/work"
              className="font-sans font-medium uppercase"
              style={{
                fontSize: "0.6875rem",
                letterSpacing: "var(--tracking-button)",
                color: "var(--kxd-cream-muted)",
              }}
            >
              All Case Studies →
            </Link>
          </div>
        </div>
      </section>

      {/* ── How We Build Platforms ────────────────────────────────────────────── */}
      <section
        className="kxd-section"
        style={{ background: "var(--kxd-black-pure)", borderBottom: "1px solid var(--kxd-border-white)" }}
      >
        <div className="kxd-container">
          <p className="kxd-eyebrow">Process</p>
          <h2
            className="mt-5 font-serif font-light"
            style={{
              fontSize: "clamp(1.5rem, 2.75vw, 2rem)",
              color: "var(--kxd-cream)",
              maxWidth: "28rem",
              lineHeight: 1.2,
            }}
          >
            How we build platforms.
          </h2>

          <div className="mt-14">
            {PROCESS_STEPS.map((step, i) => (
              <div
                key={step.number}
                className="relative grid gap-6 py-8 sm:grid-cols-[5rem_1fr] sm:gap-10"
                style={{
                  borderBottom:
                    i < PROCESS_STEPS.length - 1
                      ? "1px solid var(--kxd-border-white)"
                      : "none",
                }}
              >
                {/* Step number + connector */}
                <div className="flex items-start gap-4 sm:flex-col sm:gap-3 sm:items-center">
                  <p
                    className="font-serif font-light leading-none"
                    style={{
                      fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
                      color: "var(--kxd-gold)",
                      opacity: 0.22,
                      flexShrink: 0,
                    }}
                  >
                    {step.number}
                  </p>

                  {/* Vertical connector on desktop */}
                  {i < PROCESS_STEPS.length - 1 && (
                    <div
                      aria-hidden
                      className="hidden sm:block"
                      style={{
                        width: "1px",
                        flexGrow: 1,
                        minHeight: "2rem",
                        background:
                          "linear-gradient(to bottom, var(--kxd-border-gold), transparent)",
                        opacity: 0.35,
                        margin: "0 auto",
                      }}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="pb-2">
                  <h3
                    className="font-serif font-light"
                    style={{
                      fontSize: "clamp(1.0625rem, 1.5vw, 1.25rem)",
                      color: "var(--kxd-cream)",
                      lineHeight: 1.3,
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="mt-3 font-sans font-light leading-relaxed"
                    style={{
                      fontSize: "clamp(0.875rem, 1.1vw, 0.9375rem)",
                      color: "var(--kxd-cream-muted)",
                      maxWidth: "42rem",
                    }}
                  >
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────────── */}
      <FinalCtaBand
        headline="Build What Others Can't."
        subCopy="For organizations ready to align operations with experience."
        primaryLabel="Start a Partnership"
        primaryHref="/start-project"
        secondaryHref="/work"
        secondaryLabel="Explore Our Work"
      />
    </>
  );
}
