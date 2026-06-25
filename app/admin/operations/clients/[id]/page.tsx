/**
 * /admin/operations/clients/[id]
 * KXD OS Phase 1 — Executive Client Detail
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import { KxdLogo } from "@/components/ui/KxdLogo";
import {
  calculateEstimatedAnnualValue,
  EXECUTIVE_PRIORITY_LABEL,
  EXECUTIVE_STATUS_LABEL,
  EXECUTIVE_TIER_LABEL,
  fmtExecutiveMoney,
  mergeClientWithExecutiveProfile,
  type AnyDoc,
} from "@/lib/executive-client-profile";

export const dynamic = "force-dynamic";

const C = {
  bgBase: "#080808",
  bgElevated: "#0B0B0B",
  gold: "#C9A962",
  goldDim: "rgba(201,169,98,0.55)",
  cream: "#F5F1E8",
  creamMuted: "rgba(245,241,232,0.72)",
  red: "#d25a5a",
  border: "rgba(255,255,255,0.08)",
  borderGold: "rgba(201,169,98,0.16)",
  serif: "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
  sans: "var(--font-outfit, 'Helvetica Neue', Arial, sans-serif)",
} as const;

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

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{
      background: C.bgElevated, border: `1px solid ${C.border}`, padding: "1.375rem 1.5rem",
    }}>
      <Label>{title}</Label>
      <div style={{ marginTop: "0.875rem" }}>{children}</div>
    </section>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: C.sans, fontSize: "0.875rem", fontWeight: 300,
      lineHeight: 1.75, color: C.creamMuted,
    }}>
      {children}
    </p>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", gap: "1rem",
      padding: "0.625rem 0", borderBottom: `1px solid ${C.border}`,
    }}>
      <span style={{ fontFamily: C.sans, fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>
        {label}
      </span>
      <span style={{
        fontFamily: C.sans, fontSize: "0.8125rem", color: C.cream, textAlign: "right",
      }}>
        {value}
      </span>
    </div>
  );
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return "—"; }
}

type Props = { params: Promise<{ id: string }> };

export default async function ExecutiveClientDetailPage({ params }: Props) {
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isFinite(clientId)) notFound();

  const payload = await getPayload({ config });

  let client: AnyDoc | null = null;
  let profile: AnyDoc | null = null;

  try {
    client = await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
    }) as AnyDoc;
  } catch {
    notFound();
  }

  const profilesR = await payload.find({
    collection: "executive-client-profiles",
    where: { client: { equals: clientId } },
    limit: 1,
    depth: 0,
  });
  profile = profilesR.docs[0] as AnyDoc | undefined ?? null;

  const row = mergeClientWithExecutiveProfile(client, profile);
  const annualValue = calculateEstimatedAnnualValue(
    profile?.currentMonthlyRevenue as number | undefined,
    profile?.estimatedAnnualValue as number | undefined,
  ) ?? row.estimatedAnnualValue;

  const editHref = profile
    ? `/admin/collections/executive-client-profiles/${profile.id}`
    : `/admin/collections/executive-client-profiles/create?client=${clientId}`;

  return (
    <div style={{ minHeight: "100vh", background: C.bgBase, color: C.cream }}>
      <header style={{
        borderBottom: `1px solid ${C.border}`, padding: "1.25rem 1.5rem",
        background: "rgba(8,8,8,0.95)",
      }}>
        <div className="mx-auto max-w-screen-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <KxdLogo height={20} />
            <div>
              <Link
                href="/admin/operations/clients"
                style={{
                  fontFamily: C.sans, fontSize: "0.625rem", fontWeight: 500,
                  letterSpacing: "0.14em", textTransform: "uppercase" as const,
                  color: C.goldDim, textDecoration: "none",
                }}
              >
                ← Client Command Center
              </Link>
              <h1 style={{
                fontFamily: C.serif, fontWeight: 300, fontSize: "1.75rem",
                color: C.cream, marginTop: "0.375rem", lineHeight: 1.1,
              }}>
                {row.name}
              </h1>
            </div>
          </div>
          <Link
            href={editHref}
            style={{
              fontFamily: C.sans, fontSize: "0.6875rem", fontWeight: 500,
              letterSpacing: "0.14em", textTransform: "uppercase" as const,
              color: C.bgBase, background: C.gold, padding: "0.5rem 1rem",
              textDecoration: "none",
            }}
          >
            {profile ? "Edit Executive Profile" : "Create Executive Profile"}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-6 py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          {[
            { label: "Tier", value: row.tier ? EXECUTIVE_TIER_LABEL[row.tier] : row.brandTier ?? "—" },
            { label: "Monthly Revenue", value: fmtExecutiveMoney(row.monthlyRevenue) },
            { label: "Est. Annual Value", value: fmtExecutiveMoney(annualValue) },
            { label: "Potential MRR", value: fmtExecutiveMoney(row.potentialMonthlyRevenue) },
          ].map((kpi) => (
            <div key={kpi.label} style={{
              background: C.bgElevated, border: `1px solid ${C.border}`, padding: "1.125rem 1.25rem",
            }}>
              <Label>{kpi.label}</Label>
              <p style={{
                fontFamily: C.serif, fontWeight: 300, fontSize: "1.375rem",
                color: C.cream, marginTop: "0.375rem",
              }}>
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-6">
            <Panel title="Executive Summary">
              <Prose>
                {(profile?.executiveSummary as string) ||
                  (client.notes as string) ||
                  "No executive summary recorded."}
              </Prose>
            </Panel>

            <Panel title="Revenue Snapshot">
              <MetaRow label="Current Monthly" value={fmtExecutiveMoney(row.monthlyRevenue)} />
              <MetaRow label="Estimated Annual" value={fmtExecutiveMoney(annualValue)} />
              <MetaRow label="Potential Monthly" value={fmtExecutiveMoney(row.potentialMonthlyRevenue)} />
              <MetaRow
                label="Health Score"
                value={row.healthScore != null ? String(row.healthScore) : "—"}
              />
              <MetaRow
                label="Relationship"
                value={row.relationshipStatus
                  ? EXECUTIVE_STATUS_LABEL[row.relationshipStatus]
                  : statusLabelFromClient(client)}
              />
              <MetaRow
                label="Internal Priority"
                value={row.internalPriority
                  ? EXECUTIVE_PRIORITY_LABEL[row.internalPriority]
                  : "—"}
              />
            </Panel>

            <Panel title="Current Services">
              <Prose>
                {(profile?.currentServices as string) || "No services documented."}
              </Prose>
              {profile?.activeProjectsSummary && (
                <div style={{ marginTop: "1rem" }}>
                  <Label>Active Projects</Label>
                  <Prose>{profile.activeProjectsSummary as string}</Prose>
                </div>
              )}
            </Panel>

            <Panel title="Strategic Notes">
              <Prose>
                {(profile?.strategicNotes as string) || (client.notes as string) || "—"}
              </Prose>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Technical Stack">
              <MetaRow label="Production" value={(profile?.productionUrl as string) || "—"} />
              <MetaRow label="Staging" value={(profile?.stagingUrl as string) || "—"} />
              <MetaRow label="GitHub" value={(profile?.githubRepo as string) || "—"} />
              <MetaRow label="Vercel" value={(profile?.vercelProject as string) || "—"} />
              <MetaRow label="Domain Registrar" value={(profile?.domainRegistrar as string) || "—"} />
              <MetaRow label="DNS" value={(profile?.dnsProvider as string) || "—"} />
              <MetaRow label="Analytics" value={(profile?.analyticsStatus as string) || "—"} />
              <MetaRow label="Search Console" value={(profile?.searchConsoleStatus as string) || "—"} />
              <MetaRow label="Workspace" value={(profile?.workspaceStatus as string) || "—"} />
              {profile?.apiIntegrations && (
                <div style={{ marginTop: "0.875rem" }}>
                  <Label>API Integrations</Label>
                  <Prose>{profile.apiIntegrations as string}</Prose>
                </div>
              )}
              {profile?.loginNotesReference && (
                <div style={{ marginTop: "0.875rem" }}>
                  <Label>Secure References</Label>
                  <Prose>{profile.loginNotesReference as string}</Prose>
                </div>
              )}
            </Panel>

            <Panel title="Opportunities">
              <Label>Growth</Label>
              <Prose>{(profile?.growthOpportunities as string) || "—"}</Prose>
              <div style={{ marginTop: "1rem" }}>
                <Label>Upsell</Label>
                <Prose>{(profile?.upsellOpportunities as string) || "—"}</Prose>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Case Study", value: profile?.caseStudyPotential },
                  { label: "Referral", value: profile?.referralPotential },
                  { label: "Productization", value: profile?.productizationPotential },
                ].map((item) => (
                  <div key={item.label} style={{
                    border: `1px solid ${C.borderGold}`, padding: "0.75rem",
                    background: "rgba(255,255,255,0.02)",
                  }}>
                    <Label>{item.label}</Label>
                    <p style={{
                      fontFamily: C.sans, fontSize: "0.8125rem", color: C.gold,
                      marginTop: "0.375rem", textTransform: "capitalize" as const,
                    }}>
                      {(item.value as string) || "—"}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Risks">
              <Prose>{(profile?.riskNotes as string) || "No risk notes recorded."}</Prose>
            </Panel>

            <Panel title="Next Action">
              <Prose>{row.nextAction ?? "No next action set."}</Prose>
              <MetaRow
                label="Due Date"
                value={fmtDate(row.nextActionDueDate)}
              />
              {profile?.primaryDecisionMaker && (
                <div style={{ marginTop: "0.75rem" }}>
                  <Label>Primary Decision Maker</Label>
                  <Prose>{profile.primaryDecisionMaker as string}</Prose>
                </div>
              )}
            </Panel>
          </div>
        </div>
      </main>
    </div>
  );
}

function statusLabelFromClient(client: AnyDoc): string {
  const s = client.relationshipStatus as string;
  if (s === "healthy") return "Healthy";
  if (s === "needs-attention") return "Needs Attention";
  if (s === "at-risk") return "At Risk";
  if (s === "paused") return "Paused";
  return client.status as string ?? "—";
}
