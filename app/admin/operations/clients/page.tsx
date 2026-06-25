/**
 * /admin/operations/clients
 * KXD OS Phase 1 — Executive Client Command Center
 */

import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import { KxdLogo } from "@/components/ui/KxdLogo";
import {
  EXECUTIVE_PRIORITY_LABEL,
  EXECUTIVE_STATUS_LABEL,
  EXECUTIVE_TIER_LABEL,
  fmtExecutiveMoney,
  mergeClientWithExecutiveProfile,
  resolveClientId,
  type AnyDoc,
  type MergedExecutiveClientRow,
} from "@/lib/executive-client-profile";

export const dynamic = "force-dynamic";

const C = {
  bgPure: "#050505",
  bgBase: "#080808",
  bgElevated: "#0B0B0B",
  bgCard: "#101010",
  gold: "#C9A962",
  goldDim: "rgba(201,169,98,0.55)",
  cream: "#F5F1E8",
  creamMuted: "rgba(245,241,232,0.72)",
  red: "#d25a5a",
  yellow: "#E8C468",
  teal: "#A8B4C8",
  border: "rgba(255,255,255,0.08)",
  borderGold: "rgba(201,169,98,0.16)",
  serif: "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
  sans: "var(--font-outfit, 'Helvetica Neue', Arial, sans-serif)",
} as const;

const NAV_LINKS = [
  ["/admin/operations/executive", "Executive"],
  ["/admin/operations/command", "Operations"],
  ["/admin/operations/today", "Today"],
  ["/admin/operations/clients", "Clients"],
  ["/admin/operations/accounts", "Accounts"],
  ["/admin/operations/onboarding", "Onboarding"],
  ["/admin/operations/founder", "Founder"],
  ["/admin/operations/creative", "Creative"],
] as const;

const PRIORITY_COLOR: Record<string, string> = {
  critical: C.red,
  high: C.gold,
  medium: C.yellow,
  low: C.creamMuted,
};

const STATUS_COLOR: Record<string, string> = {
  active: C.gold,
  paused: C.creamMuted,
  "at-risk": C.red,
  archived: "rgba(255,255,255,0.35)",
};

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

function tierLabel(row: MergedExecutiveClientRow): string {
  if (row.tier) return EXECUTIVE_TIER_LABEL[row.tier];
  if (row.brandTier) return row.brandTier.replace(/-/g, " ");
  return "—";
}

function statusLabel(row: MergedExecutiveClientRow): string {
  if (row.relationshipStatus) return EXECUTIVE_STATUS_LABEL[row.relationshipStatus];
  return row.clientStatus ?? "—";
}

export default async function ExecutiveClientsPage() {
  const payload = await getPayload({ config });
  const now = new Date();
  const dateDisplay = now.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const [clientsR, profilesR] = await Promise.allSettled([
    payload.find({ collection: "clients", limit: 200, depth: 0 }),
    payload.find({ collection: "executive-client-profiles", limit: 200, depth: 1 }),
  ]);

  const clients = clientsR.status === "fulfilled" ? clientsR.value.docs as AnyDoc[] : [];
  const profiles = profilesR.status === "fulfilled" ? profilesR.value.docs as AnyDoc[] : [];

  const profileByClientId = new Map<number, AnyDoc>();
  for (const profile of profiles) {
    const cid = resolveClientId(profile.client);
    if (cid) profileByClientId.set(cid, profile);
  }

  const rows = clients
    .map((client) => mergeClientWithExecutiveProfile(client, profileByClientId.get(client.id as number)))
    .sort((a, b) => {
      const priorityRank = (p: string | null) =>
        p === "critical" ? 0 : p === "high" ? 1 : p === "medium" ? 2 : p === "low" ? 3 : 4;
      const pr = priorityRank(a.internalPriority) - priorityRank(b.internalPriority);
      if (pr !== 0) return pr;
      return (b.monthlyRevenue ?? 0) - (a.monthlyRevenue ?? 0);
    });

  const totalMRR = rows.reduce((s, r) => s + (r.monthlyRevenue ?? 0), 0);
  const totalPotential = rows.reduce((s, r) => s + (r.potentialMonthlyRevenue ?? 0), 0);
  const withProfiles = rows.filter((r) => r.hasExecutiveProfile).length;
  const criticalCount = rows.filter((r) => r.internalPriority === "critical").length;

  return (
    <div style={{ minHeight: "100vh", background: C.bgBase, color: C.cream }}>
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(8,8,8,0.92)", backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div className="mx-auto max-w-screen-xl px-6 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <KxdLogo height={22} />
            <div>
              <Label>Executive Layer · Phase 1</Label>
              <p style={{
                fontFamily: C.serif, fontWeight: 300, fontSize: "1.25rem",
                color: C.cream, marginTop: "0.25rem", lineHeight: 1.1,
              }}>
                Client Command Center
              </p>
            </div>
          </div>
          <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.creamMuted }}>
            {dateDisplay}
          </p>
        </div>
        <nav className="mx-auto max-w-screen-xl px-6 pb-3 flex flex-wrap gap-x-5 gap-y-2">
          {NAV_LINKS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              style={{
                fontFamily: C.sans, fontSize: "0.625rem", fontWeight: 500,
                letterSpacing: "0.14em", textTransform: "uppercase" as const,
                textDecoration: "none",
                color: href === "/admin/operations/clients" ? C.gold : "rgba(255,255,255,0.35)",
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-screen-xl px-6 py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          {[
            { label: "Active Clients", value: String(rows.length), sub: `${withProfiles} executive profiles` },
            { label: "Monthly Revenue", value: fmtExecutiveMoney(totalMRR), sub: "Current tracked MRR" },
            { label: "Potential MRR", value: fmtExecutiveMoney(totalPotential), sub: "Executive pipeline" },
            { label: "Critical Priority", value: String(criticalCount), sub: "Needs founder attention" },
          ].map((kpi) => (
            <div key={kpi.label} style={{
              background: C.bgElevated, border: `1px solid ${C.border}`, padding: "1.25rem 1.375rem",
            }}>
              <Label>{kpi.label}</Label>
              <p style={{
                fontFamily: C.serif, fontWeight: 300, fontSize: "1.5rem",
                color: C.cream, marginTop: "0.5rem", lineHeight: 1,
              }}>
                {kpi.value}
              </p>
              <p style={{
                fontFamily: C.sans, fontSize: "0.75rem", color: C.creamMuted, marginTop: "0.375rem",
              }}>
                {kpi.sub}
              </p>
            </div>
          ))}
        </div>

        <div style={{
          borderBottom: `1px solid ${C.border}`, marginBottom: "1rem",
          paddingBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "baseline",
        }}>
          <div>
            <Label>Executive Accounts</Label>
            <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted, marginTop: "0.375rem" }}>
              Tier, revenue, health, and next actions across the KXD client base.
            </p>
          </div>
          <Link
            href="/admin/collections/executive-client-profiles"
            style={{
              fontFamily: C.sans, fontSize: "0.6875rem", fontWeight: 500,
              letterSpacing: "0.14em", textTransform: "uppercase" as const,
              color: C.goldDim, textDecoration: "none",
            }}
          >
            Edit Profiles →
          </Link>
        </div>

        {rows.length === 0 ? (
          <div style={{
            background: C.bgElevated, border: `1px solid ${C.border}`, padding: "2rem",
            fontFamily: C.sans, fontSize: "0.875rem", color: "rgba(255,255,255,0.35)",
          }}>
            No clients found. Seed clients or add records in Payload.
          </div>
        ) : (
          <div style={{ border: `1px solid ${C.border}`, background: C.bgElevated }}>
            <div className="hidden lg:grid" style={{
              gridTemplateColumns: "1.4fr 0.5fr 0.7fr 0.7fr 0.5fr 0.6fr 1fr 0.6fr",
              gap: "0.75rem", padding: "0.875rem 1.25rem",
              borderBottom: `1px solid ${C.border}`,
              fontFamily: C.sans, fontSize: "0.625rem", fontWeight: 600,
              letterSpacing: "0.14em", textTransform: "uppercase" as const,
              color: "rgba(255,255,255,0.28)",
            }}>
              <span>Client</span>
              <span>Tier</span>
              <span>Monthly</span>
              <span>Potential</span>
              <span>Health</span>
              <span>Status</span>
              <span>Next Action</span>
              <span>Priority</span>
            </div>
            {rows.map((row) => (
              <Link
                key={row.clientId}
                href={`/admin/operations/clients/${row.clientId}`}
                className="block"
                style={{
                  textDecoration: "none",
                  borderBottom: `1px solid ${C.border}`,
                  transition: "background 0.15s ease",
                }}
              >
                <div className="grid gap-3 p-4 lg:grid-cols-8 lg:gap-3 lg:items-center lg:px-5 lg:py-3.5">
                  <div>
                    <p style={{
                      fontFamily: C.serif, fontWeight: 300, fontSize: "1.0625rem", color: C.cream,
                    }}>
                      {row.name}
                    </p>
                    {!row.hasExecutiveProfile && (
                      <p style={{
                        fontFamily: C.sans, fontSize: "0.6875rem", color: C.yellow, marginTop: "0.25rem",
                      }}>
                        No executive profile
                      </p>
                    )}
                  </div>
                  <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted }}>
                    {tierLabel(row)}
                  </p>
                  <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.cream }}>
                    {fmtExecutiveMoney(row.monthlyRevenue)}
                  </p>
                  <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.goldDim }}>
                    {fmtExecutiveMoney(row.potentialMonthlyRevenue)}
                  </p>
                  <p style={{ fontFamily: C.serif, fontSize: "1rem", color: C.cream }}>
                    {row.healthScore ?? "—"}
                  </p>
                  <p style={{
                    fontFamily: C.sans, fontSize: "0.6875rem", fontWeight: 600,
                    letterSpacing: "0.1em", textTransform: "uppercase" as const,
                    color: STATUS_COLOR[row.relationshipStatus ?? ""] ?? C.creamMuted,
                  }}>
                    {statusLabel(row)}
                  </p>
                  <p style={{
                    fontFamily: C.sans, fontSize: "0.75rem", color: C.creamMuted,
                    lineHeight: 1.45, overflow: "hidden", display: "-webkit-box",
                    WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                  }}>
                    {row.nextAction ?? "—"}
                  </p>
                  <p style={{
                    fontFamily: C.sans, fontSize: "0.6875rem", fontWeight: 600,
                    letterSpacing: "0.1em", textTransform: "uppercase" as const,
                    color: PRIORITY_COLOR[row.internalPriority ?? ""] ?? C.creamMuted,
                  }}>
                    {row.internalPriority
                      ? EXECUTIVE_PRIORITY_LABEL[row.internalPriority]
                      : "—"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
