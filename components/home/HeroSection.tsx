import Link from "next/link";
import { HeroWorkReel } from "./HeroWorkReel";
import { HeroCursorGlowLazy } from "./HeroCursorGlowLazy";

const PROOF_POINTS = [
  "Websites that convert attention into demand.",
  "Systems that remove operational friction.",
  "Built for brands ready to grow intentionally.",
];

/*
 * Grain texture — luxury film grain, embedded inline SVG.
 * baseFrequency 0.75 / numOctaves 5: finer, more natural film depth.
 * Rendered at 2.8% opacity — felt not seen.
 */
const GRAIN_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)'/%3E%3C/svg%3E")`;

function HeroProofBar() {
  return (
    <div
      className="kxd-reveal kxd-reveal-delay-5 relative z-[1]"
      style={{ borderTop: "1px solid var(--kxd-border-white)" }}
    >
      <div className="kxd-container py-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PROOF_POINTS.map((point, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div
                aria-hidden
                className="mt-[0.35rem] shrink-0 rounded-full"
                style={{
                  width: "3px",
                  height: "3px",
                  background: "var(--kxd-gold)",
                  opacity: 0.60,
                }}
              />
              <p
                className="font-sans font-light"
                style={{
                  fontSize: "0.625rem",
                  letterSpacing: "0.035em",
                  lineHeight: 1.7,
                  color: "rgba(191,183,170,0.50)",
                }}
              >
                {point}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section
      className="kxd-hero-section flex flex-col md:min-h-[100dvh]"
      style={{ background: "var(--kxd-black-pure)" }}
    >
      {/*
       * Viewport: full screen on mobile (reel + proof sit below fold).
       * On desktop, flex-1 so reel + proof anchor at the bottom of 100dvh.
       */}
      <div
        className="kxd-hero-viewport relative flex flex-col overflow-hidden max-md:min-h-[100svh] md:min-h-0 md:flex-1"
      >
        <HeroCursorGlowLazy />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: 0.028,
            backgroundImage: GRAIN_SVG,
            backgroundSize: "200px 200px",
            backgroundRepeat: "repeat",
          }}
        />

        <div
          aria-hidden
          className="kxd-atmosphere-breathe pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 65% 48% at 26% 38%, rgba(197,166,92,0.048), transparent 74%)",
          }}
        />

        <div aria-hidden className="kxd-vignette pointer-events-none absolute inset-0" />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] kxd-hero-reel-fade max-md:bottom-0 max-md:h-24"
        />

        <div
          className="relative z-10 flex flex-col md:flex-1"
          style={{ paddingTop: "clamp(7rem, 12vh, 10rem)" }}
        >
          <div
            className="kxd-container"
            style={{ paddingBottom: "clamp(4rem, 6vw, 5rem)" }}
          >
            <h1
              className="kxd-reveal kxd-hero-headline-reveal kxd-hero-lcp select-none font-serif font-light"
              style={{
                fontSize: "clamp(3.5rem, 5.5vw, 5.5rem)",
                lineHeight: 1.12,
                letterSpacing: "0.01em",
                color: "var(--kxd-cream)",
              }}
            >
              <span className="block">Designed to Be Remembered.</span>
              <span className="block">Built to Perform.</span>
            </h1>

            <p
              className="kxd-reveal kxd-reveal-delay-2 font-sans font-light"
              style={{
                fontSize: "clamp(0.9375rem, 1.15vw, 1.0625rem)",
                letterSpacing: "0.003em",
                lineHeight: 1.85,
                color: "var(--kxd-cream-muted)",
                maxWidth: "min(88vw, 480px)",
                marginTop: "clamp(3.5rem, 5.5vw, 5rem)",
              }}
            >
              Thoughtfully crafted digital experiences for businesses building what&rsquo;s next.
            </p>

            <div
              className="kxd-reveal kxd-reveal-delay-3 flex flex-wrap items-center gap-x-10 gap-y-5"
              style={{ marginTop: "clamp(3rem, 5vw, 4.5rem)" }}
            >
              <Link href="/start-project" className="kxd-btn-primary">
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
                <span
                  className="kxd-cta-work-text transition-colors duration-200 group-hover:text-[var(--kxd-cream)]"
                >
                  View Selected Work
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
      </div>

      <HeroWorkReel />
      <HeroProofBar />
    </section>
  );
}
