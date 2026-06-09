import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";
import { INQUIRY_EMAIL, SITE } from "@/lib/site";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Contact",
  description:
    "Start with the right conversation. Tell us what you're building — Kreate by Design reviews every inquiry personally.",
  path: "/contact",
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
        <div className="kxd-container" style={{ maxWidth: "50rem" }}>
          <p className="kxd-eyebrow">Contact</p>
          <h1
            className="kxd-serif-title mt-5"
            style={{ fontSize: "clamp(2.25rem, 4.5vw, 3.25rem)" }}
          >
            Start With the Right Conversation.
          </h1>
          <p className="kxd-body mt-6" style={{ maxWidth: "30rem" }}>
            Tell us what you&rsquo;re building. If it&rsquo;s the right fit,
            we&rsquo;ll map the next move.
          </p>
        </div>
      </section>

      {/* ── Form + details ── */}
      <section
        className="kxd-section"
        style={{ background: "var(--kxd-black-base)" }}
      >
        <div className="kxd-container">
          <div className="grid gap-12 lg:grid-cols-[1fr_18rem] lg:gap-16">
            <ContactForm />

            <aside className="space-y-8">
              <div style={{ borderLeft: "1px solid var(--kxd-border-gold)", paddingLeft: "1.25rem" }}>
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
                <p className="kxd-label">Location</p>
                <p className="kxd-body-sm mt-3">{SITE.location}</p>
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
                <p className="kxd-label">Est.</p>
                <p className="kxd-body-sm mt-2">{SITE.foundedYear}</p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
