import Link from "next/link";
import { PROCESS_EXECUTION_VISUAL } from "@/lib/homepage/work-visuals";
import { EditorialWorkFrame } from "./EditorialWorkFrame";

const STEPS = [
  {
    number: "01",
    title: "Discovery",
    body: "We learn how the business works, where the site or tools fall short, and what success should look like before design begins.",
  },
  {
    number: "02",
    title: "Architecture",
    body: "We define strategy, site structure, content hierarchy, and technical approach so design and development move with purpose.",
  },
  {
    number: "03",
    title: "Build",
    body: "Design and development move through defined phases with founder oversight, clear approvals, and measurement ready at launch.",
  },
  {
    number: "04",
    title: "Refinement",
    body: "We tune what real visitors and teams reveal after launch, then expand thoughtfully when the business is ready for the next layer.",
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
            <p className="kxd-eyebrow">Production Framework</p>
            <h2
              className="kxd-serif-title mt-4"
              style={{
                fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
                maxWidth: "30rem",
              }}
            >
              How engagements run, from first conversation through launch.
            </h2>

            <p
              className="kxd-body-sm mt-5"
              style={{
                maxWidth: "38rem",
                lineHeight: 1.85,
              }}
            >
              Every KXD project moves through discovery, architecture, build, and
              refinement. Deliberate pace, direct communication, and craft that
              holds up after launch.
            </p>
          </div>

          <Link
            href="/investment"
            className="kxd-ui-label inline-flex items-center gap-2 self-end text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
          >
            Working Together
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

        <div className="mt-14">
          <EditorialWorkFrame
            src={PROCESS_EXECUTION_VISUAL.src}
            alt={PROCESS_EXECUTION_VISUAL.alt}
            href={PROCESS_EXECUTION_VISUAL.href}
            label={PROCESS_EXECUTION_VISUAL.label}
            objectPosition={PROCESS_EXECUTION_VISUAL.objectPosition}
            aspectClass="aspect-[16/10] sm:aspect-[21/9]"
            sizes="(max-width: 768px) 100vw, 90vw"
            reveal
          />
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
            The goal is not to ship a project. The goal is to install a system
            your brand can operate, scale, and grow through indefinitely.
          </p>
        </div>
      </div>
    </section>
  );
}
