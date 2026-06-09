import Link from "next/link";
import { SITE } from "@/lib/site";

export function HeroSection() {
  return (
    <section className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[var(--kxd-black-pure)]">

      {/* ── Architectural light — three shaft sources from above ── */}
      <div
        aria-hidden
        className="kxd-atmosphere-enter kxd-atmosphere-breathe pointer-events-none absolute inset-0"
        style={{
          background: [
            /* Primary shaft — centered, tall */
            "radial-gradient(ellipse 28% 65% at 50% -2%, rgba(194,160,80,0.065) 0%, transparent 58%)",
            /* Left secondary shaft */
            "radial-gradient(ellipse 14% 52% at 36% -5%, rgba(194,160,80,0.028) 0%, transparent 52%)",
            /* Right secondary shaft */
            "radial-gradient(ellipse 14% 52% at 64% -5%, rgba(194,160,80,0.024) 0%, transparent 52%)",
            /* Subtle floor warmth */
            "radial-gradient(ellipse 60% 30% at 50% 105%, rgba(194,160,80,0.018) 0%, transparent 60%)",
          ].join(", "),
        }}
      />

      {/* ── Corner vignette — cinematic depth ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 kxd-vignette" />

      {/* ── Bottom edge fade ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-52 kxd-hero-bottom-fade"
      />

      {/* ═══════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════ */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 pb-32 pt-32 text-center">

        {/* ── Brand label ── */}
        <p
          className="kxd-reveal mb-10 font-sans font-medium uppercase"
          style={{
            fontSize: "0.5625rem",
            letterSpacing: "0.22em",
            color: "var(--kxd-gold)",
            opacity: 0.65,
          }}
        >
          {SITE.name}
        </p>

        {/* ── Headline ── */}
        <h1 className="kxd-display select-none">
          <span
            className="kxd-display-hero kxd-reveal kxd-reveal-delay-1 block"
            style={{ color: "var(--kxd-gold)" }}
          >
            Digital
          </span>

          {/* Hairline separator */}
          <span
            aria-hidden
            className="kxd-reveal kxd-reveal-delay-1 mx-auto block"
            style={{
              width: "3rem",
              height: "1px",
              marginBlock: "0.4em",
              background: "linear-gradient(90deg, transparent, rgba(194,160,80,0.40), transparent)",
            }}
          />

          <span
            className="kxd-display-hero kxd-reveal kxd-reveal-delay-2 block"
            style={{ color: "var(--kxd-cream)" }}
          >
            Luxury
          </span>
        </h1>

        {/* ── Subheadline ── */}
        <p
          className="kxd-reveal kxd-reveal-delay-3 mt-10 font-serif font-light italic"
          style={{
            fontSize: "clamp(1.0625rem, 2vw, 1.25rem)",
            letterSpacing: "0.025em",
            lineHeight: 1.5,
            color: "var(--kxd-cream-soft)",
          }}
        >
          Precision.&ensp;Clarity.&ensp;Presence.
        </p>

        {/* ── Proof line ── */}
        <p
          className="kxd-reveal kxd-reveal-delay-3 mt-5 font-sans font-medium uppercase"
          style={{
            fontSize: "0.5625rem",
            letterSpacing: "0.17em",
            color: "var(--foreground-subtle)",
          }}
        >
          Luxury websites&ensp;&middot;&ensp;Growth systems&ensp;&middot;&ensp;Operational platforms
        </p>

        {/* ── CTAs ── */}
        <div className="kxd-reveal kxd-reveal-delay-4 mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          <Link href="/contact" className="kxd-btn-primary">
            Start a Project
          </Link>

          {/* Text-only secondary */}
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
              View the Work
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

      {/* ═══════════════════════════════
          BOTTOM STATUS BAR
          ═══════════════════════════════ */}
      <div
        className="kxd-reveal kxd-reveal-delay-5 relative"
        style={{ borderTop: "1px solid var(--kxd-border-gold)" }}
      >
        <div className="kxd-container grid grid-cols-2 py-5 sm:grid-cols-4">
          {/* Founded */}
          <div>
            <p className="kxd-label">Est.&ensp;{SITE.foundedYear}</p>
            <p
              className="mt-1.5 font-sans font-medium uppercase"
              style={{
                fontSize: "0.5rem",
                letterSpacing: "0.1em",
                color: "var(--foreground-subtle)",
              }}
            >
              Selective Partnerships
            </p>
          </div>

          {/* Scroll indicator */}
          <div className="hidden flex-col items-center gap-2 sm:flex">
            <p className="kxd-label">Scroll</p>
            <div
              aria-hidden
              className="w-px"
              style={{
                height: "1.75rem",
                background: "linear-gradient(to bottom, var(--kxd-gold), transparent)",
                opacity: 0.40,
              }}
            />
          </div>

          {/* Spacer */}
          <div className="hidden sm:block" />

          {/* Digital Excellence */}
          <div className="text-right">
            <p className="kxd-label">Digital</p>
            <p className="kxd-label mt-1">Excellence</p>
          </div>
        </div>
      </div>
    </section>
  );
}
