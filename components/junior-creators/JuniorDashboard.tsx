"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { KxdLogo } from "@/components/ui/KxdLogo";
import { JuniorLeadForm } from "./JuniorLeadForm";
import { JuniorShiftCard } from "./JuniorShiftCard";
import type { JuniorCreatorStats } from "@/lib/junior-creators/stats";
import { formatEarningsCents, formatHoursFromMinutes } from "@/lib/junior-creators/week";
import { RESEARCH_SERVICE_LABEL, RESEARCH_STATUS_LABEL } from "@/lib/research-leads";

const C = {
  bgPure: "#050505",
  bgBase: "#080808",
  bgElevated: "#111111",
  bgCard: "#101010",
  gold: "#C9A962",
  goldDim: "rgba(201,169,98,0.55)",
  cream: "#F5F1E8",
  creamMuted: "rgba(245,241,232,0.72)",
  border: "rgba(255,255,255,0.08)",
  borderGold: "rgba(201,169,98,0.14)",
  serif: "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
  sans: "var(--font-outfit, 'Helvetica Neue', Arial, sans-serif)",
} as const;

export type JuniorLeadRow = {
  id: number;
  source: string;
  city: string | null;
  state: string | null;
  leadUrl: string | null;
  estimatedService: string | null;
  status: string;
  createdAt: string;
};

type Props = {
  displayName: string;
  stats: JuniorCreatorStats;
  recentLeads: JuniorLeadRow[];
};

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{
      fontFamily: C.sans, fontSize: "0.4375rem", fontWeight: 600,
      letterSpacing: "0.18em", textTransform: "uppercase",
      color: "rgba(255,255,255,0.3)", ...style,
    }}>
      {children}
    </p>
  );
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return "—"; }
}

export function JuniorDashboard({ displayName, stats, recentLeads }: Props) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/junior-creators/auth/logout", { method: "POST" });
    router.push("/junior-creators/login");
    router.refresh();
  }

  const thisWeekMetrics = [
    { label: "Hours This Week", value: formatHoursFromMinutes(stats.hoursWorkedMinutesThisWeek) },
    { label: "Est. Earnings", value: formatEarningsCents(stats.estimatedEarningsCentsThisWeek) },
    { label: "Leads Submitted", value: stats.submittedThisWeek },
    { label: "Qualified", value: stats.qualifiedThisWeek },
    { label: "Closed Won", value: stats.closedWonThisWeek },
  ];

  const personalBests = [
    { label: "Best Earnings Week", value: formatEarningsCents(stats.personalBests.bestEarningsWeekCents) },
    { label: "Most Hours (Week)", value: formatHoursFromMinutes(stats.personalBests.bestHoursWeekMinutes) },
    { label: "Most Leads (Week)", value: stats.personalBests.mostLeadsWeek },
  ];

  return (
    <div style={{ background: C.bgBase, minHeight: "100vh", color: C.cream, fontFamily: C.sans }}>
      <header style={{ background: C.bgPure, borderBottom: `1px solid ${C.borderGold}` }}>
        <div className="mx-auto flex max-w-screen-lg flex-wrap items-center justify-between gap-4" style={{ padding: "1.125rem 1.5rem" }}>
          <div className="flex items-center gap-4">
            <KxdLogo />
            <div>
              <p style={{ fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.16em", textTransform: "uppercase", color: C.creamMuted }}>
                KXD Academy · Junior Creators
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/junior-creators/leads" style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.goldDim, textDecoration: "none" }}>
              My Leads
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer" }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-lg" style={{ padding: "2.5rem 1.5rem 4rem" }}>
        <div style={{ marginBottom: "2.5rem", paddingBottom: "2rem", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.2em", textTransform: "uppercase", color: C.goldDim, marginBottom: "0.75rem" }}>
            Welcome back
          </p>
          <h1 style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "clamp(1.75rem, 4vw, 2.75rem)", lineHeight: 1.05 }}>
            Hey {displayName}
          </h1>
          <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.creamMuted, marginTop: "0.75rem", maxWidth: "32rem" }}>
            Your KXD Academy research desk — track your time, grow your pipeline, and build your rank.
          </p>
        </div>

        <JuniorShiftCard activeShift={stats.activeShift} />

        {/* Rank progress */}
        <div style={{ background: C.bgCard, border: `1px solid ${C.borderGold}`, padding: "1.5rem 1.625rem", marginBottom: "2rem" }}>
          <Label>Rank Progress</Label>
          <p style={{ fontFamily: C.serif, fontWeight: 400, fontSize: "1.75rem", color: C.gold, marginTop: "0.5rem" }}>
            {stats.rankTitle}
          </p>
          <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.creamMuted, marginTop: "0.35rem" }}>
            {stats.totalLeads} lifetime lead{stats.totalLeads === 1 ? "" : "s"} submitted
          </p>
          {stats.nextRank && (
            <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.creamMuted, marginTop: "0.5rem" }}>
              {stats.nextRank.leadsNeeded} more lead{stats.nextRank.leadsNeeded === 1 ? "" : "s"} to reach {stats.nextRank.title}
            </p>
          )}
        </div>

        {/* This week */}
        <section className="mb-10">
          <Label style={{ color: C.goldDim, marginBottom: "1rem" }}>This Week</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" style={{ gap: "1px", background: C.border, border: `1px solid ${C.border}` }}>
            {thisWeekMetrics.map((k) => (
              <div key={k.label} style={{ background: C.bgElevated, padding: "1.25rem 1.375rem" }}>
                <Label>{k.label}</Label>
                <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1.35rem", color: C.cream, marginTop: "0.5rem", lineHeight: 1 }}>
                  {k.value}
                </p>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: C.sans, fontSize: "0.5rem", color: "rgba(255,255,255,0.28)", marginTop: "0.625rem" }}>
            Earnings are estimated from logged shift time — not payroll or payment.
          </p>
        </section>

        {/* Personal bests */}
        <section className="mb-10">
          <Label style={{ color: C.goldDim, marginBottom: "1rem" }}>Personal Bests</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: "1px", background: C.border, border: `1px solid ${C.border}` }}>
            {personalBests.map((b) => (
              <div key={b.label} style={{ background: C.bgElevated, padding: "1.25rem 1.375rem" }}>
                <Label>{b.label}</Label>
                <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1.35rem", color: C.cream, marginTop: "0.5rem", lineHeight: 1 }}>
                  {b.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Submit form */}
        <section className="mb-10">
          <Label style={{ color: C.goldDim, marginBottom: "1rem" }}>Submit Research Lead</Label>
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, padding: "1.5rem 1.625rem" }}>
            <JuniorLeadForm />
          </div>
        </section>

        {/* Recent leads */}
        <section>
          <Label style={{ color: C.goldDim, marginBottom: "1rem" }}>Recent Submissions</Label>
          {recentLeads.length === 0 ? (
            <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, padding: "1.25rem 1.5rem" }}>
              <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: "rgba(255,255,255,0.3)" }}>
                No leads yet — your first submission starts your streak.
              </p>
            </div>
          ) : (
            <div style={{ border: `1px solid ${C.border}` }}>
              {recentLeads.slice(0, 8).map((lead, i) => {
                const loc = [lead.city, lead.state].filter(Boolean).join(", ") || "—";
                const service = lead.estimatedService
                  ? RESEARCH_SERVICE_LABEL[lead.estimatedService] ?? lead.estimatedService
                  : "—";
                return (
                  <div
                    key={lead.id}
                    style={{
                      background: C.bgElevated,
                      padding: "0.875rem 1.25rem",
                      borderBottom: i < Math.min(recentLeads.length, 8) - 1 ? `1px solid ${C.border}` : "none",
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.cream }}>{loc} · {service}</p>
                      <p style={{ fontFamily: C.sans, fontSize: "0.5rem", color: "rgba(255,255,255,0.28)", marginTop: "0.25rem" }}>
                        {fmtDate(lead.createdAt)} · {lead.source} · {RESEARCH_STATUS_LABEL[lead.status] ?? lead.status}
                      </p>
                    </div>
                    {lead.leadUrl && (
                      <a
                        href={lead.leadUrl.startsWith("http") ? lead.leadUrl : `https://${lead.leadUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.goldDim, textDecoration: "none" }}
                      >
                        Open URL
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
