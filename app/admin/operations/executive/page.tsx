/**
 * /admin/operations/executive
 * KXD OS Phase 6B — Executive Command Center
 */

import Link from "next/link";
import { KxdLogo } from "@/components/ui/KxdLogo";
import { getExecutiveDashboardData } from "@/lib/executive-dashboard";
import { AUDIT_STATUS_LABEL } from "@/lib/website-audit/scoring";

export const dynamic = "force-dynamic";

const C = {
  bgPure: "#000000",
  bgBase: "#080808",
  bgElevated: "#111111",
  gold: "#C5A65C",
  goldDim: "rgba(197,166,92,0.55)",
  goldFaint: "rgba(197,166,92,0.08)",
  cream: "#f8f3ea",
  creamMuted: "#bfb7aa",
  red: "#d25a5a",
  redFaint: "rgba(210,90,90,0.08)",
  yellow: "#f0be50",
  green: "#5ec68c",
  teal: "#96d2c8",
  blue: "#8a9bd2",
  purple: "#b48cdc",
  border: "rgba(255,255,255,0.07)",
  borderGold: "rgba(197,166,92,0.22)",
  serif: "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
  sans: "var(--font-outfit, 'Helvetica Neue', Arial, sans-serif)",
} as const;

const PIPELINE_ORDER = [
  "new-lead",
  "contacted",
  "qualified",
  "proposal-sent",
  "closed-won",
  "closed-lost",
] as const;

const TONE: Record<string, { color: string; bg: string; border: string }> = {
  red: { color: C.red, bg: C.redFaint, border: "rgba(210,90,90,0.25)" },
  yellow: { color: C.yellow, bg: "rgba(240,190,80,0.08)", border: "rgba(240,190,80,0.25)" },
  gold: { color: C.gold, bg: C.goldFaint, border: C.borderGold },
};

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{
      fontFamily: C.sans, fontSize: "0.4375rem", fontWeight: 600,
      letterSpacing: "0.18em", textTransform: "uppercase" as const,
      color: "rgba(255,255,255,0.3)", ...style,
    }}>
      {children}
    </p>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div style={{
      background: C.bgElevated, border: `1px solid ${C.border}`,
      padding: "1.375rem 1.5rem",
    }}>
      <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em" }}>
        {message}
      </p>
    </div>
  );
}

function CommandCard({ title, value, sub, href }: { title: string; value: string; sub?: string; href: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "block", textDecoration: "none",
        background: C.bgElevated, padding: "1.375rem 1.5rem",
        border: `1px solid ${C.border}`,
      }}
    >
      <Label>{title}</Label>
      <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1.625rem", color: C.cream, marginTop: "0.5rem", lineHeight: 1 }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontFamily: C.sans, fontSize: "0.5rem", color: C.creamMuted, marginTop: "0.5rem", letterSpacing: "0.04em" }}>
          {sub}
        </p>
      )}
    </Link>
  );
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });
  } catch { return "—"; }
}

const NAV_LINKS = [
  ["/admin/operations/executive", "Executive"],
  ["/admin/operations/command", "Operations"],
  ["/admin/operations/today", "Today"],
  ["/admin/operations/audits", "Audits"],
  ["/admin/operations/onboarding", "Onboarding"],
  ["/admin/operations/playbooks", "Playbooks"],
  ["/admin/operations/growth", "Growth"],
  ["/admin/operations/accounts", "Accounts"],
  ["/admin/operations/founder", "Founder"],
  ["/admin/operations/creative", "Creative"],
] as const;

const QUICK_ACTIONS = [
  { label: "New Client", href: "/admin/collections/clients/create" },
  { label: "New Project", href: "/admin/collections/client-projects/create" },
  { label: "New Request", href: "/admin/operations/requests/new" },
  { label: "New Onboarding", href: "/admin/collections/client-onboarding/create" },
  { label: "Website Audit Review", href: "/admin/operations/audits" },
  { label: "Playbooks", href: "/admin/operations/playbooks" },
  { label: "Client Portal", href: "/portal" },
] as const;

export default async function ExecutiveDashboardPage() {
  const data = await getExecutiveDashboardData();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const kpiItems = [
    { label: "Total Clients", value: data.kpis.totalClients },
    { label: "Active Projects", value: data.kpis.activeProjects },
    { label: "Open Requests", value: data.kpis.openRequests },
    { label: "Pending Deliverables", value: data.kpis.pendingDeliverables },
    { label: "Completed (30d)", value: data.kpis.completedDeliverables30d },
    { label: "Audit Leads (30d)", value: data.kpis.newAuditLeads30d },
    { label: "Portal Users", value: data.kpis.portalUsers },
    { label: "Onboarding Active", value: data.kpis.onboardingInProgress },
  ];

  return (
    <div style={{ background: C.bgBase, minHeight: "100vh", color: C.cream, fontFamily: C.sans }}>
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: C.bgPure, borderBottom: `1px solid ${C.gold}40` }}>
        <div className="mx-auto max-w-screen-xl" style={{ padding: "1.125rem 1.5rem" }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <KxdLogo />
              <div>
                <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.5625rem", letterSpacing: "0.16em", textTransform: "uppercase", color: C.creamMuted }}>
                  Executive
                </p>
                <p style={{ fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.24)", marginTop: "0.35rem" }}>
                  KXD Command Center
                </p>
              </div>
              <span style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.goldDim, background: C.goldFaint, border: `1px solid ${C.borderGold}`, padding: "0.2rem 0.6rem" }}>
                Phase 6B
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {NAV_LINKS.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  style={{
                    fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.12em",
                    textTransform: "uppercase", color: href === "/admin/operations/executive" ? C.gold : "rgba(255,255,255,0.3)",
                    textDecoration: "none",
                  }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl" style={{ padding: "2.5rem 1.5rem 5rem" }}>
        <div style={{ marginBottom: "2.5rem", paddingBottom: "2rem", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.2em", textTransform: "uppercase", color: C.goldDim, marginBottom: "0.875rem" }}>
            KXD OS · Executive Dashboard
          </p>
          <h1 style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "clamp(1.875rem, 5vw, 3rem)", color: C.cream, lineHeight: 1.05 }}>
            Business Command Center
          </h1>
          <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.creamMuted, marginTop: "0.75rem" }}>
            {today} · Live snapshot across clients, delivery, onboarding, audits, and portal
          </p>
        </div>

        {/* Command center overview */}
        <section className="mb-10">
          <Label style={{ color: C.goldDim, marginBottom: "1rem" }}>Command Center Overview</Label>
          <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4" style={{ background: C.border, border: `1px solid ${C.border}` }}>
            {data.commandCenter.cards.map((card) => (
              <CommandCard
                key={card.id}
                title={card.title}
                value={card.value}
                sub={card.sub}
                href={card.href}
              />
            ))}
          </div>
        </section>

        {/* Risk, renewals, onboarding pipeline */}
        <div className="mb-10 grid gap-8 lg:grid-cols-3">
          <section>
            <Label style={{ color: C.goldDim, marginBottom: "1rem" }}>Projects At Risk</Label>
            {data.commandCenter.projectsAtRisk.length === 0 ? (
              <EmptyPanel message="No active risks detected." />
            ) : (
              <div style={{ border: `1px solid ${C.border}` }}>
                {data.commandCenter.projectsAtRisk.map((p) => (
                  <Link
                    key={p.id}
                    href={p.href}
                    style={{
                      display: "block", textDecoration: "none",
                      background: C.bgElevated, padding: "0.875rem 1.25rem",
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.cream }}>{p.projectName}</p>
                    <p style={{ fontFamily: C.sans, fontSize: "0.5rem", color: C.creamMuted, marginTop: "0.25rem" }}>{p.clientName}</p>
                    <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.08em", color: C.yellow, marginTop: "0.375rem" }}>
                      {p.reason}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <Label style={{ color: C.goldDim, marginBottom: "1rem" }}>Upcoming Renewals</Label>
            {data.commandCenter.upcomingRenewals.length === 0 ? (
              <EmptyPanel message="No upcoming renewals inside the current window." />
            ) : (
              <div style={{ border: `1px solid ${C.border}` }}>
                {data.commandCenter.upcomingRenewals.map((r) => (
                  <Link
                    key={r.id}
                    href={r.href}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem",
                      textDecoration: "none", background: C.bgElevated, padding: "0.875rem 1.25rem",
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    <div>
                      <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.cream }}>{r.clientName}</p>
                      <p style={{ fontFamily: C.sans, fontSize: "0.5rem", color: C.creamMuted, marginTop: "0.2rem" }}>
                        {r.label} · {r.date}
                      </p>
                    </div>
                    <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.gold }}>{r.amount}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <Label style={{ color: C.goldDim, marginBottom: "1rem" }}>Onboarding Pipeline</Label>
            <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, padding: "1.25rem 1.5rem" }}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "In Pipeline", value: data.commandCenter.onboardingPipeline.inPipeline },
                  { label: "Waiting on Client", value: data.commandCenter.onboardingPipeline.waitingOnClient },
                  { label: "Waiting on KXD", value: data.commandCenter.onboardingPipeline.waitingOnKxd },
                  { label: "Ready for Build", value: data.commandCenter.onboardingPipeline.readyForBuild },
                ].map((item) => (
                  <div key={item.label}>
                    <Label>{item.label}</Label>
                    <p style={{ fontFamily: C.serif, fontSize: "1.375rem", color: C.cream, marginTop: "0.35rem" }}>{item.value}</p>
                  </div>
                ))}
              </div>
              {data.commandCenter.onboardingPipeline.waitingOnKxd === 0 ? (
                <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: "rgba(255,255,255,0.28)", marginTop: "1rem" }}>
                  No onboarding clients waiting on KXD.
                </p>
              ) : null}
              <Link href="/admin/operations/onboarding" style={{
                fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.14em",
                textTransform: "uppercase", color: C.goldDim, textDecoration: "none",
                marginTop: "1rem", display: "block",
              }}>
                Open Onboarding →
              </Link>
            </div>
          </section>
        </div>

        {/* KPI bar */}
        <div className="mb-10 grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8" style={{ gap: "1px", background: C.border, border: `1px solid ${C.border}` }}>
          {kpiItems.map((k) => (
            <div key={k.label} style={{ background: C.bgElevated, padding: "1.25rem 1.375rem" }}>
              <Label>{k.label}</Label>
              <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1.5rem", color: C.cream, marginTop: "0.5rem", lineHeight: 1 }}>
                {k.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Action center */}
          <section>
            <Label style={{ color: C.goldDim, marginBottom: "1rem" }}>Action Center</Label>
            {data.actionCenter.length === 0 ? (
              <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.3)" }}>No urgent items right now.</p>
            ) : (
              <div style={{ border: `1px solid ${C.border}` }}>
                {data.actionCenter.map((item) => {
                  const tone = TONE[item.tone];
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      style={{
                        display: "block", textDecoration: "none",
                        background: C.bgElevated, padding: "1rem 1.25rem",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      <p style={{ fontFamily: C.sans, fontWeight: 600, fontSize: "0.4375rem", letterSpacing: "0.14em", textTransform: "uppercase", color: tone.color }}>
                        {item.label}
                      </p>
                      <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.creamMuted, marginTop: "0.375rem" }}>
                        {item.detail}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Sales pipeline */}
          <section>
            <Label style={{ color: C.goldDim, marginBottom: "1rem" }}>Website Audit Pipeline</Label>
            <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, padding: "1.5rem" }}>
              <div className="mb-4 flex flex-wrap gap-6">
                <div>
                  <Label>Win Rate</Label>
                  <p style={{ fontFamily: C.serif, fontSize: "1.75rem", color: C.green, marginTop: "0.25rem" }}>{data.salesPipeline.conversionToWon}%</p>
                </div>
                <div>
                  <Label>Qualified+</Label>
                  <p style={{ fontFamily: C.serif, fontSize: "1.75rem", color: C.teal, marginTop: "0.25rem" }}>{data.salesPipeline.conversionToQualified}%</p>
                </div>
                <div>
                  <Label>Total Audits</Label>
                  <p style={{ fontFamily: C.serif, fontSize: "1.75rem", color: C.cream, marginTop: "0.25rem" }}>{data.salesPipeline.total}</p>
                </div>
              </div>
              <div className="space-y-2">
                {PIPELINE_ORDER.map((status) => {
                  const count = data.salesPipeline.counts[status] ?? 0;
                  const pct = data.salesPipeline.total > 0 ? Math.round((count / data.salesPipeline.total) * 100) : 0;
                  return (
                    <div key={status} className="flex items-center justify-between gap-4" style={{ padding: "0.5rem 0", borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontFamily: C.sans, fontSize: "0.5625rem", letterSpacing: "0.08em", color: C.creamMuted }}>
                        {AUDIT_STATUS_LABEL[status] ?? status}
                      </span>
                      <span style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.cream }}>
                        {count} <span style={{ color: "rgba(255,255,255,0.25)" }}>({pct}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
              <Link href="/admin/operations/audits" style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.14em", textTransform: "uppercase", color: C.goldDim, textDecoration: "none", marginTop: "1rem", display: "block" }}>
                Open Audit Dashboard →
              </Link>
            </div>
          </section>
        </div>

        {/* Client health + snapshot */}
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section>
            <Label style={{ color: C.goldDim, marginBottom: "1rem" }}>Client Health Flags</Label>
            {data.clientHealth.length === 0 ? (
              <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.3)" }}>No flagged clients.</p>
            ) : (
              <div style={{ border: `1px solid ${C.border}` }}>
                {data.clientHealth.map((c) => (
                  <Link
                    key={c.clientId}
                    href={c.href}
                    style={{ display: "block", textDecoration: "none", background: C.bgElevated, padding: "1rem 1.25rem", borderBottom: `1px solid ${C.border}` }}
                  >
                    <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.75rem", color: C.cream }}>{c.clientName}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {c.issues.map((issue) => (
                        <span key={issue} style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.06em", color: C.yellow, background: "rgba(240,190,80,0.08)", border: "1px solid rgba(240,190,80,0.2)", padding: "0.15rem 0.45rem" }}>
                          {issue}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <Label style={{ color: C.goldDim, marginBottom: "1rem" }}>Business Snapshot</Label>
            <div className="grid grid-cols-2 gap-px" style={{ background: C.border, border: `1px solid ${C.border}` }}>
              {[
                { label: "Leads This Month", value: data.snapshot.leadsThisMonth },
                { label: "New Clients", value: data.snapshot.newClientsThisMonth },
                { label: "Projects Completed", value: data.snapshot.projectsCompletedThisMonth },
                { label: "Audit Conversion", value: `${data.snapshot.auditConversionRate}%` },
                { label: "Onboarding Complete", value: `${data.snapshot.onboardingCompletionRate}%` },
              ].map((s) => (
                <div key={s.label} style={{ background: C.bgElevated, padding: "1.25rem 1.375rem" }}>
                  <Label>{s.label}</Label>
                  <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1.375rem", color: C.cream, marginTop: "0.5rem" }}>{s.value}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Recent activity */}
        <section className="mt-10">
          <Label style={{ color: C.goldDim, marginBottom: "1rem" }}>Recent Activity</Label>
          <div style={{ border: `1px solid ${C.border}` }}>
            {data.recentActivity.map((item, i) => (
              <Link
                key={item.id}
                href={item.href}
                style={{
                  display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: "0.5rem",
                  textDecoration: "none", background: C.bgElevated, padding: "0.875rem 1.25rem",
                  borderBottom: i < data.recentActivity.length - 1 ? `1px solid ${C.border}` : "none",
                }}
              >
                <div>
                  <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.goldDim }}>{item.type}</p>
                  <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.cream, marginTop: "0.25rem" }}>{item.title}</p>
                  <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: "rgba(255,255,255,0.28)", marginTop: "0.2rem" }}>{item.sub}</p>
                </div>
                <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: "rgba(255,255,255,0.25)" }}>{fmtTime(item.at)}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Quick actions */}
        <section className="mt-10">
          <Label style={{ color: C.goldDim, marginBottom: "1rem" }}>Quick Actions</Label>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                style={{
                  fontFamily: C.sans, fontWeight: 500, fontSize: "0.4375rem", letterSpacing: "0.14em",
                  textTransform: "uppercase", textDecoration: "none", color: C.gold,
                  border: `1px solid ${C.borderGold}`, background: C.goldFaint, padding: "0.625rem 1rem",
                }}
              >
                {a.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
