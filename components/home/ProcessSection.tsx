import Link from "next/link";

const STEPS = [
  {
    number: "01",
    title: "Diagnose",
    body: "We uncover what is holding the brand back — positioning gaps, operational friction, weak conversion paths, scattered systems, or unclear digital strategy.",
  },
  {
    number: "02",
    title: "Architect",
    body: "We define the strategy, experience structure, content hierarchy, and operational blueprint before design or development begins.",
  },
  {
    number: "03",
    title: "Build",
    body: "We execute with precision across design, development, CMS, automation, and infrastructure — with senior-level oversight from start to launch.",
  },
  {
    number: "04",
    title: "Evolve",
    body: "We refine, optimize, and expand the foundation over time so the work continues creating momentum beyond launch.",
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
        <div className="mb-16 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="kxd-eyebrow">Operating Discipline</p>
            <h2
              className="kxd-serif-title mt-4"
              style={{
                fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
                maxWidth: "30rem",
              }}
            >
              A process built to create clarity, momentum, and lasting value.
            </h2>

            <p
              className="kxd-body-sm mt-5"
              style={{
                maxWidth: "38rem",
                lineHeight: 1.85,
              }}
            >
              KXD engagements are designed to move with intention — from strategic
              diagnosis to launch-ready execution and long-term operational growth.
            </p>
          </div>

          <Link
            href="/investment"
            className="kxd-ui-label inline-flex items-center gap-2 self-end text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
          >
            View Investment Levels
            <span
              aria-hidden
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </div>

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

              <h3
                className="kxd-serif-title mt-5"
                style={{ fontSize: "clamp(1.125rem, 1.8vw, 1.375rem)" }}
              >
                {step.title}
              </h3>

              <div
                aria-hidden
                className="mt-4"
                style={{
                  width: "2rem",
                  height: "1px",
                  background: "var(--kxd-border-gold-strong)",
                }}
              />

              <p className="kxd-body-sm mt-4 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>

        <div
          className="mt-14 border-l pl-6"
          style={{
            borderColor: "var(--kxd-border-gold)",
          }}
        >
          <p
            className="font-serif font-light italic"
            style={{
              fontSize: "clamp(1rem, 1.5vw, 1.1875rem)",
              lineHeight: 1.75,
              letterSpacing: "0.01em",
              color: "var(--kxd-cream-soft)",
              maxWidth: "42rem",
            }}
          >
            The goal is not simply to launch something beautiful. The goal is to
            build a foundation your business can actually grow through.
          </p>
        </div>
      </div>
    </section>
  );
}