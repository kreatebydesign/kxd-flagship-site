import Link from "next/link";

export function FounderStandard() {
  return (
    <section
      className="kxd-section border-t"
      style={{
        background: "var(--kxd-black-deep)",
        borderColor: "var(--kxd-border-gold)",
      }}
    >
      <div className="kxd-container">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.6fr] lg:gap-20 lg:items-center">

          {/* Left */}
          <div>
            <p className="kxd-eyebrow">The Standard</p>
            <h2
              className="kxd-serif-title mt-5"
              style={{
                fontSize: "clamp(2rem, 4vw, 3rem)",
                lineHeight: 1.06,
              }}
            >
              Founder-led.
              <br />
              <span style={{ color: "var(--kxd-gold)" }}>Built with discipline.</span>
            </h2>

            <div
              aria-hidden
              className="mt-9 h-px"
              style={{ width: "3rem", background: "var(--kxd-border-gold-strong)" }}
            />

            <Link
              href="/about"
              className="kxd-ui-label mt-8 inline-flex items-center gap-2.5 text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
            >
              About KXD
              <span aria-hidden>→</span>
            </Link>
          </div>

          {/* Right */}
          <div
            className="border-l pl-10 lg:pl-14"
            style={{ borderColor: "var(--kxd-border-white)" }}
          >
            <p
              className="font-serif font-light leading-[1.72]"
              style={{
                fontSize: "clamp(1.125rem, 1.8vw, 1.25rem)",
                letterSpacing: "0.005em",
                color: "var(--kxd-cream-soft)",
              }}
            >
              KXD is selective by design. Every project receives direct strategy,
              sharper decisions, and execution designed to hold weight long after launch.
            </p>

            <div
              className="mt-10 grid grid-cols-3 gap-6 border-t pt-10"
              style={{ borderColor: "var(--kxd-border-white)" }}
            >
              {[
                { number: "100%", label: "Founder-led" },
                { number: "5+",   label: "Years active" },
                { number: "Direct", label: "Partnership" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p
                    className="font-serif font-light"
                    style={{ fontSize: "1.875rem", lineHeight: 1, color: "var(--kxd-gold)" }}
                  >
                    {stat.number}
                  </p>
                  <p className="kxd-label mt-2.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
