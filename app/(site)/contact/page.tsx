import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";
import { INQUIRY_EMAIL, SITE } from "@/lib/site";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Start a Project",
  description:
    "Apply to work with Kreate by Design. KXD takes on a limited number of engagements — each reviewed personally to ensure the right fit.",
  path: "/contact",
  keywords: [
    "Hire Luxury Web Designer",
    "Premium Web Design Agency Contact",
    "Start a Web Design Project",
    "KXD Project Inquiry",
  ],
});

export default function ContactPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section
        className="border-b"
        style={{
          paddingTop: "calc(var(--nav-height) + var(--section-py))",
          paddingBottom: "var(--section-py)",
          background: "var(--kxd-black-pure)",
          borderColor: "var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "54rem" }}>
          <p className="kxd-eyebrow">Project Application</p>
          <h1
            className="kxd-serif-title mt-5"
            style={{ fontSize: "clamp(2.25rem, 4.5vw, 3.25rem)", maxWidth: "34rem" }}
          >
            Apply to Work With KXD.
          </h1>
          <p className="kxd-body mt-6" style={{ maxWidth: "32rem" }}>
            KXD takes on a limited number of engagements each year.
            Every application is reviewed personally — if it&rsquo;s the right fit,
            we&rsquo;ll reach out directly.
          </p>

          {/* Trust indicators */}
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
            {[
              "Reviewed personally",
              "Response within 2 business days",
              "No obligation",
            ].map((point) => (
              <div key={point} className="flex items-center gap-2.5">
                <div
                  aria-hidden
                  style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--kxd-gold)", flexShrink: 0 }}
                />
                <p className="kxd-label" style={{ letterSpacing: "0.10em" }}>{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Application form + sidebar ── */}
      <section
        className="kxd-section"
        style={{ background: "var(--kxd-black-base)" }}
      >
        <div className="kxd-container">
          <div className="grid gap-12 lg:grid-cols-[1fr_20rem] lg:gap-16 lg:items-start">
            <ContactForm />

            {/* Sidebar */}
            <aside className="space-y-8 lg:pt-2">
              <div
                style={{
                  borderLeft: "1px solid var(--kxd-border-gold)",
                  paddingLeft: "1.25rem",
                }}
              >
                <p className="kxd-label">Direct</p>
                <a
                  href={`mailto:${INQUIRY_EMAIL}`}
                  className="mt-3 block font-serif text-[1.0625rem] font-light text-[var(--kxd-gold)] transition hover:text-[var(--kxd-gold-light)]"
                  style={{ letterSpacing: "0.01em" }}
                >
                  {INQUIRY_EMAIL}
                </a>
              </div>

              <div style={{ borderLeft: "1px solid var(--kxd-border-white)", paddingLeft: "1.25rem" }}>
                <p className="kxd-label">What to Expect</p>
                <ul className="mt-3 space-y-2.5">
                  {[
                    "Application reviewed within 2 business days",
                    "Direct response from Matt",
                    "Brief discovery call if fit is confirmed",
                    "Proposal within 5 business days",
                  ].map((step) => (
                    <li key={step} className="flex items-start gap-2.5">
                      <span
                        aria-hidden
                        style={{ color: "var(--kxd-gold)", opacity: 0.65, fontSize: "0.5rem", lineHeight: "1.6rem" }}
                      >
                        —
                      </span>
                      <p className="kxd-body-sm leading-snug">{step}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ borderLeft: "1px solid var(--kxd-border-white)", paddingLeft: "1.25rem" }}>
                <p className="kxd-label">Connect</p>
                <div className="mt-3 space-y-2">
                  {[
                    { label: "Instagram", href: SITE.social.instagram },
                    { label: "LinkedIn",  href: SITE.social.linkedin },
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

              <div style={{ borderLeft: "1px solid var(--kxd-border-white)", paddingLeft: "1.25rem" }}>
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
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
