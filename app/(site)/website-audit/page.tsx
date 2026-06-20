import type { Metadata } from "next";
import { WebsiteAuditForm } from "@/components/website-audit/WebsiteAuditForm";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Free Website Audit",
  description:
    "Get a premium KXD Website Audit — performance, SEO, mobile, conversion, and brand scores with clear improvement opportunities.",
  path: "/website-audit",
  keywords: [
    "Website Audit",
    "Free Website Score",
    "SEO Audit",
    "Website Performance Review",
    "Luxury Web Design Audit",
    "KXD Website Auditor",
  ],
});

const TRUST = [
  "Instant results",
  "No generic SaaS templates",
  "Built for serious brands",
  "Reviewed by KXD strategy team",
] as const;

const SIGNALS = [
  { label: "Performance", desc: "Load speed and page weight signals" },
  { label: "SEO", desc: "Titles, meta data, and hierarchy" },
  { label: "Mobile", desc: "Viewport and mobile readiness" },
  { label: "Conversion", desc: "CTAs, forms, and lead paths" },
  { label: "Brand", desc: "Typography, identity, and polish" },
] as const;

export default function WebsiteAuditPage() {
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
          <p className="kxd-eyebrow">KXD Website Auditor</p>
          <h1
            className="kxd-serif-title mt-5"
            style={{ fontSize: "clamp(2.25rem, 4.8vw, 3.5rem)", maxWidth: "36rem", lineHeight: 1.05 }}
          >
            Know where your website stands — before you invest in the next version.
          </h1>
          <p className="kxd-body mt-6" style={{ maxWidth: "38rem", lineHeight: 1.8 }}>
            A focused audit across performance, SEO, mobile experience, conversion, and brand
            presentation. Clear scores, honest opportunities, and a path forward — not enterprise SEO noise.
          </p>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
            {TRUST.map((item) => (
              <span
                key={item}
                className="font-sans uppercase"
                style={{ fontSize: "0.5625rem", letterSpacing: "0.12em", color: "rgba(255,255,255,0.35)" }}
              >
                ◆ {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="kxd-container py-14 lg:py-16" style={{ maxWidth: "58rem" }}>
        <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-12">
          <div>
            <p className="kxd-eyebrow" style={{ opacity: 0.65 }}>Start Your Audit</p>
            <h2
              className="mt-3 font-serif font-light"
              style={{ fontSize: "clamp(1.5rem, 2.5vw, 1.875rem)", color: "var(--kxd-cream)" }}
            >
              Submit your website
            </h2>
            <p className="mt-4 font-sans font-light" style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
              Enter your details and URL. KXD analyzes your homepage signals and generates a
              scorecard with prioritized improvements.
            </p>
            <div
              className="mt-8"
              style={{
                background: "var(--kxd-black-elevated)",
                border: "1px solid var(--kxd-border-white)",
                padding: "1.75rem",
              }}
            >
              <WebsiteAuditForm />
            </div>
          </div>

          <aside>
            <p className="kxd-eyebrow" style={{ opacity: 0.65 }}>What We Measure</p>
            <div className="mt-4 space-y-px" style={{ border: "1px solid var(--kxd-border-white)" }}>
              {SIGNALS.map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: "var(--kxd-black-elevated)",
                    padding: "1rem 1.25rem",
                    borderBottom: "1px solid var(--kxd-border-white)",
                  }}
                >
                  <p className="font-sans uppercase" style={{ fontSize: "0.5rem", letterSpacing: "0.14em", color: "var(--kxd-gold)" }}>
                    {s.label}
                  </p>
                  <p className="mt-1 font-sans font-light" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
            <p
              className="mt-6 font-serif font-light italic"
              style={{ fontSize: "0.9375rem", lineHeight: 1.65, color: "var(--kxd-cream-muted)" }}
            >
              &ldquo;This isn&rsquo;t a crawler report — it&rsquo;s a strategic snapshot built to start the right conversation.&rdquo;
            </p>
          </aside>
        </div>
      </section>
    </>
  );
}
