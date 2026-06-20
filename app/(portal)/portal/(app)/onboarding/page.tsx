import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo/metadata";
import { AssetChecklist } from "@/components/portal/AssetChecklist";
import { FinalCtaBand } from "@/components/ui/FinalCtaBand";

export const metadata: Metadata = buildMetadata({
  title: "Client Onboarding",
  description: "Begin your KXD engagement. Discovery questionnaire, brand inputs, asset collection, and team introductions.",
  path: "/portal/onboarding",
  noIndex: true,
});

// ── Data ─────────────────────────────────────────────────────────────────────

const PROCESS_PHASES = [
  { number: "01", title: "Discovery",    duration: "Weeks 1–2",  description: "We study your business, market, and audience before forming any opinions about design or direction." },
  { number: "02", title: "Strategy",     duration: "Weeks 2–3",  description: "Positioning, messaging, site architecture, and the specific outcomes each deliverable is designed to produce." },
  { number: "03", title: "Design",       duration: "Weeks 3–6",  description: "Visual direction, component design, and the full interface crafted to reflect your brand with precision." },
  { number: "04", title: "Development",  duration: "Weeks 6–10", description: "Built for performance, scalability, and brand integrity. Every technical decision made with the long term in mind." },
  { number: "05", title: "Launch",       duration: "Weeks 10–12",description: "Meticulous QA, pre-launch review, and a coordinated go-live process. Nothing ships before it's ready." },
  { number: "06", title: "Growth",       duration: "Ongoing",    description: "Post-launch support, performance monitoring, and strategic refinement as your business evolves." },
] as const;

const TEAM = [
  {
    initials: "MK",
    name: "Matt Kreate",
    role: "Founder & Creative Lead",
    description:
      "Every KXD engagement is personally led by Matt. He handles strategy, creative direction, and client communication — ensuring nothing gets lost in translation between vision and execution.",
  },
  {
    initials: "DS",
    name: "Design Studio",
    role: "Visual Design",
    description:
      "A selective network of senior designers who work within the KXD system. Chosen project by project based on category expertise and aesthetic alignment.",
  },
  {
    initials: "DL",
    name: "Dev Lab",
    role: "Engineering",
    description:
      "Development specialists for performance-critical builds, platform architecture, and operational system development. High standards enforced by strict KXD quality gates.",
  },
  {
    initials: "SA",
    name: "Strategy & Content",
    role: "Brand Strategy",
    description:
      "Strategic advisors for complex brand positioning and content architecture projects. Engaged when a project's depth demands dedicated strategic resource.",
  },
] as const;

const DISCOVERY_QUESTIONS = [
  {
    id: "dq1",
    question: "What is the primary business goal for this project?",
    placeholder: "e.g. Increase qualified leads, establish premium positioning, launch a new product line…",
    rows: 3,
  },
  {
    id: "dq2",
    question: "Describe your ideal client or customer in as much detail as possible.",
    placeholder: "Demographics, psychographics, buying behavior, what they value, what they're moving away from…",
    rows: 4,
  },
  {
    id: "dq3",
    question: "Who are your main competitors, and what do they do well?",
    placeholder: "List 3–5 competitors and what you believe their strengths are digitally or brand-wise…",
    rows: 3,
  },
  {
    id: "dq4",
    question: "What does success look like for this project 12 months from now?",
    placeholder: "Be as specific as possible — revenue targets, awareness, systems efficiency, client quality…",
    rows: 3,
  },
  {
    id: "dq5",
    question: "What has held your brand back digitally until now?",
    placeholder: "Resource constraints, unclear positioning, poor execution, wrong partners, outdated infrastructure…",
    rows: 3,
  },
] as const;

const BRAND_QUESTIONS = [
  {
    id: "bq1",
    question: "Describe your brand in three words.",
    placeholder: "e.g. Precise, refined, authoritative — or — warm, accessible, community-driven…",
    rows: 2,
  },
  {
    id: "bq2",
    question: "What brand attributes are most important to preserve or develop?",
    placeholder: "Think about tone, visual character, the feeling your brand should create in people…",
    rows: 3,
  },
  {
    id: "bq3",
    question: "Share 3 brands (inside or outside your industry) whose visual identity you admire.",
    placeholder: "Include what specifically you admire — is it the restraint, the color work, the typography, the copywriting?",
    rows: 3,
  },
  {
    id: "bq4",
    question: "What should your brand never feel like or be associated with?",
    placeholder: "Aesthetics to avoid, tones that feel wrong, competitors you don't want to be compared to…",
    rows: 3,
  },
  {
    id: "bq5",
    question: "Are you building on an existing visual identity, or starting fresh?",
    placeholder: "Describe what exists, what you're proud of, what needs to change, or what the starting state is…",
    rows: 3,
  },
] as const;

const NEXT_STEPS = [
  { number: "01", action: "Complete the discovery and brand questionnaires on this page", detail: "Takes approximately 20–30 minutes. There are no wrong answers — depth and honesty are what matter." },
  { number: "02", action: "Gather and confirm your asset inventory", detail: "Use the checklist below. Incomplete assets are normal — we'll identify gaps together." },
  { number: "03", action: "Schedule your discovery call", detail: "A 60–90 minute conversation with Matt to discuss your inputs and align on approach. Booked via email." },
  { number: "04", action: "Receive your strategy brief", detail: "Within 5 business days of the discovery call, KXD delivers a brief that sets the direction for the entire engagement." },
] as const;

// ── Shared field styling ──────────────────────────────────────────────────────

const fieldStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.02)",
  border: "none",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  padding: "0.875rem 0",
  color: "var(--kxd-cream)",
  fontFamily: "var(--font-sans)",
  fontWeight: 300,
  fontSize: "clamp(0.9375rem, 1.2vw, 1rem)",
  lineHeight: 1.7,
  resize: "vertical" as const,
  outline: "none",
};

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  number,
  title,
  subtitle,
  children,
  alternate,
}: {
  number: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  alternate?: boolean;
}) {
  return (
    <section
      style={{
        background: alternate ? "var(--kxd-black-elevated)" : "var(--kxd-black-base)",
        borderBottom: "1px solid var(--kxd-border-white)",
        padding: "clamp(3.5rem,7vw,5.5rem) 0",
      }}
    >
      <div className="kxd-container">
        <div className="grid gap-12 lg:grid-cols-[14rem_1fr] lg:gap-16">
          {/* Label column */}
          <div>
            <p
              aria-hidden
              className="font-serif font-light leading-none"
              style={{ fontSize: "3.5rem", color: "var(--kxd-gold)", opacity: 0.1 }}
            >
              {number}
            </p>
            <h2
              className="mt-3 font-serif font-light"
              style={{
                fontSize: "clamp(1.25rem, 2vw, 1.5rem)",
                color: "var(--kxd-cream)",
                lineHeight: 1.2,
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <p
                className="mt-3 font-serif font-light italic"
                style={{ fontSize: "0.9375rem", color: "var(--kxd-cream-muted)", lineHeight: 1.6 }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {/* Content column */}
          <div>{children}</div>
        </div>
      </div>
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  return (
    <div style={{ background: "var(--kxd-black-base)" }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: "calc(var(--nav-height) + var(--section-py))",
          paddingBottom: "var(--section-py)",
          background: "var(--kxd-black-pure)",
          borderBottom: "1px solid var(--kxd-border-gold)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "62rem" }}>
          <div className="flex items-center gap-3 mb-6">
            <Link
              href="/portal"
              className="kxd-label transition-opacity hover:opacity-60"
              style={{ color: "var(--kxd-cream-muted)" }}
            >
              ← Portal
            </Link>
            <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "0.5rem" }}>·</span>
            <p className="kxd-eyebrow">Client Onboarding</p>
          </div>

          {/* Ornament */}
          <div
            aria-hidden
            style={{
              width: "3rem",
              height: "1px",
              background: "linear-gradient(to right, var(--kxd-gold), transparent)",
              marginBottom: "2rem",
              opacity: 0.5,
            }}
          />

          <h1
            className="kxd-serif-title"
            style={{ fontSize: "clamp(2.25rem, 4.5vw, 3.5rem)", maxWidth: "28rem", lineHeight: 1.06 }}
          >
            Welcome to KXD.
          </h1>
          <p
            className="mt-5 font-serif font-light italic"
            style={{
              fontSize: "clamp(1.0625rem, 1.6vw, 1.25rem)",
              color: "var(--kxd-cream-soft)",
              maxWidth: "38rem",
              lineHeight: 1.7,
            }}
          >
            You&rsquo;ve made a serious decision. We take that seriously.
          </p>
          <p
            className="kxd-body mt-5"
            style={{ maxWidth: "42rem", lineHeight: 1.85 }}
          >
            This onboarding document is the foundation of everything we build
            together. Your answers shape the strategy, guide the design, and
            determine the architecture of your entire engagement with KXD.
            Take your time.
          </p>

          {/* Trust points */}
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
            {[
              "20–30 minutes to complete",
              "All responses are confidential",
              "Reviewed personally by Matt",
            ].map((point) => (
              <div key={point} className="flex items-center gap-2.5">
                <div
                  aria-hidden
                  style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--kxd-gold)", flexShrink: 0 }}
                />
                <p className="kxd-label" style={{ letterSpacing: "0.09em" }}>{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 01 The Process ──────────────────────────────────────────────────── */}
      <Section number="01" title="How We Work" subtitle="What to expect across the full engagement.">
        <div className="space-y-0">
          {PROCESS_PHASES.map((phase, i) => (
            <div
              key={phase.number}
              className="grid gap-5 py-6 sm:grid-cols-[6rem_1fr]"
              style={{
                borderBottom: i < PROCESS_PHASES.length - 1 ? "1px solid var(--kxd-border-white)" : "none",
              }}
            >
              <div className="flex items-start gap-3 sm:flex-col sm:gap-2">
                <p
                  className="font-serif font-light leading-none shrink-0"
                  style={{ fontSize: "2rem", color: "var(--kxd-gold)", opacity: 0.2 }}
                >
                  {phase.number}
                </p>
                <div>
                  <p
                    className="font-serif font-light"
                    style={{ fontSize: "1rem", color: "var(--kxd-cream)", lineHeight: 1.2 }}
                  >
                    {phase.title}
                  </p>
                  <p
                    className="mt-1 font-sans"
                    style={{ fontSize: "0.5rem", letterSpacing: "0.1em", color: "var(--kxd-gold)", opacity: 0.55 }}
                  >
                    {phase.duration}
                  </p>
                </div>
              </div>
              <p
                className="font-sans font-light leading-relaxed"
                style={{ fontSize: "0.9375rem", color: "var(--kxd-cream-muted)" }}
              >
                {phase.description}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 02 Discovery Questionnaire ──────────────────────────────────────── */}
      <Section
        number="02"
        title="Discovery"
        subtitle="Your business, your audience, and what you&rsquo;re building toward."
        alternate
      >
        <div className="space-y-8">
          {DISCOVERY_QUESTIONS.map((q) => (
            <div key={q.id}>
              <label
                htmlFor={q.id}
                className="kxd-label mb-3 block"
                style={{ letterSpacing: "0.07em", color: "var(--kxd-cream-muted)" }}
              >
                {q.question}
              </label>
              <textarea
                id={q.id}
                name={q.id}
                rows={q.rows}
                placeholder={q.placeholder}
                style={{
                  ...fieldStyle,
                  color: "var(--kxd-cream)",
                }}
                className="w-full placeholder:text-[rgba(255,255,255,0.18)] focus:border-b-[var(--kxd-gold)] transition-colors"
              />
            </div>
          ))}

          <button
            type="button"
            className="kxd-btn-primary mt-4"
            disabled
            style={{ opacity: 0.45, cursor: "not-allowed" }}
          >
            Save Responses — Coming in Phase 2
          </button>
        </div>
      </Section>

      {/* ── 03 Brand Questionnaire ──────────────────────────────────────────── */}
      <Section
        number="03"
        title="Brand"
        subtitle="Your identity, your aesthetic direction, and what you stand for."
      >
        <div className="space-y-8">
          {BRAND_QUESTIONS.map((q) => (
            <div key={q.id}>
              <label
                htmlFor={q.id}
                className="kxd-label mb-3 block"
                style={{ letterSpacing: "0.07em", color: "var(--kxd-cream-muted)" }}
              >
                {q.question}
              </label>
              <textarea
                id={q.id}
                name={q.id}
                rows={q.rows}
                placeholder={q.placeholder}
                style={fieldStyle}
                className="w-full placeholder:text-[rgba(255,255,255,0.18)] focus:border-b-[var(--kxd-gold)] transition-colors"
              />
            </div>
          ))}

          <button
            type="button"
            className="kxd-btn-primary mt-4"
            disabled
            style={{ opacity: 0.45, cursor: "not-allowed" }}
          >
            Save Responses — Coming in Phase 2
          </button>
        </div>
      </Section>

      {/* ── 04 Asset Collection ──────────────────────────────────────────────── */}
      <Section
        number="04"
        title="Asset Collection"
        subtitle="Confirm what you have. We&rsquo;ll identify what we need."
        alternate
      >
        <AssetChecklist />
      </Section>

      {/* ── 05 The Team ─────────────────────────────────────────────────────── */}
      <Section number="05" title="The Team" subtitle="The people behind your engagement.">
        <div className="grid gap-px sm:grid-cols-2" style={{ background: "var(--kxd-border-white)", border: "1px solid var(--kxd-border-white)" }}>
          {TEAM.map((member) => (
            <div
              key={member.initials}
              style={{ background: "var(--kxd-black-elevated)", padding: "1.75rem 2rem" }}
            >
              {/* Avatar */}
              <div
                className="flex h-11 w-11 items-center justify-center font-sans text-[0.625rem] font-medium uppercase mb-5"
                style={{
                  background: "rgba(197,166,92,0.07)",
                  border: "1px solid var(--kxd-border-gold)",
                  color: "var(--kxd-gold)",
                  letterSpacing: "0.1em",
                }}
              >
                {member.initials}
              </div>

              <h3
                className="font-serif font-light"
                style={{ fontSize: "1.0625rem", color: "var(--kxd-cream)", lineHeight: 1.2 }}
              >
                {member.name}
              </h3>
              <p
                className="mt-1 kxd-label"
                style={{ color: "var(--kxd-gold)", opacity: 0.7 }}
              >
                {member.role}
              </p>
              <p
                className="mt-4 font-sans font-light leading-relaxed"
                style={{ fontSize: "0.875rem", color: "var(--kxd-cream-muted)" }}
              >
                {member.description}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 06 Timeline ─────────────────────────────────────────────────────── */}
      <Section
        number="06"
        title="Your Timeline"
        subtitle="A general overview. Specific dates confirmed at strategy brief."
        alternate
      >
        <div>
          {PROCESS_PHASES.map((phase, i) => (
            <div
              key={phase.number}
              className="flex gap-5"
              style={{ paddingBottom: i < PROCESS_PHASES.length - 1 ? "0" : "0" }}
            >
              {/* Connector */}
              <div className="flex flex-col items-center gap-0" style={{ minWidth: "2.5rem" }}>
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: "var(--kxd-black-elevated)",
                    border: "1px solid var(--kxd-border-gold)",
                    flexShrink: 0,
                    marginTop: "0.2rem",
                  }}
                />
                {i < PROCESS_PHASES.length - 1 && (
                  <div
                    style={{
                      width: "1px",
                      flex: 1,
                      minHeight: "3.5rem",
                      background: "linear-gradient(to bottom, var(--kxd-border-gold), rgba(197,166,92,0.08))",
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div style={{ paddingBottom: "2.5rem" }}>
                <div className="flex items-center gap-3">
                  <p
                    className="font-serif font-light"
                    style={{ fontSize: "1.0625rem", color: "var(--kxd-cream)", lineHeight: 1.2 }}
                  >
                    {phase.title}
                  </p>
                  <p
                    className="font-sans uppercase"
                    style={{ fontSize: "0.4375rem", letterSpacing: "0.12em", color: "var(--kxd-gold)", opacity: 0.55 }}
                  >
                    {phase.duration}
                  </p>
                </div>
                <p
                  className="mt-2 font-sans font-light leading-relaxed"
                  style={{ fontSize: "0.875rem", color: "var(--kxd-cream-muted)", maxWidth: "36rem" }}
                >
                  {phase.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 07 Next Steps ────────────────────────────────────────────────────── */}
      <Section number="07" title="Next Steps" subtitle="What happens from here.">
        <div className="space-y-0">
          {NEXT_STEPS.map((step, i) => (
            <div
              key={step.number}
              className="flex gap-6 py-6"
              style={{
                borderBottom: i < NEXT_STEPS.length - 1 ? "1px solid var(--kxd-border-white)" : "none",
              }}
            >
              <p
                className="font-serif font-light leading-none shrink-0 pt-0.5"
                style={{ fontSize: "1.25rem", color: "var(--kxd-gold)", opacity: 0.25, width: "2.5rem" }}
              >
                {step.number}
              </p>
              <div>
                <p
                  className="font-serif font-light"
                  style={{ fontSize: "1rem", color: "var(--kxd-cream)", lineHeight: 1.3 }}
                >
                  {step.action}
                </p>
                <p
                  className="mt-2 font-sans font-light leading-relaxed"
                  style={{ fontSize: "0.875rem", color: "var(--kxd-cream-muted)" }}
                >
                  {step.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Final CTA ────────────────────────────────────────────────────────── */}
      <FinalCtaBand
        headline="Ready to Begin?"
        subCopy="Your project starts with a conversation. Reach out directly or return to the portal to continue."
        primaryLabel="Contact KXD"
        primaryHref="/contact"
        secondaryHref="/portal"
        secondaryLabel="Back to Portal"
      />
    </div>
  );
}
