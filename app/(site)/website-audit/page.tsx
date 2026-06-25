import type { Metadata } from "next";
import { WebsiteAuditForm } from "@/components/website-audit/WebsiteAuditForm";
import { StructuredData } from "@/components/seo/StructuredData";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, webPageSchema } from "@/lib/seo/schema";

export const metadata: Metadata = buildMetadata({
  title: "KXD Intelligence — Website Diagnostic",
  description:
    "KXD Intelligence is our AI-powered website diagnostic — a strategic review across performance, SEO, mobile experience, conversion, and brand presentation with clear prioritized improvements.",
  path: "/website-audit",
  keywords: [
    "KXD Intelligence",
    "Website Diagnostic",
    "AI Website Audit",
    "Website Performance Review",
    "SEO Audit",
    "Luxury Web Design Audit",
    "Website Scorecard",
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

const SIGNAL_SUMMARY = SIGNALS.map((s) => s.label).join(" · ");

export default function WebsiteAuditPage() {
  const schema = [
    breadcrumbSchema([
      { name: "KXD Intelligence", path: "/website-audit" },
    ]),
    webPageSchema({
      title: "KXD Intelligence — Website Diagnostic",
      description:
        "AI-powered website diagnostic across performance, SEO, mobile, conversion, and brand presentation.",
      path: "/website-audit",
    }),
  ];

  return (
    <>
      <StructuredData data={schema} />

      <section
        style={{
          paddingTop: "calc(var(--nav-height) + var(--section-py))",
          paddingBottom: "var(--section-py)",
          background: "var(--kxd-black-pure)",
          borderBottom: "1px solid var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "58rem" }}>
          <p className="kxd-eyebrow">KXD Intelligence</p>
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

      <section
        className="kxd-section"
        style={{ background: "var(--kxd-black-base)" }}
      >
        <div className="kxd-container">
          <div className="grid gap-8 md:gap-10 lg:grid-cols-2 lg:items-start lg:gap-x-12">
            <div className="kxd-audit-panel">
              <div className="kxd-audit-panel__header">
                <p className="kxd-eyebrow" style={{ opacity: 0.65 }}>Start Your Audit</p>
                <h2 className="kxd-audit-panel__title">Submit your website</h2>
                <p className="kxd-audit-panel__lede">
                  Enter your details and URL. KXD analyzes your homepage signals and generates a
                  scorecard with prioritized improvements.
                </p>
              </div>
              <div className="kxd-audit-panel__body">
                <WebsiteAuditForm />
              </div>
            </div>

            <aside className="flex flex-col gap-6">
              <div className="kxd-audit-panel">
                <div className="kxd-audit-panel__header">
                  <p className="kxd-eyebrow" style={{ opacity: 0.65 }}>What We Measure</p>
                  <p className="kxd-audit-panel__lede">{SIGNAL_SUMMARY}</p>
                </div>
                <div>
                  {SIGNALS.map((s) => (
                    <div key={s.label} className="kxd-audit-panel__signal">
                      <p
                        className="font-sans uppercase"
                        style={{ fontSize: "0.5rem", letterSpacing: "0.14em", color: "var(--kxd-gold)" }}
                      >
                        {s.label}
                      </p>
                      <p
                        className="mt-1 font-sans font-light"
                        style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}
                      >
                        {s.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <p
                className="font-serif font-light italic"
                style={{
                  fontSize: "0.9375rem",
                  lineHeight: 1.65,
                  color: "var(--kxd-cream-muted)",
                  paddingInline: "0.125rem",
                }}
              >
                &ldquo;This isn&rsquo;t a crawler report — it&rsquo;s a strategic snapshot built to start the right conversation.&rdquo;
              </p>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
