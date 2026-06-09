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
      {/* ── 1. HERO ── */}
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
            style={{ fontSize: "clamp(2.5rem, 5.5vw, 3.75rem)", maxWidth: "38rem", lineHeight: 1.06 }}
          >
            More Than an Agency.
          </h1>
          <p className="kxd-body mt-8" style={{ maxWidth: "34rem" }}>
            KXD was built on one belief: energy is the foundation of design. Every brand
            holds a frequency — a presence that can be felt before it&rsquo;s seen. We
            refine that frequency into clarity, precision, and timeless identity. This is
            where creativity meets intention, and brands evolve into experiences.
          </p>
        </div>
      </section>

      {/* ── 2. PHILOSOPHY ── */}
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

      {/* ── 3. FOUNDER ── */}
      <section
        className="kxd-section"
        style={{
          background: "var(--kxd-black-deep)",
          borderBottom: "1px solid var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container">
          <div className="grid items-start gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            {/* Photo */}
            <div className="kxd-founder-frame mx-auto w-full max-w-sm lg:max-w-none">
              <div className="relative aspect-[3/4] max-h-[34rem]">
                <Image
                  src="/migrated-assets/founder/matt-lunger.jpg"
                  alt="Matt Lunger, Founder of Kreate by Design"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 90vw, 38vw"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, var(--kxd-black-deep) 0%, transparent 45%)",
                  }}
                />
              </div>
            </div>

            {/* Copy */}
            <div className="lg:pt-2">
              <p className="kxd-eyebrow">A Note From the Founder</p>
              <h2
                className="kxd-serif-title mt-5"
                style={{ fontSize: "clamp(1.875rem, 3vw, 2.625rem)" }}
              >
                From the Founder
              </h2>

              <div className="kxd-body mt-8 space-y-5" style={{ maxWidth: "34rem" }}>
                <p>
                  I started KXD with a simple truth: the world doesn&rsquo;t need more brands,
                  it needs better ones. Ones that lead with meaning, not noise. Ones that feel
                  human, yet designed with precision.
                </p>
                <p>
                  KXD was never about decoration. It&rsquo;s about direction — helping creators
                  and companies find the version of themselves that belongs to the future.
                </p>
                <p>
                  That&rsquo;s what drives us: to build brands that live longer, work smarter,
                  and speak without trying too hard.
                </p>
              </div>

              <div
                className="mt-10 border-t pt-8"
                style={{ borderColor: "var(--kxd-border-white)" }}
              >
                <p
                  className="font-serif font-light"
                  style={{ fontSize: "1.5rem", color: "var(--kxd-cream)", letterSpacing: "0.01em" }}
                >
                  Matt Lunger
                </p>
                <p className="kxd-label mt-2">Founder &amp; Creative Director, KXD</p>
                <p className="kxd-body-sm mt-3">{SITE.location}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. WHAT WE BELIEVE ── */}
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
                    borderBottom: i < BELIEFS.length - 1 ? "1px solid var(--kxd-border-white)" : "none",
                  }}
                >
                  <span
                    className="kxd-label shrink-0 pt-0.5"
                    style={{ color: "var(--kxd-gold)", fontVariantNumeric: "tabular-nums" }}
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

      {/* ── 5. HOW WE WORK ── */}
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
              style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", maxWidth: "30rem" }}
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
                <p className="kxd-label" style={{ color: "var(--kxd-gold)" }}>{step.number}</p>
                <h3
                  className="kxd-serif-title mt-4"
                  style={{ fontSize: "1.25rem" }}
                >
                  {step.title}
                </h3>
                <p className="kxd-body-sm mt-3">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. THE STANDARD ── */}
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

          <div
            aria-hidden
            className="kxd-gold-rule mt-10"
            style={{ maxWidth: "5rem" }}
          />

          <div className="mt-10">
            <Link href="/contact" className="kxd-btn-primary">
              Start a Conversation
            </Link>
          </div>
        </div>
      </section>

      <FinalCtaBand showEmail={false} secondaryHref="/work" secondaryLabel="View the Work" />
    </>
  );
}
