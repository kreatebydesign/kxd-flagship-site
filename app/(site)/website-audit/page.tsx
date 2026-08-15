import type { Metadata } from "next";
import { WebsiteAuditForm } from "@/components/website-audit/WebsiteAuditForm";
import { StructuredData } from "@/components/seo/StructuredData";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, webPageSchema } from "@/lib/seo/schema";

export const metadata: Metadata = buildMetadata({
  title: "KXD Intelligence — Website Audit",
  description:
    "Something about your website isn't working the way it should. KXD Intelligence reviews homepage performance, SEO foundations, mobile readiness, conversion paths, and brand presentation — then shows where the pressure is.",
  path: "/website-audit",
  keywords: [
    "KXD Intelligence",
    "Website Audit",
    "Website Performance",
    "Website Redesign Diagnostic",
    "Website Problems",
    "Conversion Path Review",
    "Website Quality Review",
  ],
});

const TRUST = [
  "Instant diagnostic",
  "Honest scorecard",
  "No generic SEO report dump",
  "Built to start the right conversation",
] as const;

const SIGNALS = [
  { label: "Performance", desc: "Response speed and page weight signals" },
  { label: "SEO", desc: "Titles, meta data, and heading hierarchy" },
  { label: "Mobile", desc: "Viewport and mobile readiness cues" },
  { label: "Conversion", desc: "CTAs, forms, and inquiry path signals" },
  { label: "Brand", desc: "Typography, identity cues, and presentation polish" },
] as const;

const SIGNAL_SUMMARY = SIGNALS.map((s) => s.label).join(" · ");

export default function WebsiteAuditPage() {
  const schema = [
    breadcrumbSchema([
      { name: "KXD Intelligence", path: "/website-audit" },
    ]),
    webPageSchema({
      title: "KXD Intelligence — Website Audit",
      description:
        "Diagnostic website audit across performance, SEO, mobile, conversion, and brand presentation.",
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
            style={{ fontSize: "clamp(2.25rem, 4.8vw, 3.5rem)", maxWidth: "38rem", lineHeight: 1.05 }}
          >
            Something about the website isn&apos;t working the way it should.
          </h1>
          <p className="kxd-body mt-6" style={{ maxWidth: "40rem", lineHeight: 1.8 }}>
            KXD Intelligence evaluates your homepage to surface meaningful issues and
            opportunities — performance, discoverability, mobile experience, inquiry paths,
            and brand presentation. Clear scores. Honest gaps. A useful next step.
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
                <h2 className="kxd-audit-panel__title">Run the diagnostic</h2>
                <p className="kxd-audit-panel__lede">
                  Enter your details and URL. KXD analyzes publicly visible homepage signals
                  and returns a scorecard with prioritized observations — not an enterprise
                  crawl dump.
                </p>
              </div>
              <div className="kxd-audit-panel__body">
                <WebsiteAuditForm />
              </div>
            </div>

            <aside className="flex flex-col gap-6">
              <div className="kxd-audit-panel">
                <div className="kxd-audit-panel__header">
                  <p className="kxd-eyebrow" style={{ opacity: 0.65 }}>What We Evaluate</p>
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
                &ldquo;Diagnosis first. Then a clear path toward the KXD capability that
                actually fits — website, growth, or deeper systems when the business needs
                them.&rdquo;
              </p>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
