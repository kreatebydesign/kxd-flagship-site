/**
 * /admin/operations/onboarding
 * KXD OS — Client Onboarding System
 * Phase 4A
 *
 * Structured intake workflow dashboard: status overview, readiness scores,
 * missing requirements, and onboarding record table.
 */

import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import { KxdLogo } from "@/components/ui/KxdLogo";
import {
  calculateOnboardingReadiness,
  getMissingClientRequirements,
  getOnboardingChecklists,
  getOnboardingWorkflowStatus,
  onboardingStatusLabel,
  onboardingWorkflowLabel,
  type ChecklistItem,
  type OnboardingWorkflowStatus,
  type ReadinessLabel,
} from "@/lib/client-onboarding";

export const dynamic = "force-dynamic";

// ── Brand tokens ──────────────────────────────────────────────────────────────

const C = {
  bgPure:      "#000000",
  bgBase:      "#080808",
  bgElevated:  "#111111",
  bgCard:      "#141414",
  gold:        "#C5A65C",
  goldDim:     "rgba(197,166,92,0.55)",
  goldFaint:   "rgba(197,166,92,0.08)",
  cream:       "#f8f3ea",
  creamMuted:  "#bfb7aa",
  red:         "#d25a5a",
  redFaint:    "rgba(210,90,90,0.08)",
  redBorder:   "rgba(210,90,90,0.25)",
  yellow:      "#f0be50",
  yellowFaint: "rgba(240,190,80,0.08)",
  green:       "#5ec68c",
  greenFaint:  "rgba(94,198,140,0.07)",
  greenBorder: "rgba(94,198,140,0.25)",
  teal:        "#96d2c8",
  blue:        "#8a9bd2",
  purple:      "#b48cdc",
  border:      "rgba(255,255,255,0.07)",
  borderGold:  "rgba(197,166,92,0.22)",
  serif:       "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
  sans:        "var(--font-outfit, 'Helvetica Neue', Arial, sans-serif)",
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function clientName(raw: unknown): string {
  if (!raw) return "Unknown";
  if (typeof raw === "object" && raw !== null && "name" in raw)
    return (raw as AnyDoc).name as string || "Unknown";
  return "Unknown";
}

function clientId(raw: unknown): number | null {
  if (!raw) return null;
  if (typeof raw === "object" && raw !== null && "id" in raw)
    return (raw as AnyDoc).id as number;
  if (typeof raw === "number") return raw;
  return null;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return "—"; }
}

const STATUS_COLOR: Record<string, string> = {
  draft:       "rgba(255,255,255,0.35)",
  sent:        C.blue,
  "in-progress": C.yellow,
  submitted:   C.teal,
  approved:    C.green,
};

const READINESS_COLOR: Record<ReadinessLabel, string> = {
  Ready:                    C.green,
  "Needs Information":      C.yellow,
  "Missing Critical Items": C.red,
};

const WORKFLOW_COLOR: Record<OnboardingWorkflowStatus, string> = {
  draft: "rgba(255,255,255,0.35)",
  "waiting-on-client": C.yellow,
  "waiting-on-kxd": C.teal,
  "ready-for-build": C.green,
  approved: C.green,
};

function ChecklistPanel({ title, items }: { title: string; items: ChecklistItem[] }) {
  const done = items.filter((i) => i.done).length;
  return (
    <div style={{ minWidth: "10rem" }}>
      <p style={{
        fontFamily: C.sans, fontSize: "0.4375rem", fontWeight: 600,
        letterSpacing: "0.14em", textTransform: "uppercase",
        color: C.goldDim, marginBottom: "0.5rem",
      }}>
        {title} · {done}/{items.length}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        {items.map((item) => (
          <p
            key={item.label}
            style={{
              fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.02em",
              color: item.done ? C.green : item.critical ? C.red : "rgba(255,255,255,0.35)",
            }}
          >
            {item.done ? "✓" : "○"} {item.label}
          </p>
        ))}
      </div>
    </div>
  );
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

function SectionHeader({
  label, sub, href, linkText,
}: { label: string; sub?: string; href?: string; linkText?: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "baseline", justifyContent: "space-between",
      marginBottom: "1.125rem", paddingBottom: "0.75rem",
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div>
        <Label style={{ marginBottom: "0.375rem" }}>{label}</Label>
        {sub && (
          <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.creamMuted, letterSpacing: "0.02em" }}>
            {sub}
          </p>
        )}
      </div>
      {href && (
        <Link href={href} style={{
          fontFamily: C.sans, fontWeight: 500, fontSize: "0.4375rem",
          letterSpacing: "0.14em", textTransform: "uppercase" as const,
          color: C.goldDim, textDecoration: "none",
        }}>
          {linkText ?? "View →"}
        </Link>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      background: C.bgElevated, border: `1px solid ${C.border}`,
      padding: "1.375rem 1.5rem", display: "flex", alignItems: "center", gap: "0.875rem",
    }}>
      <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
      <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em" }}>
        {message}
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function OnboardingDashboardPage() {
  const payload = await getPayload({ config });

  const onboardingsR = await Promise.allSettled([
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-onboarding" as any,
      limit: 200,
      depth: 1,
      sort: "-updatedAt",
    }),
  ]);

  const onboardings =
    onboardingsR[0].status === "fulfilled" ? onboardingsR[0].value.docs as AnyDoc[] : [];

  const total = onboardings.length;

  const enriched = onboardings.map((doc) => {
    const readiness = calculateOnboardingReadiness(doc);
    const missing   = getMissingClientRequirements(doc);
    const checklists = getOnboardingChecklists(doc);
    const workflow   = getOnboardingWorkflowStatus(doc);
    return { doc, readiness, missing, checklists, workflow };
  });

  const workflowCounts = {
    waitingOnClient: enriched.filter((e) => e.workflow === "waiting-on-client").length,
    waitingOnKxd: enriched.filter((e) => e.workflow === "waiting-on-kxd").length,
    readyForBuild: enriched.filter((e) => e.workflow === "ready-for-build").length,
    approved: enriched.filter((e) => e.workflow === "approved").length,
  };

  const activeIntakes = enriched
    .filter((e) => e.workflow !== "approved")
    .sort((a, b) => b.readiness.score - a.readiness.score)
    .slice(0, 6);

  const withMissing = enriched
    .filter((e) => e.missing.all.length > 0)
    .sort((a, b) => b.missing.all.length - a.missing.all.length);

  const KPI = [
    { label: "Total Onboardings", value: String(total),      accent: C.cream },
    { label: "Waiting on Client", value: String(workflowCounts.waitingOnClient), accent: C.yellow },
    { label: "Waiting on KXD",    value: String(workflowCounts.waitingOnKxd),    accent: C.teal },
    { label: "Ready for Build",   value: String(workflowCounts.readyForBuild),   accent: C.green },
    { label: "Approved",          value: String(workflowCounts.approved),        accent: C.green },
  ];

  return (
    <div style={{
      background: C.bgBase, minHeight: "100vh", color: C.cream,
      fontFamily: C.sans, WebkitFontSmoothing: "antialiased",
    }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: C.bgPure, borderBottom: `1px solid ${C.gold}40`,
      }}>
        <div className="mx-auto max-w-screen-xl" style={{ padding: "1.125rem 1.5rem" }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <KxdLogo />
              <span style={{ color: "rgba(255,255,255,0.1)", fontSize: "0.375rem" }}>◆</span>
              <div>
                <p style={{
                  fontFamily: C.sans, fontWeight: 500, fontSize: "0.5625rem",
                  letterSpacing: "0.16em", textTransform: "uppercase", color: C.creamMuted,
                }}>
                  Onboarding
                </p>
                <p className="hidden sm:block" style={{
                  fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.1em",
                  textTransform: "uppercase", color: "rgba(255,255,255,0.24)", marginTop: "0.35rem",
                }}>
                  Client Intake Workflow
                </p>
              </div>
              <span style={{
                fontFamily: C.sans, fontWeight: 500, fontSize: "0.375rem",
                letterSpacing: "0.12em", textTransform: "uppercase",
                color: C.goldDim, background: C.goldFaint,
                border: `1px solid ${C.borderGold}`, padding: "0.2rem 0.6rem",
              }}>
                Phase 4A
              </span>
            </div>
            <div className="flex items-center gap-5">
              <Link href="/admin/operations/executive" style={{
                fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.12em",
                textTransform: "uppercase", color: "rgba(255,255,255,0.3)", textDecoration: "none",
              }}>
                ← Operations
              </Link>
              <Link href="/admin/collections/client-onboarding" style={{
                fontFamily: C.sans, fontWeight: 500, fontSize: "0.5rem",
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: C.gold, opacity: 0.8, textDecoration: "none",
              }}>
                New Intake →
              </Link>
              <Link href="/admin" style={{
                fontFamily: C.sans, fontWeight: 500, fontSize: "0.5rem",
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: C.goldDim, textDecoration: "none",
              }}>
                Payload →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-screen-xl" style={{ padding: "2.5rem 1.5rem 5rem" }}>

        {/* Title */}
        <div style={{ marginBottom: "2.5rem", paddingBottom: "2rem", borderBottom: `1px solid ${C.border}` }}>
          <p style={{
            fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.2em",
            textTransform: "uppercase", color: C.goldDim, marginBottom: "0.875rem",
          }}>
            KXD OS · Client Onboarding
          </p>
          <h1 style={{
            fontFamily: C.serif, fontWeight: 300,
            fontSize: "clamp(1.875rem, 5vw, 3rem)",
            lineHeight: 1.02, color: C.cream, letterSpacing: "-0.01em",
          }}>
            Onboarding Command Center
          </h1>
          <p style={{
            fontFamily: C.sans, fontSize: "0.5625rem", color: C.creamMuted,
            letterSpacing: "0.04em", marginTop: "0.75rem", maxWidth: "36rem",
          }}>
            Structured client intake — business information, brand assets, access credentials,
            and project goals. Eliminates manual asset collection.
          </p>
        </div>

        {/* KPI strip */}
        <div style={{ marginBottom: "0.875rem" }}>
          <Label style={{ color: C.goldDim, letterSpacing: "0.16em" }}>Overview</Label>
        </div>
        <div
          className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5"
          style={{ gap: "1px", background: C.border, border: `1px solid ${C.border}`, marginBottom: "2.5rem" }}
        >
          {KPI.map((kpi) => (
            <div key={kpi.label} style={{ background: C.bgElevated, padding: "1.375rem 1.5rem" }}>
              <Label>{kpi.label}</Label>
              <p style={{
                fontFamily: C.serif, fontWeight: 300,
                fontSize: "clamp(1.375rem, 2.2vw, 1.875rem)",
                lineHeight: 1, color: kpi.accent, marginTop: "0.625rem",
              }}>
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        {/* Active intake detail panels */}
        <div style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label="Active Intake Detail"
            sub="Readiness score, asset checklists, domain/DNS, brand, content, and internal notes"
            href="/admin/collections/client-onboarding"
            linkText="All Intakes →"
          />
          {activeIntakes.length === 0 ? (
            <EmptyState message="No active onboarding intakes — all records approved or none created yet." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: C.border, border: `1px solid ${C.border}` }}>
              {activeIntakes.map(({ doc, readiness, checklists, workflow }) => {
                const name = clientName(doc.client) || doc.businessName || "Unknown";
                const cid = clientId(doc.client);
                const workflowColor = WORKFLOW_COLOR[workflow];
                const notes = doc.notes ? String(doc.notes).trim() : "";

                return (
                  <div key={doc.id as number} style={{ background: C.bgElevated, padding: "1.5rem 1.625rem" }}>
                    <div className="flex flex-wrap items-start justify-between gap-4" style={{ marginBottom: "1.25rem" }}>
                      <div>
                        {cid ? (
                          <Link href={`/admin/collections/clients/${cid}`} style={{
                            fontFamily: C.sans, fontWeight: 500, fontSize: "0.875rem", color: C.cream, textDecoration: "none",
                          }}>
                            {name}
                          </Link>
                        ) : (
                          <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.875rem", color: C.cream }}>{name}</p>
                        )}
                        <p style={{ fontFamily: C.sans, fontSize: "0.5rem", color: C.creamMuted, marginTop: "0.35rem" }}>
                          {onboardingStatusLabel(doc.status as string)} · Updated {fmtDate(doc.updatedAt as string)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div style={{ textAlign: "right" }}>
                          <Label>Readiness</Label>
                          <p style={{
                            fontFamily: C.serif, fontWeight: 300, fontSize: "1.5rem",
                            color: readiness.score >= 85 ? C.green : readiness.score >= 50 ? C.yellow : C.red,
                            marginTop: "0.25rem",
                          }}>
                            {readiness.score}%
                          </p>
                        </div>
                        <span style={{
                          fontFamily: C.sans, fontSize: "0.4375rem", fontWeight: 600,
                          letterSpacing: "0.12em", textTransform: "uppercase",
                          color: workflowColor, border: `1px solid ${workflowColor}40`,
                          background: workflow === "ready-for-build" ? C.greenFaint : workflow === "waiting-on-client" ? C.yellowFaint : "rgba(255,255,255,0.04)",
                          padding: "0.3rem 0.6rem",
                        }}>
                          {onboardingWorkflowLabel(workflow)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-6" style={{ marginBottom: "1rem" }}>
                      <ChecklistPanel title="Client Assets" items={checklists.assets} />
                      <ChecklistPanel title="Domain / DNS" items={checklists.domainDns} />
                      <ChecklistPanel title="Brand Assets" items={checklists.brand} />
                      <ChecklistPanel title="Content" items={checklists.content} />
                    </div>

                    {notes ? (
                      <div style={{
                        background: C.bgCard, border: `1px solid ${C.border}`,
                        padding: "0.875rem 1rem", marginBottom: "0.75rem",
                      }}>
                        <Label style={{ marginBottom: "0.375rem" }}>Internal Notes</Label>
                        <p style={{ fontFamily: C.sans, fontSize: "0.625rem", color: C.creamMuted, lineHeight: 1.55 }}>
                          {notes.length > 280 ? `${notes.slice(0, 280)}…` : notes}
                        </p>
                      </div>
                    ) : (
                      <p style={{ fontFamily: C.sans, fontSize: "0.5rem", color: "rgba(255,255,255,0.22)", marginBottom: "0.75rem" }}>
                        No internal notes · add in Payload → Access & Notes
                      </p>
                    )}

                    <Link
                      href={`/admin/collections/client-onboarding/${doc.id as number}`}
                      style={{
                        fontFamily: C.sans, fontWeight: 500, fontSize: "0.4375rem",
                        letterSpacing: "0.14em", textTransform: "uppercase",
                        color: C.goldDim, textDecoration: "none",
                      }}
                    >
                      Edit in Payload →
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Missing items engine */}
        <div style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label="Missing Requirements"
            sub="Assets, access, and business information still needed from clients"
            href="/admin/collections/client-onboarding"
            linkText="Manage Intakes →"
          />
          {withMissing.length === 0 ? (
            <EmptyState message="No missing requirements — all onboarding records are complete." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: C.border, border: `1px solid ${C.border}` }}>
              {withMissing.slice(0, 12).map(({ doc, missing, readiness }) => {
                const name = clientName(doc.client) || doc.businessName || "Unknown";
                const cid  = clientId(doc.client);
                return (
                  <div key={doc.id as number} style={{
                    background: C.bgElevated, padding: "1.25rem 1.5rem",
                    display: "flex", flexWrap: "wrap", alignItems: "flex-start",
                    justifyContent: "space-between", gap: "1rem",
                  }}>
                    <div style={{ minWidth: "12rem" }}>
                      {cid ? (
                        <Link href={`/admin/collections/clients/${cid}`} style={{
                          fontFamily: C.sans, fontWeight: 500, fontSize: "0.6875rem",
                          color: C.cream, textDecoration: "none", letterSpacing: "0.02em",
                        }}>
                          {name}
                        </Link>
                      ) : (
                        <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.6875rem", color: C.cream }}>
                          {name}
                        </p>
                      )}
                      <p style={{
                        fontFamily: C.sans, fontSize: "0.5rem", color: C.creamMuted,
                        marginTop: "0.25rem",
                      }}>
                        {onboardingStatusLabel(doc.status as string)} · {readiness.score}% ready
                      </p>
                    </div>
                    <div style={{ flex: 1, minWidth: "16rem" }}>
                      <p style={{
                        fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.14em",
                        textTransform: "uppercase", color: C.red, marginBottom: "0.5rem",
                      }}>
                        Missing
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                        {missing.all.slice(0, 8).map((item) => (
                          <span key={item} style={{
                            fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.08em",
                            color: C.creamMuted, background: C.redFaint,
                            border: `1px solid ${C.redBorder}`, padding: "0.2rem 0.5rem",
                          }}>
                            {item}
                          </span>
                        ))}
                        {missing.all.length > 8 && (
                          <span style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: C.creamMuted }}>
                            +{missing.all.length - 8} more
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/admin/collections/client-onboarding/${doc.id as number}`}
                      style={{
                        fontFamily: C.sans, fontWeight: 500, fontSize: "0.4375rem",
                        letterSpacing: "0.14em", textTransform: "uppercase",
                        color: C.goldDim, textDecoration: "none", flexShrink: 0,
                      }}
                    >
                      View Intake →
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Onboarding table */}
        <div>
          <SectionHeader
            label="All Onboarding Records"
            sub="Client · Status · Completion · Last Updated"
          />
          {enriched.length === 0 ? (
            <EmptyState message="No onboarding records yet. Create one in Payload → Client Onboarding." />
          ) : (
            <div style={{ border: `1px solid ${C.border}`, background: C.border }}>
              {/* Table header */}
              <div className="hidden sm:grid" style={{
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                gap: "1px", background: C.border,
              }}>
                {["Client", "Status", "Completion", "Readiness", "Last Updated"].map((h) => (
                  <div key={h} style={{ background: C.bgCard, padding: "0.75rem 1.25rem" }}>
                    <Label>{h}</Label>
                  </div>
                ))}
              </div>
              {/* Rows */}
              {enriched.map(({ doc, readiness }) => {
                const name   = clientName(doc.client) || doc.businessName || "—";
                const cid    = clientId(doc.client);
                const status = doc.status as string;
                const labelColor = READINESS_COLOR[readiness.label];

                return (
                  <div
                    key={doc.id as number}
                    className="grid grid-cols-1 sm:grid-cols-5"
                    style={{ gap: "1px", background: C.border }}
                  >
                    <div style={{ background: C.bgElevated, padding: "1rem 1.25rem" }}>
                      {cid ? (
                        <Link href={`/admin/collections/clients/${cid}`} style={{
                          fontFamily: C.sans, fontWeight: 500, fontSize: "0.625rem",
                          color: C.cream, textDecoration: "none",
                        }}>
                          {name}
                        </Link>
                      ) : (
                        <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.625rem", color: C.cream }}>
                          {name}
                        </p>
                      )}
                      <Link
                        href={`/admin/collections/client-onboarding/${doc.id as number}`}
                        style={{
                          fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.1em",
                          color: C.goldDim, textDecoration: "none", marginTop: "0.25rem", display: "block",
                        }}
                      >
                        View intake →
                      </Link>
                    </div>
                    <div style={{ background: C.bgElevated, padding: "1rem 1.25rem" }}>
                      <span style={{
                        fontFamily: C.sans, fontWeight: 600, fontSize: "0.4375rem",
                        letterSpacing: "0.14em", textTransform: "uppercase",
                        color: STATUS_COLOR[status] ?? C.creamMuted,
                      }}>
                        {onboardingStatusLabel(status)}
                      </span>
                    </div>
                    <div style={{ background: C.bgElevated, padding: "1rem 1.25rem" }}>
                      <p style={{
                        fontFamily: C.serif, fontWeight: 300, fontSize: "1.125rem",
                        color: readiness.score >= 85 ? C.green : readiness.score >= 50 ? C.yellow : C.red,
                      }}>
                        {readiness.completionPercent}%
                      </p>
                    </div>
                    <div style={{ background: C.bgElevated, padding: "1rem 1.25rem" }}>
                      <span style={{
                        fontFamily: C.sans, fontWeight: 600, fontSize: "0.4375rem",
                        letterSpacing: "0.12em", textTransform: "uppercase",
                        color: labelColor,
                        background: labelColor === C.green ? C.greenFaint : labelColor === C.yellow ? C.yellowFaint : C.redFaint,
                        border: `1px solid ${labelColor}40`,
                        padding: "0.2rem 0.5rem",
                      }}>
                        {readiness.label}
                      </span>
                    </div>
                    <div style={{ background: C.bgElevated, padding: "1rem 1.25rem" }}>
                      <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.creamMuted }}>
                        {fmtDate(doc.updatedAt as string)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div style={{
          marginTop: "3rem", paddingTop: "1.5rem",
          borderTop: `1px solid ${C.border}`,
          display: "flex", flexWrap: "wrap", gap: "1.5rem",
        }}>
          {[
            ["/admin/operations/playbooks", "Playbooks"],
            ["/admin/operations/today",    "Today"],
            ["/admin/operations/growth",   "Growth"],
            ["/admin/operations/accounts", "Accounts"],
            ["/admin/operations/founder",  "Founder"],
            ["/admin/operations/creative", "Creative"],
          ].map(([href, label]) => (
            <Link key={href} href={href} style={{
              fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.12em",
              textTransform: "uppercase", color: "rgba(255,255,255,0.3)", textDecoration: "none",
            }}>
              {label} →
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
