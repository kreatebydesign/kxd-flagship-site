/**
 * /admin/operations/playbooks
 * KXD OS — Internal SOP / Playbook Library
 */

import Link from "next/link";
import { KxdLogo } from "@/components/ui/KxdLogo";
import { BADGE_COLORS, PLAYBOOKS } from "@/lib/playbooks";

export const dynamic = "force-dynamic";

const C = {
  bgPure: "#050505",
  bgBase: "#080808",
  bgElevated: "#0B0B0B",
  gold: "#C9A962",
  goldDim: "rgba(201,169,98,0.55)",
  goldFaint: "rgba(255,255,255,0.035)",
  cream: "#F5F1E8",
  creamMuted: "rgba(245,241,232,0.72)",
  border: "rgba(255,255,255,0.08)",
  borderGold: "rgba(201,169,98,0.16)",
  serif: "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
  sans: "var(--font-outfit, 'Helvetica Neue', Arial, sans-serif)",
} as const;

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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: C.sans, fontSize: "0.6875rem", fontWeight: 600,
      letterSpacing: "0.18em", textTransform: "uppercase" as const,
      color: "rgba(255,255,255,0.3)",
    }}>
      {children}
    </p>
  );
}

export default function PlaybooksPage() {
  return (
    <div style={{ background: C.bgBase, minHeight: "100vh", color: C.cream, fontFamily: C.sans }}>
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: C.bgPure, borderBottom: `1px solid ${C.gold}40` }}>
        <div className="mx-auto max-w-screen-xl" style={{ padding: "1.125rem 1.5rem" }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <KxdLogo />
              <div>
                <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.8125rem", letterSpacing: "0.16em", textTransform: "uppercase", color: C.creamMuted }}>
                  Playbooks
                </p>
                <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.24)", marginTop: "0.35rem" }}>
                  Internal SOP Library
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {NAV_LINKS.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  style={{
                    fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: href === "/admin/operations/playbooks" ? C.gold : "rgba(255,255,255,0.3)",
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
          <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.2em", textTransform: "uppercase", color: C.goldDim, marginBottom: "0.875rem" }}>
            KXD OS · Internal Playbooks
          </p>
          <h1 style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "clamp(1.875rem, 5vw, 3rem)", color: C.cream, lineHeight: 1.05 }}>
            SOP & Playbook Library
          </h1>
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted, marginTop: "0.75rem", maxWidth: "36rem" }}>
            Core KXD operating procedures — launch, DNS, analytics, client success, and emergency response.
            Reference checklists for consistent delivery across the team.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {PLAYBOOKS.map((playbook) => {
            const badge = BADGE_COLORS[playbook.badge];
            return (
              <article
                key={playbook.id}
                style={{
                  background: C.bgElevated,
                  border: `1px solid ${C.border}`,
                  padding: "1.5rem 1.625rem",
                }}
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <h2 style={{ fontFamily: C.serif, fontWeight: 400, fontSize: "1.25rem", color: C.cream, lineHeight: 1.2 }}>
                    {playbook.title}
                  </h2>
                  <span style={{
                    fontFamily: C.sans, fontSize: "0.6875rem", fontWeight: 600,
                    letterSpacing: "0.14em", textTransform: "uppercase",
                    color: badge.color, background: badge.bg,
                    border: `1px solid ${badge.border}`, padding: "0.25rem 0.5rem",
                    flexShrink: 0,
                  }}>
                    {playbook.badge}
                  </span>
                </div>
                <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", color: C.creamMuted, lineHeight: 1.55, marginBottom: "1.25rem" }}>
                  {playbook.description}
                </p>
                <Label>Checklist</Label>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {playbook.checklist.map((item) => (
                    <li
                      key={item}
                      style={{
                        fontFamily: C.sans, fontSize: "0.625rem", color: "rgba(255,255,255,0.55)",
                        padding: "0.4rem 0", borderBottom: `1px solid ${C.border}`,
                        display: "flex", alignItems: "baseline", gap: "0.625rem",
                      }}
                    >
                      <span style={{ color: C.goldDim, fontSize: "0.8125rem" }}>◆</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.22)", marginTop: "2.5rem", letterSpacing: "0.06em" }}>
          Static reference library · Edit playbooks in <code style={{ color: C.goldDim }}>lib/playbooks.ts</code>
        </p>
      </div>
    </div>
  );
}
