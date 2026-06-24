import Link from "next/link";
import Image from "next/image";
import { HeroCursorGlow } from "./HeroCursorGlow";
import { WORK_REEL_FRAMES } from "@/lib/homepage/work-reel";

const REEL_DOUBLED = [...WORK_REEL_FRAMES, ...WORK_REEL_FRAMES];

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

export function HeroSection() {
  return (
    <section
      className="relative flex min-h-[100dvh] flex-col overflow-hidden"
      style={{ background: "var(--kxd-black-pure)" }}
    >
      {/* ── Video layer — slot for future brand footage ──
          Uncomment when /assets/kxd-reel.mp4 is available:

          <video
            autoPlay muted loop playsInline
            poster="/assets/kxd-reel-poster.webp"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            aria-hidden
          >
            <source src="/assets/kxd-reel.mp4" type="video/mp4" />
          </video>
      */}

      {/*
       * Cursor ambient glow — desktop only (hidden via CSS on touch / <1024px).
       * Soft KXD gold warmth follows the cursor with ~700ms lag.
       * Placed first so all content layers render above it.
       */}
      <HeroCursorGlow />

      {/*
       * Grain — luxury film texture, 2.8% opacity.
       * feTurbulence fractalNoise: photographic, not digital.
       * The mark of premium print applied to screen. Felt, not seen.
       */}
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

      {/* Ambient warmth — positioned at headline origin, breathes at 16s cycle */}
      <div
        aria-hidden
        className="kxd-atmosphere-breathe pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 48% at 26% 38%, rgba(197,166,92,0.048), transparent 74%)",
        }}
      />

      {/* Vignette — edge darkening only, adds perceived depth */}
      <div aria-hidden className="kxd-vignette pointer-events-none absolute inset-0" />

      {/* Bottom fade into reel strip */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 z-[2] kxd-hero-reel-fade"
      />

      {/*
       * ── Main content ──
       *
       * Layout intent: content anchored from the top, sits at ~38–42% vertical
       * position (slightly above centre). The void below the CTAs is intentional —
       * expensive design breathes. The reel strip at the bottom keeps the eye moving.
       */}
      <div
        className="relative z-10 flex flex-1 flex-col"
        style={{ paddingTop: "clamp(7rem, 12vh, 10rem)" }}
      >
        <div
          className="kxd-container"
          style={{ paddingBottom: "clamp(4rem, 6vw, 5rem)" }}
        >

          {/*
           * Headline — editorial serif, two lines, intentional measure.
           *
           * "Designed to Be Remembered. Built to Perform."
           *
           * Line 1 fills ~84% of container at 1440px (Pentagram asymmetry).
           * Line 2 fills ~53% — the breathing room to the right is the design.
           * Size is deliberately moderate (5.5vw) — luxury is restraint, not scale.
           *
           * Animation: kxd-hero-headline-reveal overrides the generic reveal timing
           * with easeOutCubic (1.05s) — same keyframe, gentler curve. Single unit.
           */}
          <h1
            className="kxd-reveal kxd-hero-headline-reveal select-none font-serif font-light"
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

          {/*
           * Subheadline — explicit product clarity in one sentence.
           * Sans-serif at small scale creates contrast against the display serif.
           */}
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

          {/* CTAs — generous gap above. Two options, equal visual weight. */}
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
              {/*
               * kxd-cta-work-text: CSS ::after draws a gold line that extends
               * width 0→100% on .group:hover. Understated luxury interaction.
               */}
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

        {/* Vertical space absorber — void between CTAs and reel strip, minimum enforced */}
        <div className="flex-1" style={{ minHeight: "clamp(4rem, 6vh, 5rem)" }} />
      </div>

      {/* ── Reel strip — curated proof reel, calm horizontal drift ── */}
      <div aria-hidden className="kxd-work-reel kxd-reveal kxd-reveal-delay-5 relative z-[1]">
        <div className="kxd-work-reel__fade kxd-work-reel__fade--left" />
        <div className="kxd-work-reel__fade kxd-work-reel__fade--right" />

        <div className="kxd-reel-track kxd-work-reel__track">
          {REEL_DOUBLED.map((frame, i) => (
            <div key={`${frame.src}-${i}`} className="kxd-work-reel__frame">
              <Image
                src={frame.src}
                alt={frame.alt}
                fill
                className="object-cover"
                style={{ objectPosition: frame.objectPosition ?? "top center" }}
                sizes="(max-width: 640px) 240px, 380px"
                priority={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Proof bar — three positioning statements, not industry labels ── */}
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
    </section>
  );
}
