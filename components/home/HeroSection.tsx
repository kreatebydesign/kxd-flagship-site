import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/site";

/**
 * KXD Hero — Cinematic Video Framework
 *
 * Video-ready architecture. When brand footage is available:
 *   1. Uncomment the <video> element below
 *   2. Add src="/assets/kxd-reel.mp4" and poster="/assets/kxd-reel-poster.webp"
 *   3. The overlay system will handle any footage color/exposure automatically
 */

const REEL_FRAMES = [
  { src: "/migrated-assets/case-studies/primal-motorsports/hero.webp", alt: "Primal Motorsports" },
  { src: "/migrated-assets/case-studies/primal-motorsports/dashboard-hero.webp", alt: "Primal Motorsports — Driver Portal" },
  { src: "/migrated-assets/case-studies/primal-motorsports/ops-hero.webp", alt: "Primal OS" },
  { src: "/migrated-assets/case-studies/cusick-morgan-motorsports/hero.webp", alt: "Cusick Morgan Motorsports" },
  { src: "/migrated-assets/case-studies/plate-the-umpqua/hero.webp", alt: "Plate the Umpqua" },
  { src: "/migrated-assets/case-studies/autodv8ions/hero.webp", alt: "AutoDV8ions" },
  { src: "/migrated-assets/case-studies/cusick-morgan-motorsports/homepage-02.webp", alt: "Cusick Morgan Motorsports — Partnership" },
  { src: "/migrated-assets/case-studies/plate-the-umpqua/homepage-02.webp", alt: "Plate the Umpqua — Interior" },
];

const REEL_DOUBLED = [...REEL_FRAMES, ...REEL_FRAMES];

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

      <div
        aria-hidden
        className="kxd-atmosphere-breathe pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, rgba(197,166,92,0.08), transparent 60%)",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 20%, rgba(255,255,255,0.025), transparent 70%)",
        }}
      />

      <div
        aria-hidden
        className="kxd-atmosphere-enter pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 18% 80% at 50% -10%, rgba(197,166,92,0.060) 0%, transparent 50%)",
            "radial-gradient(ellipse 9% 58% at 34% -8%, rgba(197,166,92,0.024) 0%, transparent 48%)",
            "radial-gradient(ellipse 9% 58% at 66% -8%, rgba(197,166,92,0.018) 0%, transparent 48%)",
          ].join(", "),
        }}
      />

      <div aria-hidden className="kxd-vignette pointer-events-none absolute inset-0" />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 z-[2]"
        style={{
          bottom: "11.5rem",
          height: "9rem",
          background:
            "linear-gradient(to top, var(--kxd-black-pure) 10%, transparent)",
        }}
      />

      <div
        className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center"
        style={{
          paddingBottom: "8rem",
          paddingTop: "clamp(8rem, 12vh, 10rem)",
        }}
      >
        <div
          className="kxd-reveal mb-10 flex items-center gap-4"
          style={{ opacity: 0.55 }}
        >
          <div
            aria-hidden
            style={{
              width: "40px",
              height: "1px",
              background: "var(--kxd-gold)",
            }}
          />
          <p
            className="font-sans font-medium uppercase"
            style={{
              fontSize: "0.68rem",
              letterSpacing: "0.42em",
              color: "var(--kxd-gold)",
            }}
          >
            {SITE.name}
          </p>
          <div
            aria-hidden
            style={{
              width: "40px",
              height: "1px",
              background: "var(--kxd-gold)",
            }}
          />
        </div>

        <h1
          className="kxd-reveal kxd-reveal-delay-1 font-serif font-light select-none"
          style={{
            fontSize: "clamp(3.5rem, 10.5vw, 9rem)",
            lineHeight: 0.94,
            letterSpacing: "0.015em",
            color: "var(--kxd-cream)",
          }}
        >
          <span
            className="block"
            style={{
              textShadow:
                "0 2px 80px rgba(0,0,0,0.60), 0 0 1px rgba(0,0,0,0.40)",
            }}
          >
            We Build
          </span>
          <span
            className="block"
            style={{
              color: "var(--kxd-gold)",
              textShadow:
                "0 0 120px rgba(197,166,92,0.26), 0 0 48px rgba(197,166,92,0.14), 0 2px 60px rgba(0,0,0,0.55)",
            }}
          >
            What Others
          </span>
          <span
            className="block"
            style={{
              textShadow:
                "0 2px 80px rgba(0,0,0,0.60), 0 0 1px rgba(0,0,0,0.40)",
            }}
          >
            Can&rsquo;t.
          </span>
        </h1>

        <div
          aria-hidden
          className="kxd-reveal kxd-reveal-delay-2 mx-auto"
          style={{
            width: "4.5rem",
            height: "1px",
            marginBlock: "clamp(1.75rem, 3vw, 2.75rem)",
            background:
              "linear-gradient(90deg, transparent, rgba(197,166,92,0.48) 30%, rgba(197,166,92,0.48) 70%, transparent)",
          }}
        />

        <p
          className="kxd-reveal kxd-reveal-delay-2 font-serif font-light italic sm:whitespace-nowrap"
          style={{
            fontSize: "clamp(0.875rem, 1.55vw, 1.125rem)",
            letterSpacing: "0.02em",
            lineHeight: 1.6,
            color: "var(--kxd-cream-soft)",
            maxWidth: "min(90vw, 800px)",
          }}
        >
          Digital experiences, operational systems, and growth infrastructure built with intention.
        </p>

        <p
          className="kxd-reveal kxd-reveal-delay-3 mt-6 font-sans font-medium uppercase"
          style={{
            fontSize: "0.5625rem",
            letterSpacing: "0.20em",
            color: "var(--foreground-subtle)",
          }}
        >
          Strategy&ensp;&middot;&ensp;Systems&ensp;&middot;&ensp;Growth
        </p>

        <div className="kxd-reveal kxd-reveal-delay-4 mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
          <Link href="/start-project" className="kxd-btn-primary">
            Start a Partnership
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

      <div
        aria-hidden
        className="kxd-reveal kxd-reveal-delay-5 relative z-[1] overflow-hidden"
        style={{
          borderTop: "1px solid var(--kxd-border-gold)",
          borderBottom: "1px solid var(--kxd-border-white)",
          height: "5.75rem",
        }}
      >
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-[2]"
          style={{
            width: "9rem",
            background:
              "linear-gradient(to right, var(--kxd-black-pure) 20%, transparent)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-[2]"
          style={{
            width: "9rem",
            background:
              "linear-gradient(to left, var(--kxd-black-pure) 20%, transparent)",
          }}
        />

        <div className="kxd-reel-track flex h-full items-center gap-3 pl-3">
          {REEL_DOUBLED.map((frame, i) => (
            <div
              key={`${frame.src}-${i}`}
              className="relative h-[4.5rem] shrink-0 overflow-hidden"
              style={{
                aspectRatio: "16 / 9",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <Image
                src={frame.src}
                alt={frame.alt}
                fill
                className="object-cover object-top"
                sizes="120px"
                priority={false}
              />
              <div
                className="absolute inset-0"
                style={{ background: "rgba(0,0,0,0.28)" }}
              />
            </div>
          ))}
        </div>
      </div>

      <div
        className="kxd-reveal kxd-reveal-delay-5 relative z-[1]"
        style={{ borderTop: "1px solid var(--kxd-border-white)" }}
      >
        <div className="kxd-container grid grid-cols-2 py-4 sm:grid-cols-3">
          <div>
            <p className="kxd-label">Est.&ensp;{SITE.foundedYear}</p>
            <p
              className="mt-1.5 font-sans font-medium uppercase"
              style={{
                fontSize: "0.5rem",
                letterSpacing: "0.10em",
                color: "var(--foreground-subtle)",
              }}
            >
              Selective Partnerships
            </p>
          </div>

          <div className="hidden flex-col items-center gap-1.5 sm:flex">
            <p className="kxd-label" style={{ opacity: 0.45 }}>
              Scroll
            </p>
            <div
              className="w-px"
              style={{
                height: "1.75rem",
                background:
                  "linear-gradient(to bottom, var(--kxd-gold), transparent)",
                opacity: 0.28,
              }}
            />
          </div>

          <div className="flex flex-col items-end">
            <p className="kxd-label">Built With</p>
            <p className="kxd-label mt-1">Intention</p>
          </div>
        </div>
      </div>
    </section>
  );
}