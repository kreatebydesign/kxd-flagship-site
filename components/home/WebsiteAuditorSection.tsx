import Link from "next/link";
import { WEBSITE_AUDIT_SIGNALS } from "@/lib/homepage/work-visuals";

export function WebsiteAuditorSection() {
  return (
    <section
      className="kxd-section border-t"
      style={{
        background: "var(--kxd-black-pure)",
        borderColor: "var(--kxd-border-white)",
      }}
    >
      <div className="kxd-container">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-16">
          <div>
            <p className="kxd-eyebrow">KXD Intelligence</p>

            <h2
              className="kxd-serif-title mt-4"
              style={{
                fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
                maxWidth: "28rem",
                lineHeight: 1.08,
              }}
            >
              See what your website is costing you.
            </h2>

            <p
              className="kxd-body-sm mt-5"
              style={{
                maxWidth: "34rem",
                lineHeight: 1.85,
              }}
            >
              KXD Intelligence is our site review tool, the same checklist we use
              before a rebuild conversation. It looks at performance, discoverability,
              mobile experience, conversion paths, and how the brand comes across,
              then returns a prioritized scorecard you can act on.
            </p>

            <p
              className="mt-6 font-serif font-light italic"
              style={{
                fontSize: "clamp(0.9375rem, 1.25vw, 1.0625rem)",
                lineHeight: 1.72,
                color: "var(--kxd-cream-muted)",
                maxWidth: "32rem",
              }}
            >
              Start with diagnosis. Then decide whether a project, a partnership,
              or a focused fix makes sense.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link href="/website-audit" className="kxd-btn-primary">
                Run KXD Intelligence
              </Link>
              <Link
                href="/work"
                className="kxd-ui-label text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
              >
                See how we rebuild →
              </Link>
            </div>
          </div>

          <div className="kxd-audit-signals-panel">
            <p
              className="kxd-audit-signals-panel__eyebrow"
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--kxd-border-white)",
              }}
            >
              <span className="kxd-eyebrow" style={{ opacity: 0.7 }}>
                Intelligence Domains
              </span>
            </p>
            <div className="grid gap-px sm:grid-cols-2">
              {WEBSITE_AUDIT_SIGNALS.map((signal) => (
                <div key={signal.label} className="kxd-audit-signal-cell">
                  <p
                    className="font-sans text-[0.5rem] font-medium uppercase tracking-[0.14em]"
                    style={{ color: "var(--kxd-gold)" }}
                  >
                    {signal.label}
                  </p>
                  <p
                    className="mt-2 font-sans font-light leading-relaxed"
                    style={{
                      fontSize: "0.75rem",
                      color: "rgba(191, 183, 170, 0.62)",
                    }}
                  >
                    {signal.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
