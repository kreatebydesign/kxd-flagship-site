/**
 * KXD OS — Internal Operations Dashboard
 * /admin/operations
 *
 * Fully self-contained: uses hardcoded KXD brand hex values so the page
 * renders correctly regardless of CSS variable availability.
 * Layout via standard Tailwind utilities; no kxd-* custom class dependencies.
 */
import Link from "next/link";

// ── Brand constants (hardcoded — no CSS variable dependency) ──────────────────

const C = {
  bgPure:      "#000000",
  bgBase:      "#080808",
  bgElevated:  "#111111",
  gold:        "#C5A65C",
  goldDim:     "rgba(197,166,92,0.55)",
  cream:       "#f8f3ea",
  creamMuted:  "#bfb7aa",
  creamSoft:   "#e8ded0",
  border:      "rgba(255,255,255,0.07)",
  borderGold:  "rgba(197,166,92,0.22)",
  borderStrong:"rgba(255,255,255,0.11)",
  serif:       "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
  sans:        "var(--font-outfit, 'Helvetica Neue', Arial, sans-serif)",
} as const;

// ── Operational data ──────────────────────────────────────────────────────────

const KPI = [
  { label: "Active Projects",        value: "2",       sub: "In delivery",         delta: "+1 this quarter" },
  { label: "Discovery Calls",        value: "3",       sub: "Scheduled / pending",  delta: "Next: Jun 14" },
  { label: "Proposals Outstanding",  value: "1",       sub: "Awaiting response",    delta: "Sent Jun 6" },
  { label: "Retainer Clients",       value: "0",       sub: "Monthly recurring",    delta: "Target: Q3 2026" },
  { label: "Pipeline Value",         value: "$94,500", sub: "Estimated",            delta: "3 active leads" },
  { label: "Monthly Recurring",      value: "$0",      sub: "MRR — retainer base",  delta: "Building toward $8K" },
] as const;

const PIPELINE = [
  { company: "Primal Motorsports",  contact: "Tyler M.",  value: "$22,000", stage: "active",    days: 34, services: "Platform Dev, CRM" },
  { company: "Heritage Home Co.",   contact: "Sarah K.",  value: "$18,500", stage: "active",    days: 21, services: "Brand, Website" },
  { company: "Crestfield Capital",  contact: "James W.",  value: "$31,000", stage: "proposal",  days: 6,  services: "Enterprise System" },
  { company: "Northgate Vineyards", contact: "Maren L.",  value: "$14,000", stage: "discovery", days: 12, services: "Hospitality OS" },
  { company: "Apex Racing League",  contact: "Derek P.",  value: "$9,000",  stage: "reviewing", days: 3,  services: "Motorsports OS" },
] as const;

const RECENT_LEADS = [
  { company: "Pinehurst Reserve",   service: "Luxury Website",  submitted: "Jun 8, 2026",  status: "new" },
  { company: "Crestfield Capital",  service: "Enterprise",      submitted: "Jun 6, 2026",  status: "proposal" },
  { company: "Apex Racing League",  service: "Motorsports OS",  submitted: "Jun 5, 2026",  status: "reviewing" },
  { company: "Solace Interiors",    service: "Brand Systems",   submitted: "Jun 3, 2026",  status: "reviewing" },
  { company: "Northgate Vineyards", service: "Hospitality OS",  submitted: "May 28, 2026", status: "discovery" },
] as const;

const TASKS = [
  { id: "t1", task: "Send proposal — Crestfield Capital",   priority: "high",   due: "Jun 12", project: "Crestfield" },
  { id: "t2", task: "Design review — Primal Motorsports",   priority: "medium", due: "Jun 18", project: "Primal" },
  { id: "t3", task: "Discovery call prep — Northgate",      priority: "medium", due: "Jun 14", project: "Northgate" },
  { id: "t4", task: "Brand brief — Heritage Home Co.",      priority: "low",    due: "Jun 22", project: "Heritage" },
  { id: "t5", task: "Update pipeline notes — Apex Racing",  priority: "low",    due: "Jun 15", project: "Apex" },
] as const;

// ── Stage config ──────────────────────────────────────────────────────────────

const STAGE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  new:        { label: "New",        color: "#C5A65C",    bg: "rgba(197,166,92,0.08)",    border: "rgba(197,166,92,0.3)" },
  reviewing:  { label: "Reviewing",  color: "#8a9bd2",    bg: "rgba(138,155,210,0.08)",   border: "rgba(138,155,210,0.3)" },
  discovery:  { label: "Discovery",  color: "#96d2c8",    bg: "rgba(150,210,200,0.08)",   border: "rgba(150,210,200,0.3)" },
  proposal:   { label: "Proposal",   color: "#f0be50",    bg: "rgba(240,190,80,0.08)",    border: "rgba(240,190,80,0.3)" },
  active:     { label: "Active",     color: "#5ec68c",    bg: "rgba(94,198,140,0.08)",    border: "rgba(94,198,140,0.3)" },
  onboarding: { label: "Onboarding", color: "#b48cdc",    bg: "rgba(180,140,220,0.08)",   border: "rgba(180,140,220,0.3)" },
  retainer:   { label: "Retainer",   color: "#5ec68c",    bg: "rgba(94,198,140,0.12)",    border: "rgba(94,198,140,0.35)" },
  paused:     { label: "Paused",     color: "#888880",    bg: "rgba(136,136,128,0.08)",   border: "rgba(136,136,128,0.3)" },
  completed:  { label: "Completed",  color: "#9ec6f0",    bg: "rgba(158,198,240,0.08)",   border: "rgba(158,198,240,0.3)" },
  closed:     { label: "Closed",     color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)" },
};

const PRIORITY_COLOR: Record<string, string> = {
  high:   "#d25a5a",
  medium: "#f0be50",
  low:    "rgba(255,255,255,0.18)",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p
      style={{
        fontFamily: C.sans,
        fontWeight: 400,
        fontSize: "0.4375rem",
        letterSpacing: "0.14em",
        textTransform: "uppercase" as const,
        color: "rgba(255,255,255,0.3)",
        ...style,
      }}
    >
      {children}
    </p>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const s = STAGE[stage] ?? STAGE.closed;
  return (
    <span
      style={{
        fontFamily: C.sans,
        fontWeight: 500,
        fontSize: "0.375rem",
        letterSpacing: "0.14em",
        textTransform: "uppercase" as const,
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
        padding: "0.2rem 0.65rem",
        whiteSpace: "nowrap" as const,
        display: "inline-block",
      }}
    >
      {s.label}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OperationsPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      style={{
        background: C.bgBase,
        minHeight: "100vh",
        color: C.cream,
        fontFamily: C.sans,
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      {/* ── Sticky Header ────────────────────────────────────────────────── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: C.bgPure,
          borderBottom: `1px solid ${C.gold}40`,
          padding: "0 0",
        }}
      >
        <div
          className="mx-auto max-w-screen-xl"
          style={{ padding: "1.125rem 1.5rem" }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                style={{
                  fontFamily: C.serif,
                  fontWeight: 300,
                  fontSize: "1.0625rem",
                  color: C.gold,
                  letterSpacing: "0.04em",
                  textDecoration: "none",
                }}
              >
                KXD
              </Link>
              <span style={{ color: "rgba(255,255,255,0.1)", fontSize: "0.375rem" }}>◆</span>
              <p
                style={{
                  fontFamily: C.sans,
                  fontWeight: 400,
                  fontSize: "0.5625rem",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: C.creamMuted,
                }}
              >
                Operations
              </p>
              <span
                style={{
                  fontFamily: C.sans,
                  fontWeight: 500,
                  fontSize: "0.375rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(94,198,140,0.75)",
                  background: "rgba(94,198,140,0.07)",
                  border: "1px solid rgba(94,198,140,0.2)",
                  padding: "0.2rem 0.6rem",
                }}
              >
                Phase 1
              </span>
            </div>

            <div className="flex items-center gap-5">
              <p
                className="hidden sm:block"
                style={{
                  fontFamily: C.sans,
                  fontSize: "0.5625rem",
                  letterSpacing: "0.06em",
                  color: "rgba(255,255,255,0.22)",
                }}
              >
                {today}
              </p>
              <Link
                href="/admin"
                style={{
                  fontFamily: C.sans,
                  fontWeight: 500,
                  fontSize: "0.5rem",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: C.gold,
                  opacity: 0.55,
                  textDecoration: "none",
                }}
              >
                Payload CMS →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div
        className="mx-auto max-w-screen-xl"
        style={{ padding: "2.5rem 1.5rem 4rem" }}
      >

        {/* ── Executive overview label ─────────────────────────────────── */}
        <div style={{ marginBottom: "1.125rem" }}>
          <Label style={{ color: C.goldDim, letterSpacing: "0.16em" }}>
            Executive Overview
          </Label>
        </div>

        {/* ── KPI Grid ─────────────────────────────────────────────────── */}
        <div
          className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6"
          style={{
            gap: "1px",
            background: C.border,
            border: `1px solid ${C.border}`,
            marginBottom: "2.5rem",
          }}
        >
          {KPI.map((kpi) => (
            <div
              key={kpi.label}
              style={{
                background: C.bgElevated,
                padding: "1.375rem 1.5rem",
              }}
            >
              <Label>{kpi.label}</Label>
              <p
                style={{
                  fontFamily: C.serif,
                  fontWeight: 300,
                  fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
                  lineHeight: 1,
                  color: C.cream,
                  marginTop: "0.625rem",
                  letterSpacing: "-0.01em",
                }}
              >
                {kpi.value}
              </p>
              <p
                style={{
                  fontFamily: C.sans,
                  fontSize: "0.5625rem",
                  color: "rgba(255,255,255,0.25)",
                  letterSpacing: "0.04em",
                  marginTop: "0.375rem",
                }}
              >
                {kpi.sub}
              </p>
              <p
                style={{
                  fontFamily: C.sans,
                  fontSize: "0.4375rem",
                  color: C.gold,
                  opacity: 0.5,
                  letterSpacing: "0.06em",
                  marginTop: "0.5rem",
                }}
              >
                {kpi.delta}
              </p>
            </div>
          ))}
        </div>

        {/* ── Two-column main grid ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_22rem] xl:gap-10">

          {/* ── Pipeline ─────────────────────────────────────────────── */}
          <section>
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: "1rem" }}
            >
              <Label style={{ color: C.goldDim, letterSpacing: "0.16em" }}>
                Pipeline — All Leads
              </Label>
              <Link
                href="/admin/collections/project-inquiries"
                style={{
                  fontFamily: C.sans,
                  fontWeight: 400,
                  fontSize: "0.5rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.22)",
                  textDecoration: "none",
                }}
              >
                Manage in CMS →
              </Link>
            </div>

            {/* Horizontally scrollable table */}
            <div
              style={{
                background: C.bgElevated,
                border: `1px solid ${C.border}`,
                overflowX: "auto",
              }}
            >
              {/* Table head */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(160px,1fr) minmax(140px,160px) 90px 90px",
                  padding: "0.6875rem 1.25rem",
                  borderBottom: `1px solid rgba(255,255,255,0.06)`,
                  background: "rgba(255,255,255,0.02)",
                  minWidth: "520px",
                }}
              >
                {["Company", "Services", "Value", "Stage"].map((h) => (
                  <Label key={h}>{h}</Label>
                ))}
              </div>

              {/* Rows */}
              {PIPELINE.map((row, i) => (
                <div
                  key={row.company}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(160px,1fr) minmax(140px,160px) 90px 90px",
                    padding: "0.875rem 1.25rem",
                    borderBottom: i < PIPELINE.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none",
                    alignItems: "center",
                    minWidth: "520px",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontFamily: C.sans,
                        fontWeight: 400,
                        fontSize: "0.875rem",
                        color: C.cream,
                        letterSpacing: "0.01em",
                      }}
                    >
                      {row.company}
                    </p>
                    <p
                      style={{
                        fontFamily: C.sans,
                        fontSize: "0.5625rem",
                        color: "rgba(255,255,255,0.3)",
                        marginTop: "0.2rem",
                      }}
                    >
                      {row.contact} · {row.days}d ago
                    </p>
                  </div>
                  <p
                    style={{
                      fontFamily: C.sans,
                      fontSize: "0.75rem",
                      color: "rgba(255,255,255,0.38)",
                      paddingRight: "0.75rem",
                    }}
                  >
                    {row.services}
                  </p>
                  <p
                    style={{
                      fontFamily: C.sans,
                      fontWeight: 300,
                      fontSize: "0.875rem",
                      color: C.creamMuted,
                    }}
                  >
                    {row.value}
                  </p>
                  <div>
                    <StageBadge stage={row.stage} />
                  </div>
                </div>
              ))}

              {/* Pipeline total */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: "3rem",
                  padding: "0.875rem 1.25rem",
                  borderTop: `1px solid rgba(255,255,255,0.07)`,
                  background: "rgba(197,166,92,0.03)",
                  minWidth: "520px",
                }}
              >
                <Label>Total Pipeline</Label>
                <p
                  style={{
                    fontFamily: C.serif,
                    fontWeight: 300,
                    fontSize: "1rem",
                    color: C.gold,
                  }}
                >
                  $94,500
                </p>
              </div>
            </div>
          </section>

          {/* ── Right column ─────────────────────────────────────────── */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
          >
            {/* Recent Inquiries */}
            <section>
              <Label
                style={{
                  color: C.goldDim,
                  letterSpacing: "0.16em",
                  marginBottom: "1rem",
                  display: "block",
                }}
              >
                Recent Inquiries
              </Label>

              <div
                style={{
                  background: C.bgElevated,
                  border: `1px solid ${C.border}`,
                }}
              >
                {RECENT_LEADS.map((lead, i) => (
                  <div
                    key={lead.company}
                    style={{
                      padding: "0.875rem 1.125rem",
                      borderBottom: i < RECENT_LEADS.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p
                        style={{
                          fontFamily: C.sans,
                          fontWeight: 400,
                          fontSize: "0.8125rem",
                          color: C.cream,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {lead.company}
                      </p>
                      <p
                        style={{
                          fontFamily: C.sans,
                          fontSize: "0.5625rem",
                          color: "rgba(255,255,255,0.28)",
                          marginTop: "0.2rem",
                        }}
                      >
                        {lead.service} · {lead.submitted}
                      </p>
                    </div>
                    <StageBadge stage={lead.status} />
                  </div>
                ))}
              </div>
            </section>

            {/* Open Tasks */}
            <section>
              <Label
                style={{
                  color: C.goldDim,
                  letterSpacing: "0.16em",
                  marginBottom: "1rem",
                  display: "block",
                }}
              >
                Open Tasks
              </Label>

              <div
                style={{
                  background: C.bgElevated,
                  border: `1px solid ${C.border}`,
                }}
              >
                {TASKS.map((task, i) => (
                  <div
                    key={task.id}
                    style={{
                      padding: "0.875rem 1.125rem",
                      borderBottom: i < TASKS.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.875rem",
                    }}
                  >
                    {/* Priority bar */}
                    <div
                      style={{
                        width: "2px",
                        height: "2.25rem",
                        background: PRIORITY_COLOR[task.priority],
                        flexShrink: 0,
                        marginTop: "0.125rem",
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontFamily: C.sans,
                          fontWeight: 400,
                          fontSize: "0.8125rem",
                          color: C.cream,
                          lineHeight: 1.3,
                        }}
                      >
                        {task.task}
                      </p>
                      <p
                        style={{
                          fontFamily: C.sans,
                          fontSize: "0.5625rem",
                          color: "rgba(255,255,255,0.28)",
                          marginTop: "0.25rem",
                        }}
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

        {/* ── Phase 1 notice ───────────────────────────────────────────── */}
        <div
          style={{
            marginTop: "2.5rem",
            padding: "1rem 1.25rem",
            background: "rgba(197,166,92,0.03)",
            border: `1px solid ${C.borderGold}`,
          }}
        >
          <p
            style={{
              fontFamily: C.sans,
              fontSize: "0.5625rem",
              letterSpacing: "0.08em",
              color: "rgba(255,255,255,0.22)",
            }}
          >
            KXD OS · Operations Dashboard · Phase 1 Placeholder — live Payload data integration in Phase 2.{" "}
            <Link
              href="/admin/collections/project-inquiries"
              style={{ color: C.gold, opacity: 0.55, textDecoration: "none" }}
            >
              Manage Project Inquiries in CMS →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
