import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { INQUIRY_EMAIL, SITE } from "@/lib/site";
import { StartProjectForm } from "@/components/start-project/StartProjectForm";

export const metadata: Metadata = buildMetadata({
  title: "Start a Partnership",
  description:
    "Apply to begin a KXD project partnership. Share your brand, goals, investment range, and vision so we can personally review whether the engagement is the right fit.",
  path: "/start-project",
  keywords: [
    "Start a Web Design Project",
    "KXD Project Application",
    "Luxury Web Design Intake",
    "Premium Website Application",
    "Hire KXD Digital Studio",
    "Brand Growth Partnership",
  ],
  noIndex: false,
});

export default function StartProjectPage() {
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
        <div className="kxd-container" style={{ maxWidth: "58rem" }}>
          <p className="kxd-eyebrow">Project Application</p>

          <h1
            className="kxd-serif-title mt-5"
            style={{
              fontSize: "clamp(2.35rem, 4.8vw, 3.65rem)",
              maxWidth: "36rem",
              lineHeight: 1.05,
            }}
          >
            Apply to Build With KXD.
          </h1>

          <p
            className="kxd-body mt-6"
            style={{ maxWidth: "38rem", lineHeight: 1.8 }}
          >
            This is the first step toward a focused creative partnership. Tell us
            where your brand is now, where it needs to go, and what kind of digital
            experience or operating system you are ready to build.
          </p>

          <div
            className="mt-8 border-l pl-5"
            style={{ borderColor: "var(--kxd-border-gold)" }}
          >
            <p
              className="font-serif font-light italic"
              style={{
                fontSize: "clamp(0.9375rem, 1.4vw, 1.0625rem)",
                lineHeight: 1.7,
                letterSpacing: "0.01em",
                color: "var(--kxd-cream-soft)",
                maxWidth: "34rem",
              }}
            >
              KXD takes on a limited number of engagements at a time so each
              partnership gets the strategy, attention, and execution it deserves.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
            {[
              "Reviewed personally by Matt",
              "Response within 2 business days",
              "Focused application — ~3 minutes",
              "Built for serious growth conversations",
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

      <section
        className="kxd-section"
        style={{ background: "var(--kxd-black-base)" }}
      >
        <div className="kxd-container">
          <div className="grid gap-12 lg:grid-cols-[1fr_20rem] lg:gap-16 lg:items-start">
            <StartProjectForm />

            <aside className="space-y-8 lg:pt-2">
              <div
                style={{
                  borderLeft: "1px solid var(--kxd-border-gold)",
                  paddingLeft: "1.25rem",
                }}
              >
                <p className="kxd-label">What Happens Next</p>
                <ul className="mt-3 space-y-2.5">
                  {[
                    "Your application is reviewed for strategic fit",
                    "If aligned, Matt responds directly",
                    "We schedule a focused discovery conversation",
                    "A custom proposal is delivered within 5 business days",
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

              <div
                style={{
                  borderLeft: "1px solid var(--kxd-border-white)",
                  paddingLeft: "1.25rem",
                }}
              >
                <p className="kxd-label">Best Fit For</p>
                <ul className="mt-3 space-y-2.5">
                  {[
                    "Premium website experiences",
                    "Brand systems and identity",
                    "Growth infrastructure",
                    "Client portals and operating systems",
                    "Ongoing strategic partnerships",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span
                        aria-hidden
                        style={{
                          color: "var(--kxd-gold)",
                          opacity: 0.55,
                          fontSize: "0.5rem",
                          lineHeight: "1.6rem",
                        }}
                      >
                        —
                      </span>
                      <p className="kxd-body-sm leading-snug">{item}</p>
                    </li>
                  ))}
                </ul>
              </div>

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
                  Reach Matt directly for partnership, platform, or strategic
                  growth conversations.
                </p>
              </div>

              <div
                style={{
                  borderLeft: "1px solid var(--kxd-border-white)",
                  paddingLeft: "1.25rem",
                }}
              >
                <p className="kxd-label">Investment Starting At</p>
                <p className="kxd-body-sm mt-2">
                  Luxury websites from $8,500.
                  <br />
                  Growth infrastructure from $12,500.
                  <br />
                  Ongoing partnerships from $3,000/month.
                </p>
                <a
                  href="/investment"
                  className="mt-3 block font-sans text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[var(--kxd-gold)] transition hover:text-[var(--kxd-gold-light)]"
                >
                  View investment levels →
                </a>
              </div>

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