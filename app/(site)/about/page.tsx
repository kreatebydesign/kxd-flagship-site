import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FinalCtaBand } from "@/components/ui/FinalCtaBand";
import { SITE } from "@/lib/site";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "About",
  description: `${SITE.name} is a founder-led luxury digital studio — websites, growth systems, and operational platforms built with discipline.`,
  path: "/about",
  keywords: ["Premium Web Design Agency", "Luxury Website Design", "Founder-Led Digital Studio"],
});

const BELIEFS = [
  "Simplicity carries weight.",
  "Strategy comes before aesthetics.",
  "Brands should feel human.",
  "Experiences should outlast trends.",
] as const;

const PROCESS = [
  {
    number: "01",
    title: "Founder-led partnership",
    body: "Every engagement is led directly by the founder. No junior hand-offs. No diluted vision.",
  },
  {
    number: "02",
    title: "Selective engagements",
    body: "KXD takes on a limited number of projects at a time. Your work receives full attention.",
  },
  {
    number: "03",
    title: "Direct collaboration",
    body: "Short feedback loops, clear decisions, and honest communication at every stage.",
  },
  {
    number: "04",
    title: "Precision execution",
    body: "From first concept through launch and beyond — every detail is considered.",
  },
] as const;

export default function AboutPage() {
  return (
    <>
      <section
        style={{
          paddingTop: "calc(var(--nav-height) + var(--section-py))",
          paddingBottom: "var(--section-py)",
          background: "var(--kxd-black-pure)",
          borderBottom: "1px solid var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container">
          <p className="kxd-eyebrow">About KXD</p>
          <h1
            className="kxd-serif-title mt-5"
            style={{
              fontSize: "clamp(2.5rem, 5.5vw, 3.75rem)",
              maxWidth: "38rem",
              lineHeight: 1.06,
            }}
          >
            Built With Intention.
            <br />
            Led With Discipline.
          </h1>
          <p className="kxd-body mt-8" style={{ maxWidth: "34rem" }}>
            KXD was built on one belief: energy is the foundation of design. Every brand
            holds a frequency — a presence that can be felt before it&rsquo;s seen. We
            refine that frequency into clarity, precision, and timeless identity. This is
            where creativity meets intention, and brands evolve into experiences.
          </p>
        </div>
      </section>

      <section
        className="kxd-section"
        style={{
          background: "var(--kxd-black-base)",
          borderBottom: "1px solid var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container grid gap-12 lg:grid-cols-2 lg:gap-20 lg:items-center">
          <div>
            <p className="kxd-eyebrow">Philosophy</p>
            <h2
              className="kxd-serif-title mt-5"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.08 }}
            >
              Design with intention.
              <br />
              <span style={{ color: "var(--kxd-gold)" }}>Build with discipline.</span>
            </h2>
          </div>
          <div
            className="border-l pl-10 lg:pl-14"
            style={{ borderColor: "var(--kxd-border-white)" }}
          >
            <p className="kxd-body">
              Luxury is not decoration. It is the result of removing everything that does not
              serve the work. Every decision carries intention. Every execution carries weight.
            </p>
            <p className="kxd-body mt-5">
              KXD was built for brands that understand this — companies and creators who are
              done settling for good enough and ready to build something that lasts.
            </p>
          </div>
        </div>
      </section>

      <section
        className="kxd-section"
        style={{
          background: "var(--kxd-black-deep)",
          borderBottom: "1px solid var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container">
          <div
            className="grid items-center gap-16 lg:grid-cols-[minmax(0,540px)_1fr]"
            style={{ gap: "clamp(4rem, 8vw, 8rem)" }}
          >
            <div className="mx-auto w-full" style={{ maxWidth: "540px" }}>
              <div
                className="relative p-6"
                style={{ border: "1px solid rgba(197,166,92,0.08)" }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 40%, rgba(197,166,92,0.05), transparent 65%)",
                  }}
                />

                <div
                  className="relative overflow-hidden"
                  style={{
                    aspectRatio: "4 / 5",
                    background: "#050505",
                    border: "1px solid rgba(197,166,92,0.22)",
                  }}
                >
                  <Image
                    src="/migrated-assets/founder/matt-lunger.jpg"
                    alt="Matt Lunger — Founder, Kreate by Design"
                    fill
                    className="object-cover object-top"
                    style={{
                      filter: "contrast(1.03) saturate(0.95) brightness(0.98)",
                    }}
                    sizes="(max-width: 1024px) 90vw, 540px"
                    priority
                  />

                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.35), transparent 45%)",
                    }}
                  />

                  <div className="absolute bottom-5 left-6 right-6">
                    <p
                      className="font-serif font-light"
                      style={{
                        fontSize: "clamp(1.5rem, 3vw, 2rem)",
                        lineHeight: 1.1,
                        letterSpacing: "0.01em",
                        color: "var(--kxd-cream)",
                      }}
                    >
                      Matt Lunger
                    </p>
                    <p
                      className="mt-1.5 font-sans font-medium uppercase"
                      style={{
                        fontSize: "0.72rem",
                        letterSpacing: "0.28em",
                        color: "var(--kxd-gold)",
                        opacity: 0.72,
                      }}
                    >
                      Founder &amp; Creative Director
                    </p>
                    <p
                      className="mt-1 font-sans font-medium uppercase"
                      style={{
                        fontSize: "0.60rem",
                        letterSpacing: "0.18em",
                        color: "var(--foreground-subtle)",
                      }}
                    >
                      Kreate by Design
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ maxWidth: "620px" }}>
              <p className="kxd-eyebrow">A Note From the Founder</p>

              <div
                className="mt-8 font-sans font-light"
                style={{
                  fontSize: "clamp(1rem, 1.35vw, 1.125rem)",
                  lineHeight: 1.95,
                  color: "var(--kxd-cream-muted)",
                }}
              >
                <p style={{ marginBottom: "1.75rem" }}>
                  I started KXD with a simple truth: the world doesn&rsquo;t need more brands,
                  it needs better ones. Ones that lead with meaning, not noise. Ones that feel
                  human, yet designed with precision.
                </p>
                <p style={{ marginBottom: "1.75rem" }}>
                  KXD was never about decoration. It&rsquo;s about direction — helping creators
                  and companies find the version of themselves that belongs to the future.
                </p>
                <p>
                  That&rsquo;s what drives us: to build brands, systems, and experiences designed
                  to endure — creating clarity, momentum, and long-term value for the businesses
                  we partner with.
                </p>
              </div>

              <div
                className="mt-10 border-t pt-8"
                style={{ borderColor: "var(--kxd-border-white)" }}
              >
                <div
                  aria-hidden
                  className="mb-6"
                  style={{
                    width: "2.5rem",
                    height: "1px",
                    background:
                      "linear-gradient(to right, var(--kxd-gold), transparent)",
                    opacity: 0.45,
                  }}
                />
                <p
                  className="font-serif font-light"
                  style={{
                    fontSize: "clamp(2rem, 3vw, 2.6rem)",
                    lineHeight: 1.0,
                    letterSpacing: "0.01em",
                    color: "var(--kxd-cream)",
                  }}
                >
                  Matt Lunger
                </p>
                <p
                  className="mt-3 font-sans font-medium uppercase"
                  style={{
                    fontSize: "0.72rem",
                    letterSpacing: "0.28em",
                    color: "var(--foreground-subtle)",
                    opacity: 0.72,
                  }}
                >
                  Founder &amp; Creative Director
                </p>
                <p
                  className="mt-1 font-sans font-medium uppercase"
                  style={{
                    fontSize: "0.60rem",
                    letterSpacing: "0.18em",
                    color: "var(--foreground-subtle)",
                    opacity: 0.55,
                  }}
                >
                  Kreate by Design
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="kxd-section"
        style={{
          background: "var(--kxd-black-base)",
          borderBottom: "1px solid var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container">
          <div className="grid gap-12 lg:grid-cols-[16rem_1fr] lg:gap-20">
            <div>
              <p className="kxd-eyebrow">What We Believe</p>
              <p className="kxd-body-sm mt-4" style={{ maxWidth: "14rem" }}>
                The principles that shape every project, every decision, every result.
              </p>
            </div>

            <div>
              {BELIEFS.map((belief, i) => (
                <div
                  key={belief}
                  className="flex items-start gap-6 py-6"
                  style={{
                    borderBottom:
                      i < BELIEFS.length - 1
                        ? "1px solid var(--kxd-border-white)"
                        : "none",
                  }}
                >
                  <span
                    className="kxd-label shrink-0 pt-0.5"
                    style={{
                      color: "var(--kxd-gold)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    0{i + 1}
                  </span>
                  <p
                    className="font-serif font-light"
                    style={{
                      fontSize: "clamp(1.125rem, 2vw, 1.4375rem)",
                      letterSpacing: "0.01em",
                      lineHeight: 1.3,
                      color: "var(--kxd-cream)",
                    }}
                  >
                    {belief}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        className="kxd-section"
        style={{
          background: "var(--kxd-black-deep)",
          borderBottom: "1px solid var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container">
          <div className="mb-14">
            <p className="kxd-eyebrow">How We Work</p>
            <h2
              className="kxd-serif-title mt-4"
              style={{
                fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
                maxWidth: "30rem",
              }}
            >
              The way we partner is deliberate.
            </h2>
          </div>

          <div className="grid gap-0 sm:grid-cols-2">
            {PROCESS.map((step, i) => (
              <div
                key={step.number}
                className="py-8 pr-8"
                style={{
                  borderTop: "1px solid var(--kxd-border-gold)",
                  ...(i % 2 === 0 && i + 1 < PROCESS.length
                    ? { borderRight: "1px solid var(--kxd-border-white)" }
                    : {}),
                }}
              >
                <p className="kxd-label" style={{ color: "var(--kxd-gold)" }}>
                  {step.number}
                </p>
                <h3 className="kxd-serif-title mt-4" style={{ fontSize: "1.25rem" }}>
                  {step.title}
                </h3>
                <p className="kxd-body-sm mt-3">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="kxd-section"
        style={{
          background: "var(--kxd-black-pure)",
          borderBottom: "1px solid var(--kxd-border-gold)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "52rem" }}>
          <p className="kxd-eyebrow">The Standard</p>

          <p
            className="mt-8 font-serif font-light"
            style={{
              fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
              letterSpacing: "0.01em",
              lineHeight: 1.5,
              color: "var(--kxd-cream-soft)",
            }}
          >
            KXD exists to build brands, platforms, and experiences designed to hold weight
            long after launch.
          </p>

          <div aria-hidden className="kxd-gold-rule mt-10" style={{ maxWidth: "5rem" }} />

          <div className="mt-10">
            <Link href="/start-project" className="kxd-btn-primary">
              Start a Partnership
            </Link>
          </div>
        </div>
      </section>

      <FinalCtaBand
        headline="Build What Others Can't."
        subCopy="KXD partners with ambitious businesses to create exceptional digital experiences, operational systems, and brands built to endure."
        secondaryHref="/work"
        secondaryLabel="Explore Our Work"
        showEmail={false}
      />
    </>
  );
}