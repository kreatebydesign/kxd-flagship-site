import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Operations · KXD",
  description: "KXD internal operations dashboard.",
  robots: { index: false, follow: false },
};

// ── Placeholder operational data ───────────────────────────────────────────

const KPI = [
  { label: "Active Projects",         value: "2",       sub: "In delivery",       delta: "+1 this quarter" },
  { label: "Discovery Calls",         value: "3",       sub: "Scheduled / pending", delta: "Next: Jun 14" },
  { label: "Proposals Outstanding",   value: "1",       sub: "Awaiting response",   delta: "Sent Jun 6" },
  { label: "Retainer Clients",        value: "0",       sub: "Monthly recurring",   delta: "Target: Q3 2026" },
  { label: "Pipeline Value",          value: "$94,500", sub: "Estimated",           delta: "3 active leads" },
  { label: "Monthly Recurring",       value: "$0",      sub: "MRR — retainer base", delta: "Building toward $8K" },
] as const;

const PIPELINE = [
  { company: "Primal Motorsports",  contact: "Tyler M.",   value: "$22,000", stage: "active",     days: 34,  services: "Platform Dev, CRM" },
  { company: "Heritage Home Co.",   contact: "Sarah K.",   value: "$18,500", stage: "active",     days: 21,  services: "Brand, Website" },
  { company: "Crestfield Capital",  contact: "James W.",   value: "$31,000", stage: "proposal",   days: 6,   services: "Enterprise System" },
  { company: "Northgate Vineyards", contact: "Maren L.",   value: "$14,000", stage: "discovery",  days: 12,  services: "Hospitality OS" },
  { company: "Apex Racing League",  contact: "Derek P.",   value: "$9,000",  stage: "reviewing",  days: 3,   services: "Motorsports OS" },
] as const;

const RECENT_LEADS = [
  { company: "Pinehurst Reserve",    email: "admin@pinehurst.co",   service: "Luxury Website", submitted: "Jun 8, 2026",  status: "new" },
  { company: "Crestfield Capital",   email: "jwaters@crestfield.com", service: "Enterprise", submitted: "Jun 6, 2026", status: "proposal" },
  { company: "Apex Racing League",   email: "d.pelton@apexrl.com", service: "Motorsports OS", submitted: "Jun 5, 2026", status: "reviewing" },
  { company: "Solace Interiors",     email: "hello@solaceinteriors.com", service: "Brand Systems", submitted: "Jun 3, 2026", status: "reviewing" },
  { company: "Northgate Vineyards",  email: "maren@northgate.wine",  service: "Hospitality OS", submitted: "May 28, 2026", status: "discovery" },
] as const;

const TASKS = [
  { id: "t1", task: "Send proposal — Crestfield Capital", priority: "high",   due: "Jun 12", project: "Crestfield" },
  { id: "t2", task: "Design review — Primal Motorsports", priority: "medium", due: "Jun 18", project: "Primal" },
  { id: "t3", task: "Discovery call prep — Northgate",    priority: "medium", due: "Jun 14", project: "Northgate" },
  { id: "t4", task: "Brand brief — Heritage Home Co.",    priority: "low",    due: "Jun 22", project: "Heritage" },
  { id: "t5", task: "Update pipeline notes — Apex Racing",priority: "low",   due: "Jun 15", project: "Apex" },
] as const;

// ── Stage styling ─────────────────────────────────────────────────────────────

const STAGE_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  new:        { label: "New",        color: "rgba(197,166,92,0.8)",   bg: "rgba(197,166,92,0.07)" },
  reviewing:  { label: "Reviewing",  color: "rgba(130,155,210,0.8)",  bg: "rgba(130,155,210,0.07)" },
  discovery:  { label: "Discovery",  color: "rgba(150,210,200,0.8)",  bg: "rgba(150,210,200,0.07)" },
  proposal:   { label: "Proposal",   color: "rgba(240,190,80,0.8)",   bg: "rgba(240,190,80,0.07)" },
  active:     { label: "Active",     color: "rgba(94,198,140,0.8)",   bg: "rgba(94,198,140,0.07)" },
  onboarding: { label: "Onboarding", color: "rgba(180,140,220,0.8)",  bg: "rgba(180,140,220,0.07)" },
  retainer:   { label: "Retainer",   color: "rgba(94,198,140,0.9)",   bg: "rgba(94,198,140,0.1)" },
  closed:     { label: "Closed",     color: "rgba(255,255,255,0.25)", bg: "rgba(255,255,255,0.04)" },
};

function StageBadge({ stage }: { stage: string }) {
  const s = STAGE_STYLE[stage] ?? STAGE_STYLE.closed;
  return (
    <span
      className="font-sans uppercase"
      style={{
        fontSize: "0.4375rem",
        letterSpacing: "0.12em",
        color: s.color,
        background: s.bg,
        padding: "0.2rem 0.65rem",
        border: `1px solid ${s.color}40`,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

const PRIORITY_COLOR: Record<string, string> = {
  high:   "rgba(210,90,90,0.7)",
  medium: "rgba(240,190,80,0.7)",
  low:    "rgba(255,255,255,0.2)",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OperationsPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div style={{ background: "var(--kxd-black-base)", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        style={{
          background: "var(--kxd-black-pure)",
          borderBottom: "1px solid var(--kxd-border-gold)",
          padding: "1.5rem 0",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div className="kxd-container flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="font-serif font-light"
              style={{ fontSize: "1rem", color: "var(--kxd-gold)", letterSpacing: "0.04em", textDecoration: "none" }}
            >
              KXD
            </Link>
            <span style={{ color: "rgba(255,255,255,0.12)", fontSize: "0.5rem" }}>◆</span>
            <p
              className="font-sans uppercase"
              style={{ fontSize: "0.5625rem", letterSpacing: "0.14em", color: "var(--kxd-cream-muted)" }}
            >
              Operations
            </p>
          </div>

          <div className="flex items-center gap-5">
            <p
              className="hidden font-sans sm:block"
              style={{ fontSize: "0.5625rem", letterSpacing: "0.06em", color: "rgba(255,255,255,0.25)" }}
            >
              {today}
            </p>
            <Link
              href="/admin"
              className="font-sans uppercase transition-opacity hover:opacity-70"
              style={{ fontSize: "0.5rem", letterSpacing: "0.12em", color: "var(--kxd-gold)", opacity: 0.55, textDecoration: "none" }}
            >
              Payload Admin →
            </Link>
          </div>
        </div>
      </div>

      <div className="kxd-container py-10 lg:py-14 space-y-12">

        {/* ── KPI Grid ──────────────────────────────────────────────────────── */}
        <section>
          <p
            className="mb-5 font-sans uppercase"
            style={{ fontSize: "0.5625rem", letterSpacing: "0.14em", color: "var(--kxd-gold)", opacity: 0.65 }}
          >
            Executive Overview
          </p>

          <div
            className="grid grid-cols-2 gap-px md:grid-cols-3"
            style={{ background: "var(--kxd-border-white)", border: "1px solid var(--kxd-border-white)" }}
          >
            {KPI.map((kpi) => (
              <div
                key={kpi.label}
                style={{ background: "var(--kxd-black-elevated)", padding: "1.5rem 1.75rem" }}
              >
                <p
                  className="font-sans uppercase"
                  style={{ fontSize: "0.4375rem", letterSpacing: "0.14em", color: "rgba(255,255,255,0.25)" }}
                >
                  {kpi.label}
                </p>
                <p
                  className="mt-2 font-serif font-light leading-none"
                  style={{ fontSize: "clamp(1.625rem, 3vw, 2.25rem)", color: "var(--kxd-cream)" }}
                >
                  {kpi.value}
                </p>
                <p
                  className="mt-1 font-sans"
                  style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em" }}
                >
                  {kpi.sub}
                </p>
                <p
                  className="mt-2 font-sans"
                  style={{ fontSize: "0.5rem", color: "var(--kxd-gold)", opacity: 0.5, letterSpacing: "0.06em" }}
                >
                  {kpi.delta}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Main Grid ─────────────────────────────────────────────────────── */}
        <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">

          {/* ── Pipeline ──────────────────────────────────────────────────── */}
          <section>
            <div className="mb-5 flex items-center justify-between">
              <p
                className="font-sans uppercase"
                style={{ fontSize: "0.5625rem", letterSpacing: "0.14em", color: "var(--kxd-gold)", opacity: 0.65 }}
              >
                Pipeline — All Leads
              </p>
              <Link
                href="/admin/collections/project-inquiries"
                className="font-sans uppercase transition-opacity hover:opacity-70"
                style={{ fontSize: "0.5rem", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", textDecoration: "none" }}
              >
                Manage in CMS →
              </Link>
            </div>

            <div
              style={{
                background: "var(--kxd-black-elevated)",
                border: "1px solid var(--kxd-border-white)",
                overflow: "hidden",
              }}
            >
              {/* Table header */}
              <div
                className="grid"
                style={{
                  gridTemplateColumns: "1fr 7rem 8rem 6rem",
                  padding: "0.75rem 1.25rem",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                {["Company", "Services", "Value", "Stage"].map((h) => (
                  <p
                    key={h}
                    className="font-sans uppercase"
                    style={{ fontSize: "0.4375rem", letterSpacing: "0.12em", color: "rgba(255,255,255,0.2)" }}
                  >
                    {h}
                  </p>
                ))}
              </div>

              {PIPELINE.map((row, i) => (
                <div
                  key={row.company}
                  className="grid items-center"
                  style={{
                    gridTemplateColumns: "1fr 7rem 8rem 6rem",
                    padding: "0.875rem 1.25rem",
                    borderBottom: i < PIPELINE.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}
                >
                  <div>
                    <p
                      className="font-sans"
                      style={{ fontSize: "0.875rem", color: "var(--kxd-cream)", letterSpacing: "0.01em" }}
                    >
                      {row.company}
                    </p>
                    <p
                      className="mt-0.5 font-sans"
                      style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.3)" }}
                    >
                      {row.contact} · {row.days}d ago
                    </p>
                  </div>
                  <p
                    className="font-sans"
                    style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}
                  >
                    {row.services}
                  </p>
                  <p
                    className="font-sans font-light"
                    style={{ fontSize: "0.875rem", color: "var(--kxd-cream-muted)" }}
                  >
                    {row.value}
                  </p>
                  <StageBadge stage={row.stage} />
                </div>
              ))}

              {/* Pipeline total */}
              <div
                style={{
                  padding: "0.875rem 1.25rem",
                  borderTop: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(197,166,92,0.03)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "3rem",
                }}
              >
                <p
                  className="font-sans uppercase"
                  style={{ fontSize: "0.4375rem", letterSpacing: "0.12em", color: "rgba(255,255,255,0.2)" }}
                >
                  Total Pipeline
                </p>
                <p
                  className="font-serif font-light"
                  style={{ fontSize: "0.9375rem", color: "var(--kxd-gold)" }}
                >
                  $94,500
                </p>
              </div>
            </div>
          </section>

          {/* ── Right: Recent Leads + Open Tasks ──────────────────────────── */}
          <div className="space-y-8">

            {/* Recent Project Inquiries */}
            <section>
              <p
                className="mb-5 font-sans uppercase"
                style={{ fontSize: "0.5625rem", letterSpacing: "0.14em", color: "var(--kxd-gold)", opacity: 0.65 }}
              >
                Recent Inquiries
              </p>

              <div
                style={{
                  background: "var(--kxd-black-elevated)",
                  border: "1px solid var(--kxd-border-white)",
                }}
              >
                {RECENT_LEADS.map((lead, i) => (
                  <div
                    key={lead.company}
                    style={{
                      padding: "0.875rem 1.125rem",
                      borderBottom: i < RECENT_LEADS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className="font-sans truncate"
                          style={{ fontSize: "0.8125rem", color: "var(--kxd-cream)" }}
                        >
                          {lead.company}
                        </p>
                        <p
                          className="mt-0.5 font-sans"
                          style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.3)" }}
                        >
                          {lead.service} · {lead.submitted}
                        </p>
                      </div>
                      <StageBadge stage={lead.status} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Open Tasks */}
            <section>
              <p
                className="mb-5 font-sans uppercase"
                style={{ fontSize: "0.5625rem", letterSpacing: "0.14em", color: "var(--kxd-gold)", opacity: 0.65 }}
              >
                Open Tasks
              </p>

              <div
                style={{
                  background: "var(--kxd-black-elevated)",
                  border: "1px solid var(--kxd-border-white)",
                }}
              >
                {TASKS.map((task, i) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-4"
                    style={{
                      padding: "0.875rem 1.125rem",
                      borderBottom: i < TASKS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    }}
                  >
                    {/* Priority indicator */}
                    <div
                      style={{
                        width: "2px",
                        height: "2.5rem",
                        background: PRIORITY_COLOR[task.priority],
                        flexShrink: 0,
                        marginTop: "0.2rem",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-sans"
                        style={{ fontSize: "0.8125rem", color: "var(--kxd-cream)", lineHeight: 1.3 }}
                      >
                        {task.task}
                      </p>
                      <p
                        className="mt-1 font-sans"
                        style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.3)" }}
                      >
                        {task.project} · Due {task.due}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* ── System Note ─────────────────────────────────────────────────── */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            background: "rgba(197,166,92,0.03)",
            border: "1px solid rgba(197,166,92,0.12)",
          }}
        >
          <p
            className="font-sans"
            style={{ fontSize: "0.5625rem", letterSpacing: "0.08em", color: "rgba(255,255,255,0.25)" }}
          >
            KXD OS — Operations Dashboard · Phase 1 Placeholder · Live data integration in Phase 2 ·{" "}
            <Link
              href="/admin/collections/project-inquiries"
              style={{ color: "var(--kxd-gold)", opacity: 0.55, textDecoration: "none" }}
            >
              Manage Project Inquiries in CMS →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
