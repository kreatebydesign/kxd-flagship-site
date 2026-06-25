/**
 * /admin/operations/clients
 * KXD OS — Client Portfolio (executive client dashboard)
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
import { buildClientDuplicateWarnings } from "@/lib/executive-client-profile-dashboard";

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
  border: "rgba(255,255,255,0.06)",
  borderGold: "rgba(201,169,98,0.14)",
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
  high: C.goldDim,
  medium: "rgba(245,241,232,0.55)",
  low: "rgba(245,241,232,0.38)",
};

const STATUS_COLOR: Record<string, string> = {
  active: C.goldDim,
  paused: C.creamMuted,
  "at-risk": C.red,
  archived: "rgba(255,255,255,0.35)",
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: C.sans,
        fontSize: "0.6875rem",
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase" as const,
        color: "rgba(255,255,255,0.28)",
      }}
    >
      {children}
    </p>
  );
}

function PendingBadge() {
  return (
    <span
      style={{
        display: "inline-block",
        marginTop: "0.5rem",
        fontFamily: C.sans,
        fontSize: "0.6875rem",
        fontWeight: 500,
        letterSpacing: "0.02em",
        color: "rgba(245,241,232,0.42)",
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${C.border}`,
        borderRadius: "999px",
        padding: "0.2rem 0.55rem",
        lineHeight: 1.4,
      }}
    >
      Profile Pending
    </span>
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
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const [clientsR, profilesR] = await Promise.allSettled([
    payload.find({ collection: "clients", limit: 200, depth: 0 }),
    payload.find({ collection: "executive-client-profiles", limit: 200, depth: 1 }),
  ]);

  const clients = clientsR.status === "fulfilled" ? (clientsR.value.docs as AnyDoc[]) : [];
  const profiles =
    profilesR.status === "fulfilled" ? (profilesR.value.docs as AnyDoc[]) : [];

  const profileByClientId = new Map<number, AnyDoc>();
  for (const profile of profiles) {
    const cid = resolveClientId(profile.client);
    if (cid) profileByClientId.set(cid, profile);
  }

  const rows = clients
    .map((client) =>
      mergeClientWithExecutiveProfile(client, profileByClientId.get(client.id as number)),
    )
    .sort((a, b) => {
      const priorityRank = (p: string | null) =>
        p === "critical" ? 0 : p === "high" ? 1 : p === "medium" ? 2 : p === "low" ? 3 : 4;
      const pr = priorityRank(a.internalPriority) - priorityRank(b.internalPriority);
      if (pr !== 0) return pr;
      return (b.monthlyRevenue ?? 0) - (a.monthlyRevenue ?? 0);
    });

  const totalMRR = rows.reduce((s, r) => s + (r.monthlyRevenue ?? 0), 0);
  const totalPotential = rows.reduce((s, r) => s + (r.potentialMonthlyRevenue ?? 0), 0);
  const activeRows = rows.filter((r) => r.clientStatus === "active");
  const activeCount = activeRows.length;
  const withProfiles = activeRows.filter((r) => r.hasExecutiveProfile).length;
  const criticalCount = rows.filter((r) => r.internalPriority === "critical").length;

  const duplicateWarnings = buildClientDuplicateWarnings(
    clients.map((client) => ({
      id: client.id as number,
      name: (client.name as string) || "Unknown",
      status: (client.status as string) || null,
      website: (client.companyWebsite as string) || null,
    })),
  );
  const duplicateCount = duplicateWarnings.size;

  return (
    <div style={{ minHeight: "100vh", background: C.bgBase, color: C.cream }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(8,8,8,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div className="mx-auto max-w-screen-xl px-6 py-5 flex items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <KxdLogo height={22} />
            <div>
              <Label>Client Intelligence</Label>
              <p
                style={{
                  fontFamily: C.serif,
                  fontWeight: 300,
                  fontSize: "1.375rem",
                  color: C.cream,
                  marginTop: "0.35rem",
                  lineHeight: 1.15,
                }}
              >
                Client Portfolio
              </p>
              <p
                style={{
                  fontFamily: C.sans,
                  fontSize: "0.8125rem",
                  color: C.creamMuted,
                  marginTop: "0.5rem",
                  lineHeight: 1.5,
                  maxWidth: "36rem",
                }}
              >
                Executive visibility across active relationships, revenue, health, and next
                actions.
              </p>
            </div>
          </div>
          <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: "rgba(245,241,232,0.45)" }}>
            {dateDisplay}
          </p>
        </div>
        <nav className="mx-auto max-w-screen-xl px-6 pb-4 flex flex-wrap gap-x-5 gap-y-2">
          {NAV_LINKS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              style={{
                fontFamily: C.sans,
                fontSize: "0.6875rem",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                textDecoration: "none",
                color:
                  href === "/admin/operations/clients" ? C.goldDim : "rgba(255,255,255,0.32)",
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-screen-xl px-6 py-12">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-12">
          {[
            {
              label: "Portfolio Coverage",
              value: `${withProfiles} / ${activeCount}`,
              sub: "Executive profiles among active clients",
            },
            {
              label: "Active Relationships",
              value: String(activeCount),
              sub: `${rows.length} total in roster`,
            },
            {
              label: "Portfolio MRR",
              value: fmtExecutiveMoney(totalMRR),
              sub: "Tracked monthly revenue",
            },
            {
              label: "Growth Potential",
              value: fmtExecutiveMoney(totalPotential),
              sub: "Estimated pipeline value",
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              style={{
                background: C.bgElevated,
                border: `1px solid ${C.border}`,
                borderRadius: "8px",
                padding: "1.5rem 1.5rem",
              }}
            >
              <Label>{kpi.label}</Label>
              <p
                style={{
                  fontFamily: C.serif,
                  fontWeight: 300,
                  fontSize: "1.625rem",
                  color: C.cream,
                  marginTop: "0.625rem",
                  lineHeight: 1,
                }}
              >
                {kpi.value}
              </p>
              <p
                style={{
                  fontFamily: C.sans,
                  fontSize: "0.75rem",
                  color: "rgba(245,241,232,0.45)",
                  marginTop: "0.5rem",
                  lineHeight: 1.45,
                }}
              >
                {kpi.sub}
              </p>
            </div>
          ))}
        </div>

        <div
          style={{
            borderBottom: `1px solid ${C.border}`,
            marginBottom: "1.25rem",
            paddingBottom: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "1.5rem",
          }}
        >
          <div>
            <Label>Portfolio Overview</Label>
            <p
              style={{
                fontFamily: C.sans,
                fontSize: "0.8125rem",
                color: "rgba(245,241,232,0.48)",
                marginTop: "0.5rem",
                lineHeight: 1.55,
              }}
            >
              Tier, revenue, health, and next actions across your active client base.
              {criticalCount > 0 && (
                <span style={{ color: C.goldDim }}>
                  {" "}
                  · {criticalCount} critical priority
                </span>
              )}
              {duplicateCount > 0 && (
                <span style={{ color: "rgba(232,196,104,0.75)" }}>
                  {" "}
                  · {duplicateCount} possible duplicate{duplicateCount === 1 ? "" : "s"} flagged
                </span>
              )}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexShrink: 0 }}>
            <Link
              href="/admin/operations/client-import"
              style={{
                fontFamily: C.sans,
                fontSize: "0.6875rem",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: C.goldDim,
                border: `1px solid ${C.borderGold}`,
                borderRadius: "6px",
                padding: "0.5rem 1rem",
                textDecoration: "none",
              }}
            >
              Import Client
            </Link>
            <Link
              href="/admin/operations/client-launch"
              style={{
                fontFamily: C.sans,
                fontSize: "0.6875rem",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: C.bgBase,
                background: C.gold,
                borderRadius: "6px",
                padding: "0.5rem 1rem",
                textDecoration: "none",
              }}
            >
              Launch Client
            </Link>
            <Link
              href="/admin/collections/executive-client-profiles"
              style={{
                fontFamily: C.sans,
                fontSize: "0.6875rem",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: C.goldDim,
                textDecoration: "none",
              }}
            >
              Edit Profiles →
            </Link>
          </div>
        </div>

        {rows.length === 0 ? (
          <div
            style={{
              background: C.bgElevated,
              border: `1px solid ${C.border}`,
              borderRadius: "8px",
              padding: "2.5rem",
              fontFamily: C.sans,
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.35)",
            }}
          >
            No clients found. Seed clients or add records in Payload.
          </div>
        ) : (
          <div
            style={{
              border: `1px solid ${C.border}`,
              background: C.bgElevated,
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <div
              className="hidden lg:grid"
              style={{
                gridTemplateColumns:
                  "minmax(0,1.4fr) minmax(0,0.5fr) minmax(0,0.7fr) minmax(0,0.7fr) minmax(0,0.5fr) minmax(0,0.6fr) minmax(0,1fr) minmax(0,0.6fr)",
                gap: "0.75rem",
                padding: "1rem 1.5rem",
                borderBottom: `1px solid ${C.border}`,
                fontFamily: C.sans,
                fontSize: "0.6875rem",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: "rgba(255,255,255,0.26)",
              }}
            >
              <span>Client</span>
              <span>Tier</span>
              <span>Monthly</span>
              <span>Potential</span>
              <span>Health</span>
              <span>Status</span>
              <span>Next Action</span>
              <span>Priority</span>
            </div>
            {rows.map((row) => {
              const duplicateHint = duplicateWarnings.get(row.clientId);
              return (
                <Link
                  key={row.clientId}
                  href={`/admin/operations/clients/${row.clientId}`}
                  className="block transition-colors hover:bg-white/[0.025]"
                  style={{
                    textDecoration: "none",
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  <div
                    className="grid gap-3 p-4 lg:grid-cols-8 lg:gap-3 lg:items-start lg:px-6 lg:py-4"
                    style={{ minWidth: 0 }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          fontFamily: C.serif,
                          fontWeight: 300,
                          fontSize: "1.0625rem",
                          color: C.cream,
                          lineHeight: 1.35,
                          wordBreak: "break-word",
                        }}
                      >
                        {row.name}
                      </p>
                      {!row.hasExecutiveProfile && <PendingBadge />}
                      {duplicateHint && (
                        <p
                          style={{
                            fontFamily: C.sans,
                            fontSize: "0.6875rem",
                            color: "rgba(232,196,104,0.75)",
                            marginTop: "0.5rem",
                            lineHeight: 1.45,
                            wordBreak: "break-word",
                          }}
                        >
                          {duplicateHint}
                        </p>
                      )}
                    </div>
                    <p
                      style={{
                        fontFamily: C.sans,
                        fontSize: "0.8125rem",
                        color: "rgba(245,241,232,0.55)",
                        lineHeight: 1.45,
                        wordBreak: "break-word",
                      }}
                    >
                      {tierLabel(row)}
                    </p>
                    <p
                      style={{
                        fontFamily: C.sans,
                        fontSize: "0.8125rem",
                        color: C.cream,
                        lineHeight: 1.45,
                      }}
                    >
                      {fmtExecutiveMoney(row.monthlyRevenue)}
                    </p>
                    <p
                      style={{
                        fontFamily: C.sans,
                        fontSize: "0.8125rem",
                        color: C.goldDim,
                        lineHeight: 1.45,
                      }}
                    >
                      {fmtExecutiveMoney(row.potentialMonthlyRevenue)}
                    </p>
                    <p
                      style={{
                        fontFamily: C.serif,
                        fontSize: "1rem",
                        fontWeight: 300,
                        color: C.cream,
                        lineHeight: 1.45,
                      }}
                    >
                      {row.healthScore ?? "—"}
                    </p>
                    <p
                      style={{
                        fontFamily: C.sans,
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        letterSpacing: "0.04em",
                        color: STATUS_COLOR[row.relationshipStatus ?? ""] ?? "rgba(245,241,232,0.45)",
                        lineHeight: 1.45,
                      }}
                    >
                      {statusLabel(row)}
                    </p>
                    <p
                      style={{
                        fontFamily: C.sans,
                        fontSize: "0.75rem",
                        color: "rgba(245,241,232,0.48)",
                        lineHeight: 1.55,
                        wordBreak: "break-word",
                        minWidth: 0,
                      }}
                    >
                      {row.nextAction ?? "—"}
                    </p>
                    <p
                      style={{
                        fontFamily: C.sans,
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        letterSpacing: "0.04em",
                        color:
                          PRIORITY_COLOR[row.internalPriority ?? ""] ?? "rgba(245,241,232,0.45)",
                        lineHeight: 1.45,
                      }}
                    >
                      {row.internalPriority
                        ? EXECUTIVE_PRIORITY_LABEL[row.internalPriority]
                        : "—"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
