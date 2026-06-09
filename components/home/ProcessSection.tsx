import Link from "next/link";

const STEPS = [
  {
    number: "01",
    title: "Discover",
    body: "Understand goals, opportunities, and positioning. Every engagement begins with the right questions — not assumptions.",
  },
  {
    number: "02",
    title: "Define",
    body: "Clarify strategy, experience architecture, and priorities. The blueprint before the build.",
  },
  {
    number: "03",
    title: "Build",
    body: "Execute with precision and intention. Direct strategy and senior-level execution throughout — no handoffs.",
  },
  {
    number: "04",
    title: "Refine",
    body: "Launch, optimize, and evolve. The work doesn't end at go-live — it holds weight long after.",
  },
] as const;

export function ProcessSection() {
  return (
    <section
      className="kxd-section border-t"
      style={{
        background: "var(--kxd-black-deep)",
        borderColor: "var(--kxd-border-gold)",
      }}
    >
      <div className="kxd-container">
        {/* Header */}
        <div className="mb-16 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="kxd-eyebrow">How We Work</p>
            <h2
              className="kxd-serif-title mt-4"
              style={{ fontSize: "clamp(1.875rem, 3.5vw, 2.5rem)", maxWidth: "28rem" }}
            >
              A process built around clarity.
            </h2>
          </div>
          <Link
            href="/investment"
            className="kxd-ui-label self-end inline-flex items-center gap-2 text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
          >
            View Investment Levels
            <span aria-hidden>→</span>
          </Link>
        </div>

        {/* Steps */}
        <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div
              key={step.number}
              className="py-8 pr-6"
              style={{
                borderTop: "1px solid var(--kxd-border-gold)",
                ...(i < STEPS.length - 1
                  ? { borderRight: "1px solid var(--kxd-border-white)" }
                  : {}),
              }}
            >
              {/* Number */}
              <p
                className="font-serif font-light"
                style={{
                  fontSize: "2.25rem",
                  lineHeight: 1,
                  color: "var(--kxd-border-gold-strong)",
                  letterSpacing: "0.06em",
                }}
              >
                {step.number}
              </p>

              {/* Title */}
              <h3
                className="kxd-serif-title mt-5"
                style={{ fontSize: "clamp(1.125rem, 1.8vw, 1.375rem)" }}
              >
                {step.title}
              </h3>

              {/* Hairline */}
              <div
                aria-hidden
                className="mt-4"
                style={{
                  width: "2rem",
                  height: "1px",
                  background: "var(--kxd-border-gold-strong)",
                }}
              />

              {/* Body */}
              <p className="kxd-body-sm mt-4 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
