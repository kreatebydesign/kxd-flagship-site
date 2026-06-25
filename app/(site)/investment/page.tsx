import type { Metadata } from "next";
import { FinalCtaBand } from "@/components/ui/FinalCtaBand";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Investment",
  description:
    "Investment levels for luxury website experiences, brand systems, growth infrastructure, and enterprise platform work. Every engagement is scoped to the goals and vision of each brand.",
  path: "/investment",
  keywords: [
    "Luxury Web Design Pricing",
    "Premium Website Design Cost",
    "Brand Systems Investment",
    "Enterprise Platform Development Cost",
    "Growth Infrastructure Investment",
    "Digital Agency Investment Levels",
  ],
});

const LEVELS = [
  {
    label: "01",
    title: "Luxury Website Experiences",
    starting: "Starting at $7,500",
    description:
      "Cinematic brand websites for premium businesses, hospitality, motorsports, and high-end service organizations. Every engagement is built around the brand's positioning, audience, and long-term goals.",
    includes: [
      "Custom design direction and art direction",
      "Full-stack Next.js or platform build",
      "CMS integration and editorial architecture",
      "Mobile-first, performance-optimized delivery",
      "Inquiry and conversion flow design",
      "30-day post-launch support",
    ],
    accent: true,
  },
  {
    label: "02",
    title: "Brand Systems & Identity",
    starting: "Starting at $4,500",
    description:
      "Visual identity, brand architecture, and design systems built for brands that need a consistent, considered foundation across every touchpoint.",
    includes: [
      "Logo mark and wordmark system",
      "Color, typography, and spacing system",
      "Brand guidelines and usage documentation",
      "Digital and print-ready asset delivery",
      "Tone of voice and positioning alignment",
    ],
    accent: false,
  },
  {
    label: "03",
    title: "Growth Infrastructure",
    starting: "Starting at $12,500",
    description:
      "Full digital infrastructure for growing brands — combining website, inquiry systems, CRM connections, automation, and operational tooling into a unified growth engine.",
    includes: [
      "Strategy and infrastructure audit",
      "Website experience and conversion architecture",
      "Lead capture and inquiry routing systems",
      "CRM and automation integration",
      "Analytics and performance foundation",
      "Scalable architecture for continued growth",
    ],
    accent: false,
  },
  {
    label: "04",
    title: "Enterprise Platforms",
    starting: "Custom Engagements",
    description:
      "Member portals, operational platforms, dashboards, and multi-audience systems for complex organizations. Scoped individually after a dedicated discovery engagement.",
    includes: [
      "Discovery and architecture session",
      "Custom platform design and development",
      "Multi-audience experience architecture",
      "Operational workflow integration",
      "Admin interface and content management",
      "Ongoing support retainer available",
    ],
    accent: false,
  },
  {
    label: "05",
    title: "Ongoing Partnerships",
    starting: "Starting at $2,500/month",
    description:
      "Monthly retainer engagements for brands that need consistent creative direction, technical execution, and strategic support beyond the initial build.",
    includes: [
      "Dedicated monthly creative and strategy hours",
      "Ongoing website updates and improvements",
      "Performance monitoring and optimization",
      "New feature and page development",
      "Priority access and direct communication",
    ],
    accent: false,
  },
] as const;

const PARTNERSHIP_FIT = {
  ideal: [
    "Established businesses preparing for their next stage of growth",
    "Organizations seeking long-term strategic partnerships",
    "Founders who value quality, execution, and collaboration",
    "Brands ready to invest in exceptional digital experiences",
  ],
  notFit: [
    "Businesses seeking the lowest-cost option",
    "Projects requiring unrealistic timelines",
    "Organizations looking for one-size-fits-all solutions",
    "Engagements without strategic alignment",
  ],
} as const;

export default function InvestmentPage() {
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
        <div className="kxd-container" style={{ maxWidth: "54rem" }}>
          <p className="kxd-eyebrow">Investment</p>
          <h1
            className="kxd-serif-title mt-5"
            style={{
              fontSize: "clamp(2.5rem, 5.5vw, 3.75rem)",
              maxWidth: "38rem",
              lineHeight: 1.06,
            }}
          >
            Built for Brands Ready to Grow.
          </h1>
          <p className="kxd-body mt-6" style={{ maxWidth: "38rem" }}>
            Exceptional brands require more than attractive websites. They require
            intentional systems, thoughtful strategy, and execution capable of
            supporting long-term growth. Every engagement is built around the unique
            ambitions of the businesses we partner with.
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
              KXD does not sell packages. We scope each engagement around what
              the brand actually needs — nothing less, nothing extra.
            </p>
          </div>
        </div>
      </section>

      <section className="kxd-section" style={{ background: "var(--kxd-black-base)" }}>
        <div className="kxd-container">
          <div className="space-y-0">
            {LEVELS.map((level, i) => (
              <article
                key={level.label}
                className="grid gap-8 py-12 lg:grid-cols-[8rem_1fr_22rem] lg:gap-12"
                style={{
                  borderTop:
                    i === 0
                      ? "1px solid var(--kxd-border-gold)"
                      : "1px solid var(--kxd-border-white)",
                }}
              >
                <div className="pt-0.5">
                  <p
                    className="font-serif font-light"
                    style={{
                      fontSize: "2.5rem",
                      lineHeight: 1,
                      color: level.accent
                        ? "var(--kxd-gold)"
                        : "var(--kxd-border-gold-strong)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {level.label}
                  </p>
                </div>

                <div>
                  <h2
                    className="font-serif font-light"
                    style={{
                      fontSize: "clamp(1.25rem, 2.2vw, 1.625rem)",
                      lineHeight: 1.15,
                      letterSpacing: "0.01em",
                      color: "var(--kxd-cream)",
                    }}
                  >
                    {level.title}
                  </h2>
                  <p
                    className="mt-1 font-sans font-medium uppercase"
                    style={{
                      fontSize: "0.5625rem",
                      letterSpacing: "0.16em",
                      color: "var(--kxd-gold)",
                    }}
                  >
                    {level.starting}
                  </p>
                  <p className="kxd-body-sm mt-5" style={{ maxWidth: "34rem" }}>
                    {level.description}
                  </p>
                </div>

                <div
                  className="border-l pl-8"
                  style={{ borderColor: "var(--kxd-border-white)" }}
                >
                  <p className="kxd-label mb-4">What&rsquo;s included</p>
                  <ul className="space-y-2.5">
                    {level.includes.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span
                          aria-hidden
                          style={{
                            width: "4px",
                            height: "4px",
                            borderRadius: "50%",
                            background: "var(--kxd-gold)",
                            opacity: 0.55,
                            flexShrink: 0,
                            marginTop: "0.45rem",
                          }}
                        />
                        <p className="kxd-body-sm leading-snug">{item}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}

            <div
              style={{
                borderTop: "1px solid var(--kxd-border-white)",
                paddingTop: "3rem",
              }}
            >
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: "All engagements include",
                    value: "Direct access to the founder throughout",
                  },
                  {
                    label: "Response time",
                    value: "Within 2 business days after application",
                  },
                  {
                    label: "Engagement model",
                    value: "Tailored to your goals and growth stage",
                  },
                  {
                    label: "Current partnerships",
                    value:
                      "Motorsports, hospitality, automotive, civic, and growth-focused brands.",
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
          <div className="grid gap-16 lg:grid-cols-2">
            <div>
              <p className="kxd-eyebrow">Partnership Fit</p>

              <h2
                className="kxd-serif-title mt-4"
                style={{
                  fontSize: "clamp(2rem, 3vw, 2.75rem)",
                  maxWidth: "24rem",
                }}
              >
                We work best with brands ready to invest in growth.
              </h2>

              <p className="kxd-body-sm mt-6" style={{ maxWidth: "30rem" }}>
                The strongest partnerships happen when ambition, trust, and execution
                are aligned from day one. KXD is built for brands that want the work
                done right — not rushed, diluted, or treated like a template.
              </p>
            </div>

            <div className="space-y-10">
              <div>
                <p className="kxd-label mb-4">Ideal Partners</p>

                <ul className="space-y-3">
                  {PARTNERSHIP_FIT.ideal.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span
                        aria-hidden
                        style={{
                          width: "4px",
                          height: "4px",
                          borderRadius: "50%",
                          background: "var(--kxd-gold)",
                          opacity: 0.65,
                          flexShrink: 0,
                          marginTop: "0.5rem",
                        }}
                      />
                      <p className="kxd-body-sm">{item}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="kxd-label mb-4">Not the Right Fit</p>

                <ul className="space-y-3">
                  {PARTNERSHIP_FIT.notFit.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span
                        aria-hidden
                        style={{
                          width: "4px",
                          height: "4px",
                          borderRadius: "50%",
                          background: "var(--kxd-cream-muted)",
                          opacity: 0.38,
                          flexShrink: 0,
                          marginTop: "0.5rem",
                        }}
                      />
                      <p className="kxd-body-sm">{item}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
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
        <div className="kxd-container">
          <div className="grid gap-12 lg:grid-cols-[16rem_1fr] lg:gap-20">
            <div>
              <p className="kxd-eyebrow">Common Questions</p>
              <h2
                className="kxd-serif-title mt-4"
                style={{
                  fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
                  maxWidth: "14rem",
                }}
              >
                Before you apply.
              </h2>
            </div>
            <div className="space-y-0">
              {[
                {
                  q: "Do you work with startups?",
                  a: "Selectively. If the vision is clear and the investment is aligned, early-stage brands can be exceptional partners. We evaluate fit first.",
                },
                {
                  q: "Can I start with a smaller scope and grow?",
                  a: "Yes. Many long-term partnerships begin with a focused website or brand engagement. KXD is built for brands that plan to grow.",
                },
                {
                  q: "Do you offer payment plans?",
                  a: "Yes. Most projects are structured around milestone payments aligned with major delivery phases.",
                },
                {
                  q: "What if I'm unsure of my budget?",
                  a: "Submit an application and describe your goals. We'll recommend the scope that makes sense — not the most expensive option.",
                },
                {
                  q: "How long do projects take?",
                  a: "Luxury websites: typically 3–6 weeks. Growth infrastructure: 6–12 weeks. Enterprise platforms: scoped per project. Timelines are defined in the proposal.",
                },
              ].map((item, i, arr) => (
                <div
                  key={item.q}
                  className="py-7"
                  style={{
                    borderTop: "1px solid var(--kxd-border-white)",
                    ...(i === arr.length - 1
                      ? { borderBottom: "1px solid var(--kxd-border-white)" }
                      : {}),
                  }}
                >
                  <p
                    className="font-serif font-light"
                    style={{
                      fontSize: "clamp(1rem, 1.5vw, 1.1875rem)",
                      letterSpacing: "0.005em",
                      color: "var(--kxd-cream)",
                    }}
                  >
                    {item.q}
                  </p>
                  <p className="kxd-body-sm mt-3" style={{ maxWidth: "38rem" }}>
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <FinalCtaBand
        headline="Let's Build What's Next."
        subCopy="KXD partners with a limited number of businesses each year to create exceptional digital experiences, operational systems, and growth infrastructure built with intention."
        secondaryHref="/work"
        secondaryLabel="Explore Our Work"
      />
    </>
  );
}