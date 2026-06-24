import Link from "next/link";
import { KxdLogo } from "@/components/ui/KxdLogo";
import type { FounderDashboardData, FounderFocusItem, FounderSnapshotMetric } from "@/lib/founder-dashboard";
import { KXD_OS as C } from "@/lib/kxd-os/palette";

const URGENCY_COLOR = {
  critical: C.red,
  high: C.amber,
  medium: C.slate,
} as const;

const STATUS_LABEL: Record<string, string> = {
  healthy: "Healthy",
  "needs-attention": "Needs Attention",
  "at-risk": "At Risk",
  paused: "Paused",
};

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p
      style={{
        fontFamily: C.sans,
        fontSize: "0.6875rem",
        fontWeight: 600,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: C.creamSubtle,
        ...style,
      }}
    >
      {children}
    </p>
  );
}

function SectionHeader({
  label,
  sub,
  href,
  linkText,
}: {
  label: string;
  sub?: string;
  href?: string;
  linkText?: string;
}) {
  return (
    <div
      className="mb-5 flex flex-wrap items-baseline justify-between gap-3"
      style={{ paddingBottom: "0.875rem", borderBottom: `1px solid ${C.border}` }}
    >
      <div>
        <Label style={{ color: C.goldDim, marginBottom: sub ? "0.5rem" : 0 }}>{label}</Label>
        {sub && (
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted, lineHeight: 1.55 }}>
            {sub}
          </p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          style={{
            fontFamily: C.sans,
            fontWeight: 500,
            fontSize: "0.6875rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: C.goldDim,
            textDecoration: "none",
          }}
        >
          {linkText ?? "View →"}
        </Link>
      )}
    </div>
  );
}

function SnapshotGrid({ metrics }: { metrics: FounderSnapshotMetric[] }) {
  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4"
      style={{ gap: "1px", background: C.border, border: `1px solid ${C.border}` }}
    >
      {metrics.map((m) => {
        const inner = (
          <div
            style={{
              background: C.glass,
              padding: "1.375rem 1.5rem",
              height: "100%",
              transition: "background 0.2s ease",
            }}
            className="founder-snapshot-cell"
          >
            <Label>{m.label}</Label>
            <p
              style={{
                fontFamily: C.serif,
                fontWeight: 300,
                fontSize: "clamp(1.375rem, 2.5vw, 1.75rem)",
                color: m.alert ? C.amber : C.cream,
                marginTop: "0.625rem",
                lineHeight: 1,
              }}
            >
              {m.value}
            </p>
            <p
              style={{
                fontFamily: C.sans,
                fontSize: "0.8125rem",
                color: C.creamSubtle,
                marginTop: "0.5rem",
                lineHeight: 1.45,
              }}
            >
              {m.sub}
            </p>
          </div>
        );
        return m.href ? (
          <Link key={m.id} href={m.href} style={{ textDecoration: "none", display: "block" }}>
            {inner}
          </Link>
        ) : (
          <div key={m.id}>{inner}</div>
        );
      })}
      <style>{`
        .founder-snapshot-cell:hover { background: ${C.glassHover}; }
      `}</style>
    </div>
  );
}

function FocusStack({ items }: { items: FounderFocusItem[] }) {
  if (items.length === 0) {
    return (
      <div
        style={{
          background: C.glass,
          border: `1px solid ${C.border}`,
          padding: "1.5rem 1.75rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: C.gold }} />
        <div>
          <p style={{ fontFamily: C.sans, fontSize: "0.875rem", color: C.cream }}>All clear for today.</p>
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamSubtle, marginTop: "0.25rem" }}>
            No critical items in the priority stack.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: C.border }}>
      {items.map((item, i) => {
        const color = URGENCY_COLOR[item.urgency];
        const row = (
          <div
            style={{
              background: C.glass,
              padding: "1.125rem 1.375rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "1rem",
              borderLeft: `2px solid ${color}`,
            }}
          >
            <span
              style={{
                fontFamily: C.sans,
                fontWeight: 700,
                fontSize: "0.8125rem",
                color: C.creamSubtle,
                width: "1.25rem",
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.875rem", color: C.cream }}>
                {item.label}
              </p>
              <p
                style={{
                  fontFamily: C.sans,
                  fontSize: "0.8125rem",
                  color: C.creamSubtle,
                  marginTop: "0.25rem",
                  lineHeight: 1.5,
                }}
              >
                {item.detail}
              </p>
            </div>
            <span
              style={{
                fontFamily: C.sans,
                fontSize: "0.6875rem",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color,
                flexShrink: 0,
              }}
            >
              {item.urgency}
            </span>
          </div>
        );
        return item.href ? (
          <Link key={item.id} href={item.href} style={{ textDecoration: "none" }}>
            {row}
          </Link>
        ) : (
          <div key={item.id}>{row}</div>
        );
      })}
    </div>
  );
}

function fmtMoneyCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

type Props = {
  data: FounderDashboardData;
};

export function FounderDashboard({ data }: Props) {
  const navLinks = [
    ["/admin/operations/founder", "Founder"],
    ["/admin/operations/executive", "Executive"],
    ["/admin/operations/today", "Today"],
    ["/admin/operations/accounts", "Accounts"],
    ["/admin/operations/growth", "Growth"],
    ["/admin/operations/creative", "Creative"],
    ["/admin/operations/onboarding", "Onboarding"],
    ["/admin/operations", "Operations"],
  ] as const;

  return (
    <div
      style={{
        background: C.bgBase,
        minHeight: "100vh",
        color: C.cream,
        fontFamily: C.sans,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <header style={{ background: C.bgPure, borderBottom: `1px solid ${C.border}` }}>
        <div
          className="mx-auto flex max-w-screen-xl flex-wrap items-center justify-between gap-4"
          style={{ padding: "1.125rem 1.5rem" }}
        >
          <div className="flex items-center gap-4">
            <KxdLogo />
            <div>
              <p
                style={{
                  fontFamily: C.sans,
                  fontSize: "0.8125rem",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: C.creamMuted,
                }}
              >
                KXD OS · Founder Studio
              </p>
              <p
                style={{
                  fontFamily: C.sans,
                  fontSize: "0.6875rem",
                  letterSpacing: "0.1em",
                  color: C.creamSubtle,
                  marginTop: "0.25rem",
                }}
              >
                Morning intelligence briefing
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-4">
            {navLinks.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                style={{
                  fontFamily: C.sans,
                  fontSize: "0.6875rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: href === "/admin/operations/founder" ? C.gold : C.creamSubtle,
                  textDecoration: "none",
                }}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl" style={{ padding: "2.5rem 1.5rem 5rem" }}>
        {/* Hero */}
        <div
          style={{
            marginBottom: "2.75rem",
            paddingBottom: "2.25rem",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <Label style={{ color: C.goldDim, marginBottom: "0.875rem" }}>Founder Studio</Label>
          <h1
            style={{
              fontFamily: C.serif,
              fontWeight: 300,
              fontSize: "clamp(2rem, 5vw, 3.25rem)",
              lineHeight: 1.05,
              color: C.cream,
              maxWidth: "36rem",
            }}
          >
            {data.dateDisplay}
          </h1>
          <p
            style={{
              fontFamily: C.sans,
              fontSize: "0.8125rem",
              color: C.creamSubtle,
              marginTop: "0.75rem",
            }}
          >
            Loaded {data.timeDisplay} · Live snapshot across clients, delivery, growth, and studio operations
          </p>
        </div>

        {/* 1. Founder Snapshot */}
        <section style={{ marginBottom: "3rem" }}>
          <SectionHeader
            label="Founder Snapshot"
            sub="Real-time pulse of the business — one glance, full context"
          />
          <SnapshotGrid metrics={data.snapshot} />
        </section>

        <div className="grid gap-10 xl:grid-cols-5" style={{ marginBottom: "3rem" }}>
          {/* 2. Today's Focus */}
          <section className="xl:col-span-3">
            <SectionHeader
              label="Today's Focus"
              sub="Priority stack — overdue work, onboarding, requests, and creative blockers"
              href="/admin/operations/today"
              linkText="Studio Today →"
            />
            <FocusStack items={data.todaysFocus} />
          </section>

          {/* 6. Revenue View (sidebar) */}
          <section className="xl:col-span-2">
            <SectionHeader
              label="Revenue View"
              sub="Retainer-based recurring revenue"
              href="/admin/collections/retainers"
              linkText="Retainers →"
            />
            <div
              style={{
                background: C.glass,
                border: `1px solid ${C.borderGold}`,
                padding: "1.5rem 1.625rem",
              }}
            >
              <p
                style={{
                  fontFamily: C.serif,
                  fontWeight: 300,
                  fontSize: "2.25rem",
                  color: C.gold,
                  lineHeight: 1,
                }}
              >
                {fmtMoneyCompact(data.revenue.mrr)}
              </p>
              <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted, marginTop: "0.35rem" }}>
                Monthly recurring revenue
              </p>
              <div
                className="grid grid-cols-2"
                style={{ gap: "1rem", marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: `1px solid ${C.border}` }}
              >
                <div>
                  <Label>Est. ARR</Label>
                  <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1.25rem", color: C.cream, marginTop: "0.35rem" }}>
                    {fmtMoneyCompact(data.revenue.arr)}
                  </p>
                </div>
                <div>
                  <Label>Active Retainers</Label>
                  <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1.25rem", color: C.cream, marginTop: "0.35rem" }}>
                    {data.revenue.activeRetainers}
                  </p>
                </div>
                <div>
                  <Label>Retainer Clients</Label>
                  <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1.25rem", color: C.cream, marginTop: "0.35rem" }}>
                    {data.revenue.retainerClients}
                  </p>
                </div>
              </div>
              {data.revenue.topAccounts.length > 0 && (
                <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: `1px solid ${C.border}` }}>
                  <Label style={{ marginBottom: "0.75rem" }}>Top Accounts</Label>
                  {data.revenue.topAccounts.map((a) => (
                    <div
                      key={a.name}
                      className="flex justify-between gap-2"
                      style={{ marginBottom: "0.5rem" }}
                    >
                      <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted }}>{a.name}</p>
                      <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.cream }}>
                        {fmtMoneyCompact(a.mrr)}
                        <span style={{ color: C.creamSubtle, marginLeft: "0.35rem" }}>{a.pct}%</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* 3. Growth Pipeline */}
        <section style={{ marginBottom: "3rem" }}>
          <SectionHeader
            label="Growth Pipeline"
            sub="Audits and research leads — early signal before revenue"
            href="/admin/operations/growth"
            linkText="Growth Systems →"
          />
          <div
            className="grid grid-cols-2 lg:grid-cols-3"
            style={{ gap: "1px", background: C.border, border: `1px solid ${C.border}` }}
          >
            {[
              {
                label: "Website Audits",
                value: data.growthPipeline.auditsSubmitted,
                sub: `${data.growthPipeline.auditsNew30d} new in 30 days`,
              },
              {
                label: "Research Leads",
                value: data.growthPipeline.researchLeadsSubmitted,
                sub: `${data.growthPipeline.researchLeadsNew30d} new in 30 days`,
              },
              {
                label: "Qualified Opportunities",
                value: data.growthPipeline.qualifiedOpportunities,
                sub: "Qualified or further in pipeline",
              },
              {
                label: "Closed Opportunities",
                value: data.growthPipeline.closedOpportunities,
                sub: "Closed-won research leads",
              },
            ].map((item) => (
              <div key={item.label} style={{ background: C.glass, padding: "1.375rem 1.5rem" }}>
                <Label>{item.label}</Label>
                <p
                  style={{
                    fontFamily: C.serif,
                    fontWeight: 300,
                    fontSize: "1.75rem",
                    color: C.cream,
                    marginTop: "0.5rem",
                    lineHeight: 1,
                  }}
                >
                  {item.value}
                </p>
                <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamSubtle, marginTop: "0.4rem" }}>
                  {item.sub}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-10 lg:grid-cols-2" style={{ marginBottom: "3rem" }}>
          {/* 4. Team Activity */}
          <section>
            <SectionHeader
              label="Team Activity"
              sub="Junior Creators — research output and studio contribution"
              href="/admin/operations/junior-creators"
              linkText="Junior Creator Admin →"
            />
            {data.teamActivity.length === 0 ? (
              <div style={{ background: C.glass, border: `1px solid ${C.border}`, padding: "1.5rem" }}>
                <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamSubtle }}>
                  No junior creator accounts active.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: C.border }}>
                {data.teamActivity.map((member) => (
                  <div
                    key={member.id}
                    style={{
                      background: C.glass,
                      padding: "1.25rem 1.375rem",
                      borderLeft: member.activeNow ? `2px solid ${C.gold}` : undefined,
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p style={{ fontFamily: C.serif, fontWeight: 400, fontSize: "1.125rem", color: C.cream }}>
                          {member.displayName}
                          {member.activeNow && (
                            <span
                              style={{
                                fontFamily: C.sans,
                                fontSize: "0.6875rem",
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                color: C.goldDim,
                                marginLeft: "0.75rem",
                              }}
                            >
                              Active now
                            </span>
                          )}
                        </p>
                        <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.gold, marginTop: "0.25rem" }}>
                          {member.rankTitle}
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.cream }}>
                          {member.leadsSubmitted} leads
                        </p>
                        <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamSubtle, marginTop: "0.2rem" }}>
                          {member.hoursLabel} contributed
                        </p>
                      </div>
                    </div>
                    <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamSubtle, marginTop: "0.5rem" }}>
                      {member.leadsThisWeek} lead{member.leadsThisWeek === 1 ? "" : "s"} this week
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 5. Client Health */}
          <section>
            <SectionHeader
              label="Client Health"
              sub="Relationship status across the active client base"
              href="/admin/operations/accounts"
              linkText="Account Intelligence →"
            />
            <div
              className="mb-4 grid grid-cols-3"
              style={{ gap: "1px", background: C.border, border: `1px solid ${C.border}` }}
            >
              {[
                { label: "Healthy", value: data.clientHealth.healthy, color: C.goldDim },
                { label: "Needs Attention", value: data.clientHealth.needsAttention, color: C.amber },
                { label: "At Risk", value: data.clientHealth.atRisk, color: C.red },
              ].map((s) => (
                <div key={s.label} style={{ background: C.glass, padding: "1rem 1.125rem", textAlign: "center" }}>
                  <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1.5rem", color: s.color }}>{s.value}</p>
                  <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.creamSubtle, marginTop: "0.35rem" }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: C.border }}>
              {data.clientHealth.topClients.map((client) => (
                <Link
                  key={client.clientId}
                  href={client.href}
                  style={{
                    background: C.glass,
                    padding: "0.875rem 1.125rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "0.75rem",
                    textDecoration: "none",
                  }}
                >
                  <div>
                    <p style={{ fontFamily: C.sans, fontSize: "0.875rem", color: C.cream }}>{client.name}</p>
                    <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamSubtle, marginTop: "0.15rem" }}>
                      {STATUS_LABEL[client.status] ?? client.status} · Grade {client.grade}
                    </p>
                  </div>
                  <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.goldDim }}>
                    {fmtMoneyCompact(client.mrr)}/mo
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* 7. Founder Notes */}
        <section style={{ marginBottom: "3rem" }}>
          <SectionHeader
            label="Founder Notes"
            sub="Priorities, reminders, and vision — your private studio notebook"
          />
          <div
            className="grid gap-px lg:grid-cols-3"
            style={{ background: C.border, border: `1px solid ${C.border}` }}
          >
            {data.founderNotes.map((note) => (
              <div
                key={note.id}
                style={{
                  background: C.glass,
                  padding: "1.5rem 1.625rem",
                  borderTop: `1px solid ${C.borderGold}`,
                }}
              >
                <Label style={{ color: C.goldDim, marginBottom: "0.625rem" }}>{note.category}</Label>
                <p
                  style={{
                    fontFamily: C.serif,
                    fontWeight: 400,
                    fontSize: "1.125rem",
                    color: C.cream,
                    marginBottom: "0.625rem",
                    lineHeight: 1.25,
                  }}
                >
                  {note.title}
                </p>
                <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted, lineHeight: 1.65 }}>
                  {note.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick links */}
        <section>
          <Label style={{ color: C.goldDim, marginBottom: "1rem" }}>Studio Systems</Label>
          <div
            className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6"
            style={{ gap: "1px", background: C.border, border: `1px solid ${C.border}` }}
          >
            {[
              { label: "Executive", href: "/admin/operations/executive" },
              { label: "Today", href: "/admin/operations/today" },
              { label: "Accounts", href: "/admin/operations/accounts" },
              { label: "Creative", href: "/admin/operations/creative" },
              { label: "Research", href: "/admin/operations/research" },
              { label: "KXD OS", href: "/os" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  background: C.glass,
                  padding: "1rem 1.125rem",
                  textDecoration: "none",
                  transition: "background 0.2s ease",
                }}
                className="founder-quick-link"
              >
                <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted }}>{link.label}</p>
              </Link>
            ))}
          </div>
          <style>{`
            .founder-quick-link:hover { background: ${C.glassHover}; }
          `}</style>
        </section>

        <p
          style={{
            fontFamily: C.sans,
            fontSize: "0.8125rem",
            color: C.creamSubtle,
            marginTop: "2.5rem",
            letterSpacing: "0.04em",
          }}
        >
          KXD OS · Founder Studio · Live Payload data · Refreshes on each request
        </p>
      </main>
    </div>
  );
}
