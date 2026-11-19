import Link from "next/link";
import { FOUNDER_STANDARD_VISUAL } from "@/lib/homepage/work-visuals";
import { EditorialWorkFrame } from "./EditorialWorkFrame";

export function FounderStandard() {
  return (
    <section
      className="kxd-section border-t"
      style={{
        background: "var(--kxd-black-deep)",
        borderColor: "var(--kxd-border-gold)",
      }}
    >
      <div className="kxd-container">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.6fr] lg:gap-20 lg:items-center">
          <div>
            <p className="kxd-eyebrow">The Standard</p>

            <h2
              className="kxd-serif-title mt-5"
              style={{
                fontSize: "clamp(2rem, 4vw, 3rem)",
                lineHeight: 1.06,
              }}
            >
              Founder-led.
              <br />
              <span style={{ color: "var(--kxd-gold)" }}>
                Built to last.
              </span>
            </h2>

            <div
              aria-hidden
              className="mt-9 h-px"
              style={{
                width: "4rem",
                background: "var(--kxd-border-gold-strong)",
              }}
            />

            <div className="mt-10">
              <EditorialWorkFrame
                src={FOUNDER_STANDARD_VISUAL.src}
                alt={FOUNDER_STANDARD_VISUAL.alt}
                href={FOUNDER_STANDARD_VISUAL.href}
                label={FOUNDER_STANDARD_VISUAL.label}
                objectPosition={FOUNDER_STANDARD_VISUAL.objectPosition}
                aspectClass="aspect-[16/10]"
                sizes="(max-width: 1024px) 100vw, 38vw"
                reveal
              />
            </div>

            <Link
              href="/about"
              className="kxd-ui-label mt-8 inline-flex items-center gap-2.5 text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
            >
              About KXD
              <span aria-hidden>→</span>
            </Link>
          </div>

          <div
            className="border-l pl-10 lg:pl-14"
            style={{ borderColor: "var(--kxd-border-white)" }}
          >
            <p
              className="font-serif font-light leading-[1.72]"
              style={{
                fontSize: "clamp(1.125rem, 1.8vw, 1.25rem)",
                letterSpacing: "0.005em",
                color: "var(--kxd-cream-soft)",
              }}
            >
              KXD is a founder-led studio. Strategy, design, and development stay
              in one room, with direct oversight from first conversation through
              launch. We work selectively so every engagement gets attention and
              decisions stay quick.
            </p>

            <div
              className="mt-10 grid gap-6 border-t pt-10 sm:grid-cols-3"
              style={{ borderColor: "var(--kxd-border-white)" }}
            >
              {[
                { number: "Founder-led", label: "On every engagement" },
                { number: "Selective", label: "A limited client load" },
                { number: "Full stack", label: "Design through delivery" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p
                    className="font-serif font-light"
                    style={{
                      fontSize: "1.875rem",
                      lineHeight: 1,
                      color: "var(--kxd-gold)",
                    }}
                  >
                    {stat.number}
                  </p>
                  <p className="kxd-label mt-2.5">{stat.label}</p>
                </div>
              ))}
            </div>

            <div
              className="mt-10 border-l pl-5"
              style={{ borderColor: "var(--kxd-border-gold)" }}
            >
              <p
                className="font-serif font-light italic"
                style={{
                  fontSize: "clamp(0.9375rem, 1.3vw, 1.0625rem)",
                  lineHeight: 1.75,
                  color: "var(--kxd-cream-muted)",
                }}
              >
                The standard is simple: do work that still makes sense a year from
                now.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
