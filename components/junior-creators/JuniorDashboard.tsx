"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { KxdLogo } from "@/components/ui/KxdLogo";
import { JuniorLeadForm } from "./JuniorLeadForm";
import { getNextRank } from "@/lib/junior-creators/ranks";
import type { JuniorCreatorStats } from "@/lib/junior-creators/stats";
import { RESEARCH_SERVICE_LABEL, RESEARCH_STATUS_LABEL } from "@/lib/research-leads";

const C = {
  bgPure: "#000000",
  bgBase: "#080808",
  bgElevated: "#111111",
  gold: "#C5A65C",
  goldDim: "rgba(197,166,92,0.55)",
  goldFaint: "rgba(197,166,92,0.08)",
  cream: "#f8f3ea",
  creamMuted: "#bfb7aa",
  green: "#5ec68c",
  border: "rgba(255,255,255,0.07)",
  borderGold: "rgba(197,166,92,0.22)",
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
  const nextRank = getNextRank(stats.totalLeads);

  async function handleLogout() {
    await fetch("/api/junior-creators/auth/logout", { method: "POST" });
    router.push("/junior-creators/login");
    router.refresh();
  }

  const KPI = [
    { label: "Submitted This Week", value: stats.submittedThisWeek },
    { label: "Qualified This Week", value: stats.qualifiedThisWeek },
    { label: "Closed Won This Week", value: stats.closedWonThisWeek },
    { label: "Total Leads", value: stats.totalLeads },
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
            Your KXD research command center — submit opportunities, build your rank, and grow with KXD Academy.
          </p>
        </div>

        {/* Rank card */}
        <div style={{ background: C.goldFaint, border: `1px solid ${C.borderGold}`, padding: "1.5rem 1.625rem", marginBottom: "2rem" }}>
          <Label>Current Rank</Label>
          <p style={{ fontFamily: C.serif, fontWeight: 400, fontSize: "1.75rem", color: C.gold, marginTop: "0.5rem" }}>
            {stats.rankTitle}
          </p>
          {nextRank && (
            <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.creamMuted, marginTop: "0.5rem" }}>
              {nextRank.leadsNeeded} more lead{nextRank.leadsNeeded === 1 ? "" : "s"} to reach {nextRank.title}
            </p>
          )}
        </div>

        {/* KPI grid */}
        <div className="mb-10 grid grid-cols-2 sm:grid-cols-4" style={{ gap: "1px", background: C.border, border: `1px solid ${C.border}` }}>
          {KPI.map((k) => (
            <div key={k.label} style={{ background: C.bgElevated, padding: "1.25rem 1.375rem" }}>
              <Label>{k.label}</Label>
              <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1.5rem", color: C.cream, marginTop: "0.5rem", lineHeight: 1 }}>
                {k.value}
              </p>
            </div>
          ))}
        </div>

        {/* Submit form */}
        <section className="mb-10">
          <Label style={{ color: C.goldDim, marginBottom: "1rem" }}>Submit Research Lead</Label>
          <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, padding: "1.5rem 1.625rem" }}>
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
