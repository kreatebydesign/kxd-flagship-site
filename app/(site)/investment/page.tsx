import type { Metadata } from "next";
import Link from "next/link";
import { PublicPageEvent } from "@/components/analytics/PublicPageEvent";
import { FinalCtaBand } from "@/components/ui/FinalCtaBand";
import { ANALYTICS_EVENTS } from "@/lib/analytics/config";
import { HOMEPAGE_SERVICES } from "@/lib/homepage";
import { buildMetadata } from "@/lib/seo/metadata";
import { StructuredData } from "@/components/seo/StructuredData";
import { breadcrumbSchema, webPageSchema } from "@/lib/seo/schema";

export const metadata: Metadata = buildMetadata({
  title: "Working Together",
  description:
    "How Kreate by Design scopes premium website, branding, growth, and platform engagements. Founder-led discovery, custom proposals, and disciplined delivery from first conversation through launch.",
  path: "/investment",
  keywords: [
    "Premium Website Design Studio",
    "Custom Web Design Proposal",
    "Website Development Partnership",
    "Brand and Digital Engagement",
    "KXD Creative Partnership",
  ],
});

const PROCESS = [
  {
    step: "01",
    title: "Start a Project",
    body: "Share your business, goals, timing, and the type of work you are considering. Every application is reviewed personally.",
  },
  {
    step: "02",
    title: "Fit and discovery",
    body: "If the engagement looks aligned, we clarify scope, stakeholders, constraints, and what success should look like before any proposal.",
  },
  {
    step: "03",
    title: "Custom proposal",
    body: "You receive a written scope: deliverables, timeline, collaboration rhythm, and investment structured to the work.",
  },
  {
    step: "04",
    title: "Build and launch",
    body: "Design and development move through defined phases with founder oversight, clear approvals, and measurement ready at launch.",
  },
] as const;

const PROJECT_VS_PARTNERSHIP = [
  {
    title: "One-time projects",
    body: "Website design and development, brand systems, growth infrastructure, and platform builds scoped as defined engagements with clear milestones.",
    href: "/services/luxury-website-experiences",
    linkLabel: "Premium websites",
  },
  {
    title: "Ongoing partnerships",
    body: "Monthly creative and operating relationships for teams that need structured website care, production capacity, and a private client experience.",
    href: "/pricing",
    linkLabel: "Partnership overview",
  },
] as const;

export default function WorkingTogetherPage() {
  const schema = [
    breadcrumbSchema([
      { name: "Working Together", path: "/investment" },
    ]),
    webPageSchema({
      title: "Working Together",
      description:
        "How Kreate by Design scopes premium creative and technology engagements through discovery and custom proposal.",
      path: "/investment",
    }),
  ];

  return (
    <>
      <StructuredData data={schema} />
      <PublicPageEvent
        eventName={ANALYTICS_EVENTS.pricingView}
        params={{ page_path: "/investment" }}
      />
      <PublicPageEvent
        eventName={ANALYTICS_EVENTS.workingTogetherView}
        params={{ page_path: "/investment" }}
      />

      <section
        style={{
          paddingTop: "calc(var(--nav-height) + var(--section-py))",
          paddingBottom: "var(--section-py)",
          background: "var(--kxd-black-pure)",
          borderBottom: "1px solid var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "54rem" }}>
          <p className="kxd-eyebrow">Working Together</p>
          <h1
            className="kxd-serif-title mt-5"
            style={{
              fontSize: "clamp(2.5rem, 5.5vw, 3.75rem)",
              maxWidth: "36rem",
              lineHeight: 1.06,
            }}
          >
            Every engagement is scoped with intention.
          </h1>
          <p className="kxd-body mt-6" style={{ maxWidth: "38rem", lineHeight: 1.85 }}>
            KXD is a premium creative and technology studio. We design and build
            exceptional websites, brand systems, growth infrastructure, and custom
            platforms for established brands. Work begins with a conversation: you
            share context, we evaluate fit, and we propose what the business needs.
          </p>
        </div>
      </section>

      <section
        className="kxd-section border-t"
        style={{
          background: "var(--kxd-black-base)",
          borderColor: "var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container">
          <div className="max-w-3xl">
            <p className="kxd-eyebrow">The model</p>
            <h2
              className="kxd-serif-title mt-4"
              style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}
            >
              Consultation-led. Proposal-defined. Built to perform.
            </h2>
            <p className="kxd-body-sm mt-5" style={{ lineHeight: 1.85, maxWidth: "36rem" }}>
              KXD does not sell packages off a shelf. We learn the business, define the
              work, and deliver a custom proposal with clear deliverables, timeline, and
              collaboration expectations.
            </p>
          </div>
          <div className="mt-14 grid gap-px md:grid-cols-2">
            {PROJECT_VS_PARTNERSHIP.map((item) => (
              <div
                key={item.title}
                className="border p-8 md:p-10"
                style={{
                  borderColor: "var(--kxd-border-white)",
                  background: "var(--kxd-black-deep)",
                }}
              >
                <h2
                  className="font-serif font-light"
                  style={{
                    fontSize: "clamp(1.25rem, 2vw, 1.5rem)",
                    color: "var(--kxd-cream)",
                  }}
                >
                  {item.title}
                </h2>
                <p className="kxd-body-sm mt-4" style={{ lineHeight: 1.85, maxWidth: "28rem" }}>
                  {item.body}
                </p>
                <Link
                  href={item.href}
                  className="kxd-ui-label mt-6 inline-flex items-center gap-2 text-[var(--kxd-gold)] transition hover:text-[var(--kxd-cream)]"
                >
                  {item.linkLabel}
                  <span aria-hidden>→</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="kxd-section border-t"
        style={{
          background: "var(--kxd-black-deep)",
          borderColor: "var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "52rem" }}>
          <p className="kxd-eyebrow">How it begins</p>
          <h2
            className="kxd-serif-title mt-4"
            style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)" }}
          >
            From application to launch
          </h2>
          <div className="mt-12 space-y-0">
            {PROCESS.map((step, i) => (
              <article
                key={step.step}
                className="grid gap-6 py-8 sm:grid-cols-[4rem_1fr]"
                style={{
                  borderTop: "1px solid var(--kxd-border-white)",
                  ...(i === PROCESS.length - 1
                    ? { borderBottom: "1px solid var(--kxd-border-white)" }
                    : {}),
                }}
              >
                <p
                  className="font-serif font-light"
                  style={{
                    fontSize: "1.75rem",
                    color: "var(--kxd-gold)",
                    lineHeight: 1,
                  }}
                >
                  {step.step}
                </p>
                <div>
                  <h3
                    className="font-serif font-light"
                    style={{ fontSize: "1.25rem", color: "var(--kxd-cream)" }}
                  >
                    {step.title}
                  </h3>
                  <p className="kxd-body-sm mt-3" style={{ lineHeight: 1.8, maxWidth: "34rem" }}>
                    {step.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="kxd-section border-t"
        style={{
          background: "var(--kxd-black-base)",
          borderColor: "var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container">
          <p className="kxd-eyebrow">What we build</p>
          <h2
            className="kxd-serif-title mt-4"
            style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)", maxWidth: "22ch" }}
          >
            Services shaped to your objectives
          </h2>
          <p className="kxd-body-sm mt-5" style={{ maxWidth: "36rem", lineHeight: 1.85 }}>
            Most relationships start with a premium website. Branding, SEO, custom
            software, and ongoing partnerships follow when the strategy requires them.
          </p>
          <ul className="mt-10 space-y-0">
            {HOMEPAGE_SERVICES.map((service) => (
              <li key={service.slug}>
                <Link
                  href={`/services/${service.slug}`}
                  className="kxd-service-index-row group"
                >
                  <span className="kxd-label text-[var(--kxd-gold)]">{service.number}</span>
                  <div className="min-w-0">
                    <h3
                      className="font-serif font-light transition-colors group-hover:text-[var(--kxd-gold-light)]"
                      style={{
                        fontSize: "clamp(1.0625rem, 1.6vw, 1.25rem)",
                        color: "var(--kxd-cream)",
                      }}
                    >
                      {service.title}
                    </h3>
                    <p className="kxd-body-sm mt-2" style={{ lineHeight: 1.75 }}>
                      {service.summary}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className="kxd-ui-label opacity-0 transition group-hover:opacity-100"
                    style={{ color: "var(--kxd-gold)" }}
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        className="kxd-section border-t"
        style={{
          background: "var(--kxd-black-deep)",
          borderColor: "var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "48rem" }}>
          <p className="kxd-eyebrow">Expectations</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {[
              {
                label: "Founder access",
                value: "Direct oversight through scoping, design, and delivery.",
              },
              {
                label: "Response",
                value: "Inquiries reviewed within two business days.",
              },
              {
                label: "Payments",
                value: "Milestone structure defined in your proposal, aligned to delivery phases.",
              },
              {
                label: "Fit first",
                value: "We take on a limited number of engagements so each receives full attention.",
              },
            ].map((note) => (
              <div
                key={note.label}
                className="border-l pl-5"
                style={{ borderColor: "var(--kxd-border-gold)" }}
              >
                <p className="kxd-label">{note.label}</p>
                <p className="kxd-body-sm mt-2">{note.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FinalCtaBand
        headline="Tell us what you are building."
        subCopy="Start a project application when you are ready for a serious conversation. We will confirm fit, scope, and the right path forward."
        secondaryHref="/work"
        secondaryLabel="Explore Our Work"
        analyticsCtaLocation="working_together_page"
      />
    </>
  );
}