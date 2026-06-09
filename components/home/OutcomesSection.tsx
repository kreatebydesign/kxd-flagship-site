import Link from "next/link";

const OUTCOMES = [
  {
    category: "Motorsports",
    result:
      "Unified digital infrastructure for competitive motorsports — combining public brand presence, driver portals, CRM architecture, and operational systems into one connected ecosystem.",
  },
  {
    category: "Hospitality",
    result:
      "Premium hospitality experiences built to increase trust before the first inquiry — aligning brand perception, guest expectation, and operational readiness from the first click.",
  },
  {
    category: "Automotive",
    result:
      "Brand-forward digital experiences that qualify opportunities before the first conversation — turning craftsmanship, trust, and positioning into a stronger sales filter.",
  },
  {
    category: "Growth Infrastructure",
    result:
      "Scalable growth systems that connect website, inquiry architecture, CRM workflows, and operational tooling — giving businesses a cleaner foundation to grow without unnecessary overhead.",
  },
] as const;

export function OutcomesSection() {
  return (
    <section
      className="kxd-section border-t"
      style={{
        background: "var(--kxd-black-pure)",
        borderColor: "var(--kxd-border-white)",
      }}
    >
      <div className="kxd-container">
        <div className="mb-14 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="kxd-eyebrow">Results</p>

            <h2
              className="kxd-serif-title mt-4"
              style={{
                fontSize: "clamp(1.875rem, 3.5vw, 2.5rem)",
              }}
            >
              Outcomes built beyond launch.
            </h2>

            <p
              className="kxd-body-sm mt-5"
              style={{ maxWidth: "36rem" }}
            >
              KXD measures success by what the work enables: stronger perception,
              cleaner operations, better-qualified opportunities, and systems that
              continue creating value after launch.
            </p>
          </div>

          <Link
            href="/work"
            className="kxd-ui-label self-end inline-flex items-center gap-2 text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
          >
            Explore Case Studies
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="kxd-gold-rule" />

        <div>
          {OUTCOMES.map((outcome, i) => (
            <div
              key={outcome.category}
              className="grid gap-6 py-8 lg:grid-cols-[10rem_1fr]"
              style={{
                borderTop:
                  i === 0 ? "none" : "1px solid var(--kxd-border-white)",
              }}
            >
              <div className="lg:pt-0.5">
                <p
                  className="font-sans font-medium uppercase"
                  style={{
                    fontSize: "0.5625rem",
                    letterSpacing: "0.16em",
                    color: "var(--kxd-gold)",
                  }}
                >
                  {outcome.category}
                </p>
              </div>

              <div
                className="border-l pl-8"
                style={{ borderColor: "var(--kxd-border-gold)" }}
              >
                <p
                  className="font-serif font-light leading-[1.72]"
                  style={{
                    fontSize: "clamp(1rem, 1.6vw, 1.1875rem)",
                    letterSpacing: "0.005em",
                    color: "var(--kxd-cream-soft)",
                    maxWidth: "52rem",
                  }}
                >
                  {outcome.result}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-8 border-t pt-8"
          style={{ borderColor: "var(--kxd-border-white)" }}
        >
          <p
            className="font-serif font-light italic"
            style={{
              fontSize: "clamp(0.875rem, 1.3vw, 1rem)",
              letterSpacing: "0.01em",
              color: "var(--foreground-subtle)",
              maxWidth: "44rem",
            }}
          >
            KXD does not manufacture vanity metrics. We focus on the outcomes
            that matter: perception, trust, workflow, conversion quality, and the
            long-term strength of the system behind the brand.
          </p>
        </div>
      </div>
    </section>
  );
}