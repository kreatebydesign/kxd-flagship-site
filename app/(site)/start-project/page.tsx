import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { INQUIRY_EMAIL, SITE } from "@/lib/site";
import { StartProjectForm } from "@/components/start-project/StartProjectForm";

export const metadata: Metadata = buildMetadata({
  title: "Project Intake",
  description:
    "Begin your KXD project application. Tell us about your brand, goals, and vision — and we'll personally review whether we're the right fit.",
  path: "/start-project",
  keywords: [
    "Start a Web Design Project",
    "KXD Project Application",
    "Luxury Web Design Intake",
    "Hire KXD Digital Studio",
  ],
  noIndex: false,
});

export default function StartProjectPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: "calc(var(--nav-height) + var(--section-py))",
          paddingBottom: "var(--section-py)",
          background: "var(--kxd-black-pure)",
          borderBottom: "1px solid var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "56rem" }}>
          {/* Eyebrow */}
          <p className="kxd-eyebrow">Project Application</p>

          {/* Headline */}
          <h1
            className="kxd-serif-title mt-5"
            style={{
              fontSize: "clamp(2.25rem, 4.5vw, 3.375rem)",
              maxWidth: "32rem",
              lineHeight: 1.07,
            }}
          >
            Let&rsquo;s Build Something Exceptional.
          </h1>

          {/* Body copy */}
          <p
            className="kxd-body mt-6"
            style={{ maxWidth: "34rem", lineHeight: 1.8 }}
          >
            KXD takes on a limited number of projects each year.
            Walk us through your vision and we&rsquo;ll personally review whether
            it&rsquo;s the right fit — no obligation, no sales calls.
          </p>

          {/* Trust markers */}
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
            {[
              "Reviewed personally by Matt",
              "Response within 2 business days",
              "8 focused questions — ~3 minutes",
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

      {/* ── Intake form + sidebar ────────────────────────────────────────────── */}
      <section
        className="kxd-section"
        style={{ background: "var(--kxd-black-base)" }}
      >
        <div className="kxd-container">
          <div className="grid gap-12 lg:grid-cols-[1fr_20rem] lg:gap-16 lg:items-start">
            {/* Multi-step form */}
            <StartProjectForm />

            {/* Sidebar */}
            <aside className="space-y-8 lg:pt-2">
              {/* What happens next */}
              <div
                style={{
                  borderLeft: "1px solid var(--kxd-border-gold)",
                  paddingLeft: "1.25rem",
                }}
              >
                <p className="kxd-label">What Happens Next</p>
                <ul className="mt-3 space-y-2.5">
                  {[
                    "Application reviewed personally",
                    "If it's the right fit, direct response from Matt",
                    "Brief discovery call to align vision",
                    "Proposal delivered within 5 business days",
                  ].map((step) => (
                    <li key={step} className="flex items-start gap-2.5">
                      <span
                        aria-hidden
                        style={{
                          color: "var(--kxd-gold)",
                          opacity: 0.65,
                          fontSize: "0.5rem",
                          lineHeight: "1.6rem",
                        }}
                      >
                        —
                      </span>
                      <p className="kxd-body-sm leading-snug">{step}</p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Direct contact */}
              <div
                style={{
                  borderLeft: "1px solid var(--kxd-border-white)",
                  paddingLeft: "1.25rem",
                }}
              >
                <p className="kxd-label">Prefer Direct?</p>
                <a
                  href={`mailto:${INQUIRY_EMAIL}`}
                  className="mt-3 block font-serif text-[1.0625rem] font-light text-[var(--kxd-gold)] transition hover:text-[var(--kxd-gold-light)]"
                  style={{ letterSpacing: "0.01em" }}
                >
                  {INQUIRY_EMAIL}
                </a>
                <p className="kxd-body-sm mt-2">
                  Reach Matt directly. We respond to every message.
                </p>
              </div>

              {/* Investment */}
              <div
                style={{
                  borderLeft: "1px solid var(--kxd-border-white)",
                  paddingLeft: "1.25rem",
                }}
              >
                <p className="kxd-label">Investment Starting At</p>
                <p className="kxd-body-sm mt-2">
                  Luxury websites from $7,500.<br />
                  Growth infrastructure from $12,500.
                </p>
                <a
                  href="/investment"
                  className="mt-3 block font-sans text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[var(--kxd-gold)] transition hover:text-[var(--kxd-gold-light)]"
                >
                  View investment levels →
                </a>
              </div>

              {/* Connect */}
              <div
                style={{
                  borderLeft: "1px solid var(--kxd-border-white)",
                  paddingLeft: "1.25rem",
                }}
              >
                <p className="kxd-label">Connect</p>
                <div className="mt-3 space-y-2">
                  {[
                    { label: "Instagram", href: SITE.social.instagram },
                    { label: "LinkedIn", href: SITE.social.linkedin },
                  ].map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[0.875rem] font-light text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
                    >
                      {s.label}
                    </a>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
