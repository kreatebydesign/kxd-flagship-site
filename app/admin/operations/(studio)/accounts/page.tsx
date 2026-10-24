/**
 * /admin/operations/accounts
 * KXD OS — Strategic Accounts Intelligence
 */

import { getPayload } from "payload";
import config from "@payload-config";
import {
  AccountsScreen,
  type AccountScore,
  type LicensingDeliverable,
  type WhiteSpaceOpportunity,
} from "@/components/admin/operations/accounts/AccountsScreen";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

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

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  try {
    const diff = new Date(iso).getTime() - Date.now();
    return Math.ceil(diff / 86_400_000);
  } catch {
    return null;
  }
}

function clientName(raw: unknown): string {
  if (!raw) return "Unknown";
  if (typeof raw === "object" && raw !== null && "name" in raw) {
    return ((raw as AnyDoc).name as string) || "Unknown";
  }
  return "Unknown";
}

function clientId(raw: unknown): number | null {
  if (!raw) return null;
  if (typeof raw === "object" && raw !== null && "id" in raw) {
    return (raw as AnyDoc).id as number;
  }
  if (typeof raw === "number") return raw;
  return null;
}

const TIER_RANK: Record<string, number> = {
  flagship: 4,
  growth: 3,
  maintenance: 2,
  internal: 1,
};

interface AccountScoreDraft extends AccountScore {
  billingStatus: string | null;
}

function scoreAccount(
  client: AnyDoc,
  retainers: AnyDoc[],
  requests: AnyDoc[],
  projects: AnyDoc[],
): AccountScoreDraft {
  const cid = client.id as number;
  const name = (client.name as string) || "Unknown";
  const tier = (client.brandTier as string) || "maintenance";
  const status = (client.relationshipStatus as string) || "healthy";
  const mrr = (client.monthlyRetainerAmount as number) || 0;

  const clientRetainers = retainers.filter((record) => clientId(record.client) === cid);
  const clientRequests = requests.filter((record) => clientId(record.client) === cid);
  const clientProjects = projects.filter((record) => clientId(record.client) === cid);

  const activeRetainer = clientRetainers.find(
    (record) => record.billingStatus === "active" || record.billingStatus === "pending",
  );
  const renewalDate = activeRetainer?.renewalDate ?? null;
  const billingStatus = activeRetainer?.billingStatus ?? null;
  const hasAutoRenew = Boolean(activeRetainer?.autoRenew);

  let score = 0;
  const flags: string[] = [];
  const strengths: string[] = [];

  score += (TIER_RANK[tier] ?? 1) * 6;

  if (mrr >= 10_000) {
    score += 20;
    strengths.push("High MRR");
  } else if (mrr >= 5_000) {
    score += 14;
  } else if (mrr >= 2_500) {
    score += 8;
  } else if (mrr > 0) {
    score += 3;
  } else {
    flags.push("No active retainer");
  }

  if (status === "healthy") {
    score += 20;
    strengths.push("Healthy relationship");
  } else if (status === "needs-attention") {
    score += 10;
    flags.push("Relationship needs attention");
  } else if (status === "at-risk") {
    flags.push("Relationship at risk");
  } else if (status === "paused") {
    score += 5;
  }

  const activeProjects = clientProjects.filter((record) =>
    ["active", "in-progress", "review", "launch-ready"].includes(record.status),
  );
  if (activeProjects.length >= 2) {
    score += 15;
    strengths.push("Multiple active projects");
  } else if (activeProjects.length === 1) {
    score += 8;
  } else {
    flags.push("No active projects");
  }

  const recentRequests = clientRequests.filter((record) => {
    if (!record.createdAt) return false;
    return Date.now() - new Date(record.createdAt).getTime() < 90 * 86_400_000;
  });
  if (recentRequests.length >= 3) {
    score += 10;
    strengths.push("High engagement");
  } else if (recentRequests.length >= 1) {
    score += 5;
  }

  if (client.nextAction) {
    score += 10;
  } else {
    flags.push("No next action set");
  }

  if (activeRetainer?.billingStatus === "overdue") flags.push("Billing overdue");

  const clamped = Math.min(score, 100);
  const grade: "A" | "B" | "C" | "D" =
    clamped >= 80 ? "A" : clamped >= 60 ? "B" : clamped >= 40 ? "C" : "D";

  return {
    clientId: cid,
    name,
    tier,
    status,
    mrr,
    score: clamped,
    grade,
    flags,
    strengths,
    nextAction: (client.nextAction as string) ?? null,
    nextActionDue: (client.nextActionDueDate as string) ?? null,
    retainerCount: clientRetainers.length,
    requestCount: clientRequests.length,
    projectCount: clientProjects.length,
    renewalDate: renewalDate as string | null,
    billingStatus: billingStatus as string | null,
    hasAutoRenew,
  };
}

export default async function AccountsPage() {
  const payload = await getPayload({ config });

  const now = new Date();
  const dateDisplay = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeDisplay = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const [clientsR, retainersR, projectsR, requestsR, deliverablesR] = await Promise.allSettled([
    payload.find({
      collection: "clients",
      limit: 200,
      depth: 0,
      where: { status: { not_equals: "archived" } },
    }),
    payload.find({
      collection: "retainers",
      limit: 200,
      depth: 1,
    }),
    payload.find({
      collection: "client-projects",
      limit: 500,
      depth: 1,
    }),
    payload.find({
      collection: "client-requests",
      limit: 500,
      depth: 1,
    }),
    payload.find({
      collection: "monthly-deliverables",
      limit: 500,
      depth: 1,
    }),
  ]);

  const clients: AnyDoc[] =
    clientsR.status === "fulfilled" ? (clientsR.value.docs as AnyDoc[]) : [];
  const retainers: AnyDoc[] =
    retainersR.status === "fulfilled" ? (retainersR.value.docs as AnyDoc[]) : [];
  const projects: AnyDoc[] =
    projectsR.status === "fulfilled" ? (projectsR.value.docs as AnyDoc[]) : [];
  const requests: AnyDoc[] =
    requestsR.status === "fulfilled" ? (requestsR.value.docs as AnyDoc[]) : [];
  const deliverables: AnyDoc[] =
    deliverablesR.status === "fulfilled" ? (deliverablesR.value.docs as AnyDoc[]) : [];

  const activeClients = clients.filter((client) => client.status === "active");
  const allScores = activeClients.map((client) => scoreAccount(client, retainers, requests, projects));
  const sortedScores = [...allScores].sort((a, b) => b.score - a.score);

  const totalMRR = allScores.reduce((sum, account) => sum + account.mrr, 0);
  const activeWithMRR = allScores.filter((account) => account.mrr > 0).sort((a, b) => b.mrr - a.mrr);
  const top1MRR = activeWithMRR[0]?.mrr ?? 0;
  const top3MRR = activeWithMRR.slice(0, 3).reduce((sum, account) => sum + account.mrr, 0);
  const top1Pct = totalMRR > 0 ? Math.round((top1MRR / totalMRR) * 100) : 0;
  const top3Pct = totalMRR > 0 ? Math.round((top3MRR / totalMRR) * 100) : 0;

  const concentrationRisk: "high" | "medium" | "low" =
    top1Pct >= 40 ? "high" : top1Pct >= 25 ? "medium" : "low";

  const expansionCandidates = allScores.filter((account) => {
    const hasRetainer = account.mrr > 0;
    const hasGap = account.projectCount === 0 || account.retainerCount === 0;
    return hasRetainer && hasGap;
  });

  const whiteSpace = activeClients.filter((client) => {
    const id = client.id as number;
    const hasMRR = (client.monthlyRetainerAmount as number) > 0;
    const hasProject = projects.some(
      (project) =>
        clientId(project.client) === id &&
        ["active", "in-progress", "review", "launch-ready"].includes(project.status),
    );
    return hasMRR && !hasProject;
  });

  const founderAttention = allScores
    .filter(
      (account) =>
        account.status === "at-risk" ||
        account.status === "needs-attention" ||
        account.flags.includes("Billing overdue") ||
        (account.nextActionDue && (daysUntil(account.nextActionDue) ?? 999) < 3),
    )
    .sort((a, b) => {
      const priority = (row: AccountScore) =>
        row.status === "at-risk" ? 0 : row.flags.includes("Billing overdue") ? 1 : 2;
      return priority(a) - priority(b);
    });

  const renewalWatch = allScores
    .filter((account) => {
      const days = daysUntil(account.renewalDate);
      return days !== null && days >= 0 && days <= 60;
    })
    .sort(
      (a, b) =>
        (daysUntil(a.renewalDate) ?? 999) - (daysUntil(b.renewalDate) ?? 999),
    );

  const retainerGrowth = allScores
    .filter((account) => {
      if (account.tier === "flagship" && account.mrr < 8_000) return true;
      if (account.tier === "growth" && account.mrr < 4_000) return true;
      if (account.tier === "maintenance" && account.mrr < 1_500) return true;
      return false;
    })
    .sort((a, b) => (TIER_RANK[b.tier] ?? 1) - (TIER_RANK[a.tier] ?? 1));

  const flagshipClients = allScores.filter((account) => account.tier === "flagship");
  const licensingOpportunityIds = new Set(flagshipClients.map((account) => account.clientId));
  const licensingDeliverables = deliverables.filter((deliverable) => {
    const id = clientId(deliverable.client);
    return (
      id !== null &&
      licensingOpportunityIds.has(id) &&
      ["brand-system", "website", "platform", "campaign"].includes(
        deliverable.category as string,
      )
    );
  });

  const keyRelationships = sortedScores.slice(0, 8);
  const avgScore =
    allScores.length > 0
      ? Math.round(allScores.reduce((sum, account) => sum + account.score, 0) / allScores.length)
      : 0;

  const kpis = [
    {
      label: "Active Clients",
      value: String(activeClients.length),
      sub: `${clients.length} total in system`,
      alert: false,
    },
    {
      label: "Monthly Revenue",
      value: fmtMoney(totalMRR),
      sub: `${activeWithMRR.length} retainer clients`,
      alert: false,
    },
    {
      label: "Avg Account Score",
      value: String(avgScore),
      sub: "0-100 composite",
      alert: avgScore < 50,
    },
    {
      label: "Concentration Risk",
      value: `${top1Pct}%`,
      sub: `Top 3 = ${top3Pct}% of MRR`,
      alert: concentrationRisk === "high",
    },
    {
      label: "Founder Alerts",
      value: String(founderAttention.length),
      sub: founderAttention.length === 0 ? "All clear" : "Action required",
      alert: founderAttention.length > 0,
    },
    {
      label: "Renewal Watch",
      value: String(renewalWatch.length),
      sub: "next 60 days",
      alert: renewalWatch.some((account) => (daysUntil(account.renewalDate) ?? 999) <= 14),
    },
  ];

  const expansionScore = Math.min(
    Math.round((expansionCandidates.length / Math.max(activeClients.length, 1)) * 100),
    100,
  );

  const whiteSpaceRows: WhiteSpaceOpportunity[] = whiteSpace.map((client) => {
    const id = client.id as number;
    const score = allScores.find((account) => account.clientId === id);
    return {
      clientId: id,
      name: String(client.name ?? "Unknown"),
      tier: String(client.brandTier ?? "maintenance"),
      mrr: Number(client.monthlyRetainerAmount ?? 0),
      nextAction: score?.nextAction ?? null,
    };
  });

  const licensingRows: LicensingDeliverable[] = licensingDeliverables.map((deliverable) => ({
    id: String(deliverable.id ?? `${deliverable.title ?? "deliverable"}-${deliverable.createdAt ?? ""}`),
    title: String(deliverable.title ?? "Untitled Deliverable"),
    clientName: clientName(deliverable.client),
    category: String(deliverable.category ?? "Other"),
    status: deliverable.status ? String(deliverable.status) : null,
  }));

  const renewalRows: AccountScore[] = renewalWatch.map((account) => ({
    ...account,
    renewalDate: fmtDate(account.renewalDate),
  }));

  const keyRelationshipRows: AccountScore[] = keyRelationships.map((account) => ({
    ...account,
    nextActionDue: account.nextActionDue ? fmtDate(account.nextActionDue) : null,
  }));

  return (
    <AccountsScreen
      dateDisplay={dateDisplay}
      timeDisplay={timeDisplay}
      expansionScore={expansionScore}
      expansionCandidatesCount={expansionCandidates.length}
      activeWithMRRCount={activeWithMRR.length}
      kpis={kpis}
      sortedScores={sortedScores}
      founderAttention={founderAttention}
      retainerGrowth={retainerGrowth}
      whiteSpace={whiteSpaceRows}
      renewalWatch={renewalRows}
      keyRelationships={keyRelationshipRows}
      licensingDeliverables={licensingRows}
      flagshipClientNames={flagshipClients.map((account) => account.name)}
      topAccountsByMRR={activeWithMRR}
      concentration={{
        risk: concentrationRisk,
        top1Pct,
        top3Pct,
        top1Name: activeWithMRR[0]?.name ?? "—",
        top1MRR: fmtMoney(top1MRR),
      }}
    />
  );
}
