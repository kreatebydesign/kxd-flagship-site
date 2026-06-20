/**
 * /admin/operations/audits
 * KXD OS — Website Auditor lead dashboard (Phase 6A)
 */

import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import { KxdLogo } from "@/components/ui/KxdLogo";
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
  green: "#5ec68c",
  yellow: "#f0be50",
  teal: "#96d2c8",
  blue: "#8a9bd2",
  border: "rgba(255,255,255,0.07)",
  borderGold: "rgba(197,166,92,0.22)",
  serif: "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
  sans: "var(--font-outfit, 'Helvetica Neue', Arial, sans-serif)",
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

const STATUS_COLOR: Record<string, string> = {
  "new-lead": C.blue,
  contacted: C.yellow,
  qualified: C.teal,
  "proposal-sent": C.gold,
  "closed-won": C.green,
  "closed-lost": "rgba(255,255,255,0.35)",
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return "—"; }
}

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

export default async function AuditsDashboardPage() {
  const payload = await getPayload({ config });

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "website-audits" as any,
    limit: 250,
    depth: 0,
    sort: "-createdAt",
  });

  const audits = result.docs as AnyDoc[];
  const total = audits.length;
  const newLeads = audits.filter((a) => a.status === "new-lead").length;
  const qualified = audits.filter((a) => a.status === "qualified").length;
  const closedWon = audits.filter((a) => a.status === "closed-won").length;

  const KPI = [
    { label: "Total Audits", value: String(total), accent: C.cream },
    { label: "New Leads", value: String(newLeads), accent: C.blue },
    { label: "Qualified Leads", value: String(qualified), accent: C.teal },
    { label: "Closed Won", value: String(closedWon), accent: C.green },
  ];

  return (
    <div style={{ background: C.bgBase, minHeight: "100vh", color: C.cream, fontFamily: C.sans }}>
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: C.bgPure, borderBottom: `1px solid ${C.gold}40` }}>
        <div className="mx-auto max-w-screen-xl" style={{ padding: "1.125rem 1.5rem" }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <KxdLogo />
              <div>
                <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.5625rem", letterSpacing: "0.16em", textTransform: "uppercase", color: C.creamMuted }}>
                  Website Auditor
                </p>
              </div>
              <span style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.goldDim, background: C.goldFaint, border: `1px solid ${C.borderGold}`, padding: "0.2rem 0.6rem" }}>
                Phase 6A
              </span>
            </div>
            <div className="flex items-center gap-5">
              <Link href="/admin/operations/executive" style={{ fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>
                ← Executive
              </Link>
              <Link href="/admin/collections/website-audits" style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.5rem", letterSpacing: "0.14em", textTransform: "uppercase", color: C.gold, opacity: 0.8, textDecoration: "none" }}>
                Payload →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl" style={{ padding: "2.5rem 1.5rem 5rem" }}>
        <div style={{ marginBottom: "2.5rem", paddingBottom: "2rem", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.2em", textTransform: "uppercase", color: C.goldDim, marginBottom: "0.875rem" }}>
            KXD OS · Website Auditor
          </p>
          <h1 style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "clamp(1.875rem, 5vw, 3rem)", color: C.cream }}>
            Audit Lead Command Center
          </h1>
          <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.creamMuted, marginTop: "0.75rem", maxWidth: "36rem" }}>
            Public website audit submissions — scores, grades, and pipeline status for KXD sales follow-up.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: "1px", background: C.border, border: `1px solid ${C.border}`, marginBottom: "2.5rem" }}>
          {KPI.map((k) => (
            <div key={k.label} style={{ background: C.bgElevated, padding: "1.375rem 1.5rem" }}>
              <Label>{k.label}</Label>
              <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "clamp(1.375rem, 2.2vw, 1.875rem)", color: k.accent, marginTop: "0.625rem" }}>
                {k.value}
              </p>
            </div>
          ))}
        </div>

        <Label style={{ color: C.goldDim, letterSpacing: "0.16em", marginBottom: "0.875rem" }}>All Audits</Label>
        {audits.length === 0 ? (
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.3)" }}>
            No audits yet. Share /website-audit to generate leads.
          </p>
        ) : (
          <div style={{ border: `1px solid ${C.border}` }}>
            <div className="hidden sm:grid" style={{ gridTemplateColumns: "1.5fr 1.5fr 0.6fr 1fr 1fr", gap: "1px", background: C.border }}>
              {["Company", "Website", "Score", "Status", "Date"].map((h) => (
                <div key={h} style={{ background: "#141414", padding: "0.75rem 1.25rem" }}>
                  <Label>{h}</Label>
                </div>
              ))}
            </div>
            {audits.map((a) => {
              const status = String(a.status ?? "new-lead");
              return (
                <div key={a.id as number} className="grid grid-cols-1 sm:grid-cols-5" style={{ gap: "1px", background: C.border }}>
                  <div style={{ background: C.bgElevated, padding: "1rem 1.25rem" }}>
                    <Link href={`/admin/collections/website-audits/${a.id}`} style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.625rem", color: C.cream, textDecoration: "none" }}>
                      {a.company || a.name || "—"}
                    </Link>
                    <p style={{ fontFamily: C.sans, fontSize: "0.5rem", color: "rgba(255,255,255,0.25)", marginTop: "0.25rem" }}>{a.email as string}</p>
                  </div>
                  <div style={{ background: C.bgElevated, padding: "1rem 1.25rem" }}>
                    <a href={a.website as string} target="_blank" rel="noopener noreferrer" style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.goldDim, textDecoration: "none" }}>
                      {a.website as string}
                    </a>
                  </div>
                  <div style={{ background: C.bgElevated, padding: "1rem 1.25rem" }}>
                    <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1.125rem", color: C.cream }}>
                      {a.overallScore as number} <span style={{ fontSize: "0.625rem", color: C.goldDim }}>{a.grade as string}</span>
                    </p>
                  </div>
                  <div style={{ background: C.bgElevated, padding: "1rem 1.25rem" }}>
                    <span style={{ fontFamily: C.sans, fontWeight: 600, fontSize: "0.4375rem", letterSpacing: "0.12em", textTransform: "uppercase", color: STATUS_COLOR[status] ?? C.creamMuted }}>
                      {AUDIT_STATUS_LABEL[status] ?? status}
                    </span>
                  </div>
                  <div style={{ background: C.bgElevated, padding: "1rem 1.25rem" }}>
                    <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.creamMuted }}>{fmtDate(a.createdAt as string)}</p>
                    <Link href={`/website-audit/results/${a.id}`} style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: C.goldDim, textDecoration: "none", marginTop: "0.25rem", display: "block" }}>
                      Public report →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
