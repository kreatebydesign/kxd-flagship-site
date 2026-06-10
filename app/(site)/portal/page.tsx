import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Client Portal",
  description: "KXD client portal — project overview, milestones, and team communication.",
  path: "/portal",
  noIndex: true,
});

// ── Placeholder Data ──────────────────────────────────────────────────────────

const ACTIVE_PROJECTS = [
  {
    id: "primal-001",
    client: "Primal Motorsports",
    project: "Platform Development & CRM",
    phase: "Development",
    phaseNumber: 4,
    totalPhases: 6,
    lead: "Matt Kreate",
    dueDate: "Aug 15, 2026",
    daysRemaining: 67,
    health: "on-track" as const,
    tags: ["Motorsports OS", "Brand", "CRM"],
  },
  {
    id: "heritage-001",
    client: "Heritage Home Co.",
    project: "Brand Identity & Luxury Website",
    phase: "Design",
    phaseNumber: 3,
    totalPhases: 6,
    lead: "Matt Kreate",
    dueDate: "Jul 30, 2026",
    daysRemaining: 51,
    health: "on-track" as const,
    tags: ["Luxury Website", "Brand Systems"],
  },
] as const;

const MILESTONES = [
  {
    id: "m1",
    title: "Design Review — Round 1",
    project: "Primal Motorsports",
    date: "Jun 18, 2026",
    daysUntil: 9,
    type: "review" as const,
  },
  {
    id: "m2",
    title: "Brand Presentation",
    project: "Heritage Home Co.",
    date: "Jun 22, 2026",
    daysUntil: 13,
    type: "presentation" as const,
  },
  {
    id: "m3",
    title: "Development Handoff",
    project: "Primal Motorsports",
    date: "Jul 5, 2026",
    daysUntil: 26,
    type: "handoff" as const,
  },
  {
    id: "m4",
    title: "Content Delivery Deadline",
    project: "Heritage Home Co.",
    date: "Jul 10, 2026",
    daysUntil: 31,
    type: "deadline" as const,
  },
] as const;

const ACTIVITY = [
  {
    id: "a1",
    action: "3 design assets uploaded to shared workspace",
    project: "Primal Motorsports",
    actor: "Matt Kreate",
    time: "2 hours ago",
    type: "upload" as const,
  },
  {
    id: "a2",
    action: "Discovery call completed — notes shared",
    project: "Heritage Home Co.",
    actor: "KXD Team",
    time: "Yesterday",
    type: "call" as const,
  },
  {
    id: "a3",
    action: "Brand strategy document approved",
    project: "Primal Motorsports",
    actor: "Client",
    time: "Jun 7",
    type: "approval" as const,
  },
  {
    id: "a4",
    action: "Project agreement signed",
    project: "Heritage Home Co.",
    actor: "Client",
    time: "Jun 5",
    type: "milestone" as const,
  },
  {
    id: "a5",
    action: "Kickoff meeting scheduled — Jun 10 at 10am",
    project: "Primal Motorsports",
    actor: "KXD Team",
    time: "Jun 3",
    type: "schedule" as const,
  },
] as const;

const QUICK_ACTIONS = [
  { label: "Begin Onboarding",  href: "/portal/onboarding", primary: true },
  { label: "Start a Project",   href: "/start-project",     primary: false },
  { label: "View Case Studies", href: "/work",              primary: false },
  { label: "Contact KXD",       href: "/contact",           primary: false },
] as const;

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        background: "var(--kxd-black-elevated)",
        border: "1px solid var(--kxd-border-white)",
        padding: "1.5rem 1.75rem",
      }}
    >
      <p
        className="font-sans uppercase"
        style={{ fontSize: "0.5rem", letterSpacing: "0.14em", color: "rgba(255,255,255,0.3)" }}
      >
        {label}
      </p>
      <p
        className="mt-2 font-serif font-light leading-none"
        style={{ fontSize: "clamp(2rem, 3.5vw, 2.5rem)", color: "var(--kxd-cream)" }}
      >
        {value}
      </p>
      {sub && (
        <p
          className="mt-1 font-sans font-light"
          style={{ fontSize: "0.625rem", letterSpacing: "0.06em", color: "rgba(255,255,255,0.3)" }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function PhaseBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            height: "2px",
            flex: 1,
            background: i < current ? "var(--kxd-gold)" : "rgba(255,255,255,0.08)",
            transition: "background 200ms",
          }}
        />
      ))}
    </div>
  );
}

function HealthBadge({ health }: { health: "on-track" | "at-risk" | "blocked" }) {
  const cfg = {
    "on-track": { label: "On Track",  color: "rgba(94,198,140,0.9)", bg: "rgba(94,198,140,0.08)" },
    "at-risk":  { label: "At Risk",   color: "rgba(240,190,80,0.9)",  bg: "rgba(240,190,80,0.08)" },
    "blocked":  { label: "Blocked",   color: "rgba(210,90,90,0.9)",   bg: "rgba(210,90,90,0.08)" },
  }[health];

  return (
    <span
      className="font-sans uppercase"
      style={{
        fontSize: "0.4375rem",
        letterSpacing: "0.12em",
        color: cfg.color,
        background: cfg.bg,
        padding: "0.2rem 0.6rem",
        border: `1px solid ${cfg.color}40`,
      }}
    >
      {cfg.label}
    </span>
  );
}

const MILESTONE_ICONS = {
  review:       "◈",
  presentation: "◇",
  handoff:      "→",
  deadline:     "◆",
} as const;

const ACTIVITY_ICONS = {
  upload:    "↑",
  call:      "◎",
  approval:  "✓",
  milestone: "◆",
  schedule:  "◇",
} as const;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PortalPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div style={{ background: "var(--kxd-black-base)", minHeight: "100vh" }}>

      {/* ── Portal Header ──────────────────────────────────────────────────── */}
      <div
        style={{
          paddingTop: "calc(var(--nav-height) + 2.5rem)",
          paddingBottom: "2.5rem",
          background: "var(--kxd-black-pure)",
          borderBottom: "1px solid var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <p
                  className="kxd-eyebrow"
                  style={{ opacity: 0.55 }}
                >
                  KXD OS
                </p>
                <span
                  className="font-sans uppercase"
                  style={{
                    fontSize: "0.4375rem",
                    letterSpacing: "0.14em",
                    color: "rgba(94,198,140,0.8)",
                    background: "rgba(94,198,140,0.07)",
                    border: "1px solid rgba(94,198,140,0.2)",
                    padding: "0.2rem 0.65rem",
                  }}
                >
                  Phase 1 — Active
                </span>
              </div>
              <h1
                className="mt-3 font-serif font-light"
                style={{
                  fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                  color: "var(--kxd-cream)",
                  lineHeight: 1.1,
                }}
              >
                Welcome back.
              </h1>
              <p
                className="mt-2 font-sans font-light"
                style={{
                  fontSize: "0.8125rem",
                  color: "rgba(255,255,255,0.3)",
                  letterSpacing: "0.04em",
                }}
              >
                {today}
              </p>
            </div>

            <Link
              href="/portal/onboarding"
              className="kxd-btn-primary self-start sm:self-auto"
              style={{ whiteSpace: "nowrap" }}
            >
              Complete Onboarding →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats Strip ────────────────────────────────────────────────────── */}
      <div
        style={{
          borderBottom: "1px solid var(--kxd-border-white)",
          background: "var(--kxd-black-pure)",
        }}
      >
        <div className="kxd-container">
          <div
            className="grid grid-cols-2 gap-px lg:grid-cols-4"
            style={{ background: "var(--kxd-border-white)" }}
          >
            <StatCard label="Active Projects"       value="2"  sub="In delivery" />
            <StatCard label="Upcoming Milestones"   value="4"  sub="Next 30 days" />
            <StatCard label="Days to Next Launch"   value="51" sub="Heritage Home Co." />
            <StatCard label="Proposals Outstanding" value="1"  sub="Pending review" />
          </div>
        </div>
      </div>

      {/* ── Main Grid ──────────────────────────────────────────────────────── */}
      <div className="kxd-container py-10 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:gap-10">

          {/* ── Left Column ──────────────────────────────────────────────── */}
          <div className="space-y-8">

            {/* Active Projects */}
            <section>
              <div className="mb-5 flex items-center justify-between">
                <p
                  className="font-sans uppercase"
                  style={{ fontSize: "0.5625rem", letterSpacing: "0.14em", color: "var(--kxd-gold)", opacity: 0.75 }}
                >
                  Active Projects
                </p>
                <p
                  className="font-sans"
                  style={{ fontSize: "0.5625rem", letterSpacing: "0.08em", color: "rgba(255,255,255,0.2)" }}
                >
                  {ACTIVE_PROJECTS.length} in delivery
                </p>
              </div>

              <div className="space-y-px">
                {ACTIVE_PROJECTS.map((project) => (
                  <div
                    key={project.id}
                    style={{
                      background: "var(--kxd-black-elevated)",
                      border: "1px solid var(--kxd-border-white)",
                      padding: "1.5rem 1.75rem",
                    }}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3
                            className="font-serif font-light"
                            style={{
                              fontSize: "clamp(1rem, 1.5vw, 1.125rem)",
                              color: "var(--kxd-cream)",
                              lineHeight: 1.2,
                            }}
                          >
                            {project.client}
                          </h3>
                          <HealthBadge health={project.health} />
                        </div>
                        <p
                          className="mt-1 font-sans font-light"
                          style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.02em" }}
                        >
                          {project.project}
                        </p>

                        {/* Tags */}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {project.tags.map((tag) => (
                            <span
                              key={tag}
                              className="font-sans"
                              style={{
                                fontSize: "0.4375rem",
                                letterSpacing: "0.1em",
                                color: "rgba(255,255,255,0.3)",
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.07)",
                                padding: "0.2rem 0.6rem",
                                textTransform: "uppercase",
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-left sm:text-right" style={{ minWidth: "8rem" }}>
                        <p
                          className="font-sans uppercase"
                          style={{ fontSize: "0.4375rem", letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)" }}
                        >
                          Current Phase
                        </p>
                        <p
                          className="mt-1 font-serif font-light"
                          style={{ fontSize: "1.125rem", color: "var(--kxd-gold)", lineHeight: 1.2 }}
                        >
                          {project.phase}
                        </p>
                        <p
                          className="mt-0.5 font-sans"
                          style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em" }}
                        >
                          {project.phaseNumber} of {project.totalPhases}
                        </p>
                      </div>
                    </div>

                    {/* Phase progress bar */}
                    <div className="mt-5">
                      <PhaseBar current={project.phaseNumber} total={project.totalPhases} />
                      <div className="mt-2 flex justify-between">
                        <p
                          className="font-sans"
                          style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em" }}
                        >
                          Discovery · Strategy · Design · Development · Launch · Growth
                        </p>
                        <p
                          className="font-sans"
                          style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}
                        >
                          Due {project.dueDate}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Upcoming Milestones */}
            <section>
              <p
                className="mb-5 font-sans uppercase"
                style={{ fontSize: "0.5625rem", letterSpacing: "0.14em", color: "var(--kxd-gold)", opacity: 0.75 }}
              >
                Upcoming Milestones
              </p>

              <div
                style={{
                  background: "var(--kxd-black-elevated)",
                  border: "1px solid var(--kxd-border-white)",
                }}
              >
                {MILESTONES.map((milestone, i) => (
                  <div
                    key={milestone.id}
                    className="flex items-center gap-5"
                    style={{
                      padding: "1.125rem 1.5rem",
                      borderBottom: i < MILESTONES.length - 1 ? "1px solid var(--kxd-border-white)" : "none",
                    }}
                  >
                    {/* Icon */}
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center font-serif text-[0.625rem]"
                      style={{
                        background: "rgba(197,166,92,0.06)",
                        border: "1px solid var(--kxd-border-gold)",
                        color: "var(--kxd-gold)",
                      }}
                    >
                      {MILESTONE_ICONS[milestone.type]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className="font-sans font-light truncate"
                        style={{ fontSize: "0.875rem", color: "var(--kxd-cream)", letterSpacing: "0.01em" }}
                      >
                        {milestone.title}
                      </p>
                      <p
                        className="mt-0.5 font-sans font-light"
                        style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.3)" }}
                      >
                        {milestone.project}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p
                        className="font-sans"
                        style={{ fontSize: "0.6875rem", color: "var(--kxd-cream-muted)", letterSpacing: "0.04em" }}
                      >
                        {milestone.date}
                      </p>
                      <p
                        className="mt-0.5 font-sans"
                        style={{
                          fontSize: "0.5rem",
                          letterSpacing: "0.08em",
                          color: milestone.daysUntil <= 14 ? "rgba(240,190,80,0.7)" : "rgba(255,255,255,0.25)",
                        }}
                      >
                        in {milestone.daysUntil}d
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ── Right Column ─────────────────────────────────────────────── */}
          <div className="space-y-8">

            {/* Quick Actions */}
            <section>
              <p
                className="mb-5 font-sans uppercase"
                style={{ fontSize: "0.5625rem", letterSpacing: "0.14em", color: "var(--kxd-gold)", opacity: 0.75 }}
              >
                Quick Actions
              </p>

              <div className="space-y-2">
                {QUICK_ACTIONS.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group flex w-full items-center justify-between px-5 py-4 transition-colors"
                    style={{
                      background: action.primary ? "rgba(197,166,92,0.07)" : "var(--kxd-black-elevated)",
                      border: `1px solid ${action.primary ? "var(--kxd-border-gold)" : "var(--kxd-border-white)"}`,
                      textDecoration: "none",
                    }}
                  >
                    <span
                      className="font-sans font-medium uppercase"
                      style={{
                        fontSize: "0.625rem",
                        letterSpacing: "0.12em",
                        color: action.primary ? "var(--kxd-gold)" : "var(--kxd-cream-muted)",
                      }}
                    >
                      {action.label}
                    </span>
                    <span
                      aria-hidden
                      className="transition-transform duration-200 group-hover:translate-x-1"
                      style={{ color: action.primary ? "var(--kxd-gold)" : "rgba(255,255,255,0.2)", fontSize: "0.75rem" }}
                    >
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Recent Activity */}
            <section>
              <p
                className="mb-5 font-sans uppercase"
                style={{ fontSize: "0.5625rem", letterSpacing: "0.14em", color: "var(--kxd-gold)", opacity: 0.75 }}
              >
                Recent Activity
              </p>

              <div
                style={{
                  background: "var(--kxd-black-elevated)",
                  border: "1px solid var(--kxd-border-white)",
                }}
              >
                {ACTIVITY.map((item, i) => (
                  <div
                    key={item.id}
                    className="flex gap-4"
                    style={{
                      padding: "1rem 1.25rem",
                      borderBottom: i < ACTIVITY.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    }}
                  >
                    {/* Icon dot */}
                    <div className="flex flex-col items-center gap-1 pt-0.5">
                      <div
                        className="flex h-5 w-5 shrink-0 items-center justify-center font-serif"
                        style={{
                          fontSize: "0.4375rem",
                          color: "var(--kxd-gold)",
                          opacity: 0.6,
                          background: "rgba(197,166,92,0.06)",
                          border: "1px solid rgba(197,166,92,0.15)",
                          borderRadius: "50%",
                        }}
                      >
                        {ACTIVITY_ICONS[item.type]}
                      </div>
                      {i < ACTIVITY.length - 1 && (
                        <div
                          style={{
                            width: "1px",
                            flex: 1,
                            minHeight: "1.5rem",
                            background: "rgba(255,255,255,0.04)",
                          }}
                        />
                      )}
                    </div>

                    <div className="pb-2">
                      <p
                        className="font-sans font-light leading-snug"
                        style={{ fontSize: "0.8125rem", color: "var(--kxd-cream-muted)" }}
                      >
                        {item.action}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <p
                          className="font-sans"
                          style={{
                            fontSize: "0.5625rem",
                            letterSpacing: "0.06em",
                            color: "rgba(255,255,255,0.25)",
                          }}
                        >
                          {item.project}
                        </p>
                        <span style={{ color: "rgba(255,255,255,0.12)", fontSize: "0.4375rem" }}>·</span>
                        <p
                          className="font-sans"
                          style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.2)" }}
                        >
                          {item.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ── Portal Footer ──────────────────────────────────────────────────── */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.04)",
          padding: "1.5rem 0",
          background: "var(--kxd-black-pure)",
        }}
      >
        <div className="kxd-container flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p
            className="font-sans"
            style={{ fontSize: "0.5625rem", letterSpacing: "0.1em", color: "rgba(255,255,255,0.18)" }}
          >
            KXD OS · Phase 1 · Client Portal · Placeholder data — live integration in Phase 2
          </p>
          <Link
            href="/contact"
            className="font-sans uppercase"
            style={{ fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--kxd-gold)", opacity: 0.55 }}
          >
            Contact KXD →
          </Link>
        </div>
      </div>
    </div>
  );
}
