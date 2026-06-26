import Link from "next/link";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsFocusPill,
  OpsKpiStrip,
  OpsListRow,
  OpsSectionHead,
} from "@/components/admin/operations/shared/OpsBriefing";
import {
  KxdBadge,
  KxdButton,
  KxdEmptyState,
  KxdMetric,
  KxdPage,
  KxdSection,
  KxdSurface,
  KxdTable,
  KxdTableBody,
  KxdTableCell,
  KxdTableHead,
  KxdTableHeaderCell,
  KxdTableRow,
  type KxdBadgeVariant,
} from "@/components/os";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

const BUDGET_MIDPOINTS: Record<string, number> = {
  "under-5k": 3_500,
  "5k-10k": 7_500,
  "10k-25k": 17_500,
  "25k-50k": 37_500,
  "50k-plus": 65_000,
};

const INVESTMENT_MIDPOINTS: Record<string, number> = {
  "under-10k": 7_500,
  "10k-25k": 17_500,
  "25k-50k": 37_500,
  "50k-100k": 75_000,
  "100k-plus": 125_000,
  "not-determined": 0,
};

const SERVICE_LABELS: Record<string, string> = {
  "luxury-website-experiences": "Luxury Websites",
  "brand-systems-identity": "Brand Systems",
  "growth-infrastructure": "Growth Infrastructure",
  "enterprise-platforms": "Enterprise Platforms",
  "ongoing-partnership": "Retainer Partnership",
  general: "General / Unsure",
};

const INQUIRY_ACTIVE = new Set(["new", "reviewed", "in-progress", "proposal-sent"]);
const PI_ACTIVE = new Set(["new", "reviewing", "discovery", "proposal"]);

interface ScoredLead {
  id: number;
  type: "inquiry" | "project-inquiry";
  name: string;
  company: string;
  service: string;
  budgetKey: string;
  timeline: string;
  status: string;
  score: number;
  estValue: number;
  followUpDate: string | null;
  createdAt: string;
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function scoreInquiry(doc: AnyDoc): ScoredLead {
  let s = 0;
  const budget = (doc.budget as string) ?? "";
  if (budget === "50k-plus") s += 4;
  else if (budget === "25k-50k") s += 3;
  else if (budget === "10k-25k") s += 2;
  else if (budget === "5k-10k") s += 1;

  const tl = (doc.timeline as string) ?? "";
  if (tl === "immediate") s += 2;
  else if (tl === "within-30-days") s += 1;

  const iType = (doc.inquiryType as string) ?? "general";
  if (iType && iType !== "general") s += 1;

  const notes = (doc.internalNotes as string) ?? "";
  if (notes.trim().length > 5) s += 1;

  const status = (doc.status as string) ?? "";
  if (status === "proposal-sent") s += 2;
  else if (status === "in-progress") s += 1;

  return {
    id: doc.id as number,
    type: "inquiry",
    name: (doc.name as string) || "—",
    company: (doc.company as string) || "—",
    service: SERVICE_LABELS[iType] ?? iType ?? "General",
    budgetKey: budget || "unknown",
    timeline: tl || "unknown",
    status,
    score: Math.min(s, 10),
    estValue: BUDGET_MIDPOINTS[budget] ?? 0,
    followUpDate: (doc.followUpDate as string) ?? null,
    createdAt: (doc.createdAt as string) ?? "",
  };
}

function scoreProjectInquiry(doc: AnyDoc): ScoredLead {
  let s = 0;
  const inv = (doc.investmentRange as string) ?? "";
  if (inv === "100k-plus") s += 4;
  else if (inv === "50k-100k") s += 3;
  else if (inv === "25k-50k") s += 2;
  else if (inv === "10k-25k") s += 1;

  const tl = (doc.timeline as string) ?? "";
  if (tl === "immediate") s += 2;
  else if (tl === "within-30-days") s += 1;

  const svcs = (doc.servicesInterested as string) ?? "";
  if (svcs.trim().length > 0) s += 1;

  const goals = (doc.businessGoals as string) ?? "";
  if (goals.trim().length > 20) s += 1;

  const status = (doc.status as string) ?? "";
  if (status === "proposal") s += 2;
  else if (status === "discovery") s += 1;

  return {
    id: doc.id as number,
    type: "project-inquiry",
    name: (doc.contactName as string) || "—",
    company: (doc.companyName as string) || "—",
    service: svcs || "Project Application",
    budgetKey: inv || "unknown",
    timeline: tl || "unknown",
    status,
    score: Math.min(s, 10),
    estValue: INVESTMENT_MIDPOINTS[inv] ?? 0,
    followUpDate: null,
    createdAt: (doc.createdAt as string) ?? "",
  };
}

function statusVariant(status: string): KxdBadgeVariant {
  switch (status) {
    case "new":
      return "status";
    case "reviewed":
    case "reviewing":
    case "discovery":
      return "tier";
    case "in-progress":
    case "proposal":
    case "proposal-sent":
      return "priority";
    case "active":
    case "onboarding":
    case "retainer":
    case "won":
      return "success";
    case "lost":
      return "critical";
    case "paused":
    case "closed":
    case "completed":
      return "pending";
    default:
      return "default";
  }
}

function scoreVariant(score: number): KxdBadgeVariant {
  if (score >= 8) return "success";
  if (score >= 5) return "warning";
  return "pending";
}

type GrowthScore = "strong" | "active" | "building" | "quiet";

function computeGrowthScore(pipelineValue: number, activeLeads: number): GrowthScore {
  if (pipelineValue >= 100_000 || activeLeads >= 8) return "strong";
  if (pipelineValue >= 30_000 || activeLeads >= 3) return "active";
  if (activeLeads >= 1) return "building";
  return "quiet";
}

const GROWTH_FOCUS: Record<
  GrowthScore,
  { label: string; description: string; tone: "default" | "warning" | "critical" | "clear" }
> = {
  strong: {
    label: "Strong",
    description: "High-value pipeline active. Prioritize close and conversion.",
    tone: "clear",
  },
  active: {
    label: "Active",
    description: "Pipeline in motion. Follow up on open proposals.",
    tone: "default",
  },
  building: {
    label: "Building",
    description: "Early-stage leads present. Nurture and qualify.",
    tone: "warning",
  },
  quiet: {
    label: "Quiet",
    description: "No active pipeline. Focus on content and outreach.",
    tone: "critical",
  },
};

export interface GrowthScreenProps {
  dateDisplay: string;
  timeDisplay: string;
  inquiries: AnyDoc[];
  projInquiries: AnyDoc[];
  overdueFollowUps: AnyDoc[];
  activeRetainers: AnyDoc[];
}

export function GrowthScreen({
  dateDisplay,
  timeDisplay,
  inquiries,
  projInquiries,
  overdueFollowUps,
  activeRetainers,
}: GrowthScreenProps) {
  const activeInquiries = inquiries.filter((i) => INQUIRY_ACTIVE.has(i.status as string));
  const activeProjInquiries = projInquiries.filter((p) => PI_ACTIVE.has(p.status as string));

  const wonInquiries = inquiries.filter((i) => i.status === "won");
  const wonProjInquiries = projInquiries.filter((p) =>
    ["active", "onboarding", "retainer"].includes(p.status as string),
  );

  const scoredLeads: ScoredLead[] = [
    ...activeInquiries.map(scoreInquiry),
    ...activeProjInquiries.map(scoreProjectInquiry),
  ].sort((a, b) => b.score - a.score);

  const pipelineValue = scoredLeads.reduce((sum, l) => sum + l.estValue, 0);
  const proposalsOut =
    inquiries.filter((i) => i.status === "proposal-sent").length +
    projInquiries.filter((p) => p.status === "proposal").length;
  const mrrBase = activeRetainers.reduce((sum, r) => sum + ((r.monthlyAmount as number) ?? 0), 0);
  const founderOpportunities = scoredLeads.filter((l) => l.score >= 8 && l.estValue >= 20_000);

  const focus = GROWTH_FOCUS[computeGrowthScore(pipelineValue, scoredLeads.length)];

  const kpis = [
    { label: "Active Pipeline", value: String(scoredLeads.length), sub: "Open leads" },
    { label: "Pipeline Value", value: fmtMoney(pipelineValue), sub: "Est. opportunity", alert: true },
    { label: "Proposals Out", value: String(proposalsOut), sub: "Awaiting decision", alert: proposalsOut > 0 },
    {
      label: "Won / Converted",
      value: String(wonInquiries.length + wonProjInquiries.length),
      sub: "All-time total",
    },
    {
      label: "Follow-up Overdue",
      value: String(overdueFollowUps.length),
      sub: "Past follow-up date",
      alert: overdueFollowUps.length > 0,
    },
    { label: "MRR Base", value: mrrBase > 0 ? fmtMoney(mrrBase) : "$0", sub: "Active retainers" },
  ];

  return (
    <OperationsShell activeId="growth" dateDisplay={dateDisplay}>
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Growth Intelligence"
          title="Pipeline Intelligence"
          lead={`${dateDisplay} · Loaded ${timeDisplay} · Live request snapshot for lead quality, value, and follow-up risk`}
        />

        <OpsFocusPill label={`Growth Score · ${focus.label}`} description={focus.description} tone={focus.tone} />

        <KxdSection label="Growth Summary">
          <OpsKpiStrip items={kpis} />
        </KxdSection>

        <KxdSection label="Pipeline Intelligence">
          <OpsSectionHead
            label="Lead Rows"
            count={scoredLeads.length}
            href="/admin/collections/inquiries"
            linkText="Manage Leads →"
          />
          {scoredLeads.length === 0 ? (
            <KxdEmptyState
              title="No active leads in pipeline."
              description="Leads from /contact and /start-project will appear here."
            />
          ) : (
            <KxdSurface variant="glass" className="kxd-os-ops-briefing-surface">
              <div className="kxd-os-list-stack">
                {scoredLeads.slice(0, 14).map((lead) => (
                  <OpsListRow key={`${lead.type}-${lead.id}`} href="/admin/collections/inquiries">
                    <div className="kxd-os-ops-list-row__main">
                      <p className="kxd-os-ops-list-row__title">
                        {lead.company !== "—" ? lead.company : lead.name}
                      </p>
                      <p className="kxd-os-ops-list-row__meta">
                        {lead.service} · {fmtMoney(lead.estValue)} · Received {fmtDate(lead.createdAt)}
                      </p>
                      {lead.followUpDate ? (
                        <p className="kxd-os-meta">Follow-up {fmtDate(lead.followUpDate)}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <KxdBadge variant={statusVariant(lead.status)}>{lead.status.replace(/-/g, " ")}</KxdBadge>
                      <KxdBadge variant={scoreVariant(lead.score)}>Score {lead.score}</KxdBadge>
                    </div>
                  </OpsListRow>
                ))}
              </div>
            </KxdSurface>
          )}
        </KxdSection>

        <KxdSection label="Leadership Snapshot">
          <div className="kxd-os-ops-kpi-grid">
            <KxdMetric
              label="Founder Opportunities"
              value={String(founderOpportunities.length)}
              sub="Score ≥ 8 and value ≥ $20K"
            />
            <KxdMetric label="Avg Lead Value" value={fmtMoney(scoredLeads.length ? Math.round(pipelineValue / scoredLeads.length) : 0)} />
            <KxdMetric label="Active Retainers" value={String(activeRetainers.length)} sub="Current billing base" />
          </div>
        </KxdSection>

        <KxdSection label="Overdue Follow-ups">
          {overdueFollowUps.length === 0 ? (
            <KxdEmptyState title="No overdue follow-ups." description="All lead follow-up dates are current." />
          ) : (
            <KxdTable>
              <KxdTableHead>
                <KxdTableRow>
                  <KxdTableHeaderCell>Company</KxdTableHeaderCell>
                  <KxdTableHeaderCell>Status</KxdTableHeaderCell>
                  <KxdTableHeaderCell>Follow-up Date</KxdTableHeaderCell>
                </KxdTableRow>
              </KxdTableHead>
              <KxdTableBody>
                {overdueFollowUps.map((inq) => (
                  <KxdTableRow key={inq.id as number}>
                    <KxdTableCell primary>{(inq.company as string) || (inq.name as string) || "—"}</KxdTableCell>
                    <KxdTableCell>
                      <KxdBadge variant={statusVariant((inq.status as string) ?? "new")}>
                        {((inq.status as string) ?? "new").replace(/-/g, " ")}
                      </KxdBadge>
                    </KxdTableCell>
                    <KxdTableCell>{fmtDate(inq.followUpDate as string)}</KxdTableCell>
                  </KxdTableRow>
                ))}
              </KxdTableBody>
            </KxdTable>
          )}
        </KxdSection>

        <KxdSection label="Quick Actions">
          <div className="kxd-os-operations-actions">
            <Link href="/admin/collections/inquiries">
              <KxdButton variant="secondary">All Inquiries</KxdButton>
            </Link>
            <Link href="/admin/collections/project-inquiries">
              <KxdButton variant="secondary">Project Applications</KxdButton>
            </Link>
            <Link href="/admin/operations/founder">
              <KxdButton>Founder View</KxdButton>
            </Link>
          </div>
        </KxdSection>
      </KxdPage>
    </OperationsShell>
  );
}
