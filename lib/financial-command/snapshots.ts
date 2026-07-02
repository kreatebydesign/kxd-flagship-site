/**
 * Deterministic financial snapshot builders — payload-safe.
 */
import type { Payload } from "payload";
import { isOpenProposalStatus } from "@/lib/executive-proposals/lifecycle";
import { isUnsignedContract } from "@/lib/contracts/lifecycle";
import type { ExecutiveFinancialMetrics } from "./types";
import { relId } from "./timeline-publish";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

const ACTIVE_RETAINER_STATUSES = new Set(["current", "active", "upcoming"]);
const ACTIVE_CLIENT_STATUSES = new Set(["active"]);

function proposalAmounts(doc: AnyDoc): { oneTime: number; recurring: number } {
  const snap = doc.pricingSnapshot as Record<string, unknown> | undefined;
  const oneTime =
    snap?.grandOneTimeTotal != null
      ? Number(snap.grandOneTimeTotal)
      : Number(doc.investment ?? 0);
  const recurring =
    snap?.grandRecurringTotal != null
      ? Number(snap.grandRecurringTotal)
      : Number(doc.recurringAmount ?? 0);
  return { oneTime, recurring };
}

function monthlyFromRetainer(doc: AnyDoc): number {
  const amount = Number(doc.monthlyAmount ?? 0);
  const cadence = String(doc.billingCadence ?? "monthly");
  if (cadence === "quarterly") return amount / 3;
  if (cadence === "annual") return amount / 12;
  return amount;
}

export async function buildExecutiveFinancialMetrics(
  payload: Payload,
): Promise<ExecutiveFinancialMetrics> {
  const [clientsR, retainersR, projectsR, proposalsR, contractsR, billingR] =
    await Promise.all([
      payload.find({ collection: "clients", limit: 500, depth: 0, overrideAccess: true }),
      payload.find({ collection: "retainers", limit: 500, depth: 1, overrideAccess: true }),
      payload.find({ collection: "client-projects", limit: 500, depth: 1, overrideAccess: true }),
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "proposals" as any,
        limit: 500,
        depth: 0,
        overrideAccess: true,
      }),
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "contracts" as any,
        limit: 500,
        depth: 0,
        overrideAccess: true,
      }),
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "billing-profiles" as any,
        limit: 500,
        depth: 0,
        overrideAccess: true,
      }),
    ]);

  const clients = clientsR.docs as AnyDoc[];
  const retainers = retainersR.docs as AnyDoc[];
  const projects = projectsR.docs as AnyDoc[];
  const proposals = proposalsR.docs as AnyDoc[];
  const contracts = contractsR.docs as AnyDoc[];
  const billingProfiles = billingR.docs as AnyDoc[];

  const billingByClient = new Map<number, AnyDoc>();
  for (const bp of billingProfiles) {
    const cid = relId(bp.client);
    if (cid) billingByClient.set(cid, bp);
  }

  let mrr = 0;
  let activeRetainers = 0;
  const revenueByClient = new Map<number, { clientName: string; mrr: number; total: number }>();
  const revenueByServiceType = new Map<string, number>();

  for (const retainer of retainers) {
    const status = String(retainer.billingStatus ?? "");
    if (!ACTIVE_RETAINER_STATUSES.has(status)) continue;
    const monthly = monthlyFromRetainer(retainer);
    if (monthly <= 0) continue;
    activeRetainers += 1;
    mrr += monthly;

    const clientId = relId(retainer.client);
    if (clientId) {
      const clientName =
        typeof retainer.client === "object" && retainer.client !== null
          ? String((retainer.client as AnyDoc).name ?? "Client")
          : "Client";
      const existing = revenueByClient.get(clientId) ?? {
        clientName,
        mrr: 0,
        total: 0,
      };
      existing.mrr += monthly;
      existing.total += monthly * 12;
      revenueByClient.set(clientId, existing);
    }
  }

  let oneTimeProjectRevenue = 0;
  for (const project of projects) {
    const status = String(project.status ?? "");
    if (!["planning", "active", "review", "waiting-on-client", "launched"].includes(status)) {
      continue;
    }
    const budget = Number(project.budget ?? project.projectValue ?? 0);
    oneTimeProjectRevenue += budget;

    const clientId = relId(project.client);
    const serviceType = String(project.projectType ?? "project");
    revenueByServiceType.set(
      serviceType,
      (revenueByServiceType.get(serviceType) ?? 0) + budget,
    );

    if (clientId) {
      const row = revenueByClient.get(clientId);
      if (row) row.total += budget;
    }
  }

  let pipelineValue = 0;
  for (const proposal of proposals) {
    const status = String(proposal.status ?? "");
    if (!isOpenProposalStatus(status) && status !== "approved") continue;
    const { oneTime, recurring } = proposalAmounts(proposal);
    pipelineValue += oneTime + recurring * 12;

    const serviceType = String(proposal.proposalType ?? "custom");
    revenueByServiceType.set(
      serviceType,
      (revenueByServiceType.get(serviceType) ?? 0) + oneTime + recurring * 12,
    );
  }

  let contractedRevenue = 0;
  let atRiskRevenue = 0;
  const now = Date.now();
  const renewalWindow = now + 60 * 24 * 60 * 60 * 1000;
  let upcomingRenewals = 0;

  for (const contract of contracts) {
    const status = String(contract.status ?? "");
    const monthly = Number(contract.monthlyAmount ?? 0);
    const project = Number(contract.projectAmount ?? 0);

    if (status === "signed") {
      contractedRevenue += project + monthly * 12;
    }
    if (isUnsignedContract(status) && contract.sentAt) {
      atRiskRevenue += project + monthly * 12;
    }
  }

  for (const retainer of retainers) {
    if (retainer.renewalDate) {
      const renewal = new Date(String(retainer.renewalDate)).getTime();
      if (renewal >= now && renewal <= renewalWindow) upcomingRenewals += 1;
    }
    if (String(retainer.billingStatus) === "overdue") {
      atRiskRevenue += monthlyFromRetainer(retainer);
    }
  }

  let missingBillingSetup = 0;
  for (const client of clients) {
    if (!ACTIVE_CLIENT_STATUSES.has(String(client.status ?? "active"))) continue;
    const clientId = client.id as number;
    const bp = billingByClient.get(clientId);
    if (!bp || String(bp.billingStatus) === "not-configured") {
      missingBillingSetup += 1;
    }
  }

  const projectedAnnualValue = Math.round(mrr * 12 + pipelineValue * 0.35);

  return {
    mrr: Math.round(mrr),
    activeRetainers,
    oneTimeProjectRevenue: Math.round(oneTimeProjectRevenue),
    pipelineValue: Math.round(pipelineValue),
    contractedRevenue: Math.round(contractedRevenue),
    projectedAnnualValue,
    atRiskRevenue: Math.round(atRiskRevenue),
    missingBillingSetup,
    upcomingRenewals,
    revenueByClient: [...revenueByClient.entries()]
      .map(([clientId, row]) => ({
        clientId,
        clientName: row.clientName,
        mrr: Math.round(row.mrr),
        total: Math.round(row.total),
      }))
      .sort((a, b) => b.mrr - a.mrr)
      .slice(0, 20),
    revenueByServiceType: [...revenueByServiceType.entries()]
      .map(([serviceType, amount]) => ({
        serviceType,
        amount: Math.round(amount),
      }))
      .sort((a, b) => b.amount - a.amount),
  };
}

export async function buildClientFinancialMetrics(
  payload: Payload,
  clientId: number,
): Promise<{
  mrr: number;
  lifetimeValue: number;
  contractedValue: number;
  pipelineValue: number;
  projectValue: number;
  activeRetainers: number;
  atRiskAmount: number;
  renewalStatus: string;
  revenueByServiceType: Array<{ serviceType: string; amount: number }>;
}> {
  const [retainersR, projectsR, proposalsR, contractsR, eventsR] = await Promise.all([
    payload.find({
      collection: "retainers",
      where: { client: { equals: clientId } },
      limit: 50,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: "client-projects",
      where: { client: { equals: clientId } },
      limit: 50,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "proposals" as any,
      where: { client: { equals: clientId } },
      limit: 50,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "contracts" as any,
      where: { client: { equals: clientId } },
      limit: 50,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "revenue-events" as any,
      where: { client: { equals: clientId } },
      limit: 100,
      sort: "-occurredAt",
      depth: 0,
      overrideAccess: true,
    }),
  ]);

  let mrr = 0;
  let activeRetainers = 0;
  let renewalStatus = "n/a";
  const now = Date.now();
  const renewalWindow = now + 60 * 24 * 60 * 60 * 1000;

  for (const retainer of retainersR.docs as AnyDoc[]) {
    const status = String(retainer.billingStatus ?? "");
    if (ACTIVE_RETAINER_STATUSES.has(status)) {
      mrr += monthlyFromRetainer(retainer);
      activeRetainers += 1;
    }
    if (retainer.renewalDate) {
      const renewal = new Date(String(retainer.renewalDate)).getTime();
      if (renewal < now) renewalStatus = "overdue";
      else if (renewal <= renewalWindow) renewalStatus = "approaching";
      else if (renewalStatus === "n/a") renewalStatus = "current";
    }
  }

  let projectValue = 0;
  const revenueByServiceType = new Map<string, number>();
  for (const project of projectsR.docs as AnyDoc[]) {
    const budget = Number(project.budget ?? 0);
    projectValue += budget;
    const type = String(project.projectType ?? "project");
    revenueByServiceType.set(type, (revenueByServiceType.get(type) ?? 0) + budget);
  }

  let pipelineValue = 0;
  for (const proposal of proposalsR.docs as AnyDoc[]) {
    const status = String(proposal.status ?? "");
    if (!isOpenProposalStatus(status) && status !== "approved") continue;
    const { oneTime, recurring } = proposalAmounts(proposal);
    pipelineValue += oneTime + recurring * 12;
    const type = String(proposal.proposalType ?? "custom");
    revenueByServiceType.set(type, (revenueByServiceType.get(type) ?? 0) + oneTime);
  }

  let contractedValue = 0;
  let atRiskAmount = 0;
  for (const contract of contractsR.docs as AnyDoc[]) {
    const status = String(contract.status ?? "");
    const monthly = Number(contract.monthlyAmount ?? 0);
    const project = Number(contract.projectAmount ?? 0);
    if (status === "signed") contractedValue += project + monthly * 12;
    if (isUnsignedContract(status)) atRiskAmount += project + monthly * 12;
  }

  let lifetimeValue = mrr * 12 + projectValue + contractedValue;
  for (const event of eventsR.docs as AnyDoc[]) {
    if (event.amount != null) lifetimeValue += Number(event.amount);
  }

  return {
    mrr: Math.round(mrr),
    lifetimeValue: Math.round(lifetimeValue),
    contractedValue: Math.round(contractedValue),
    pipelineValue: Math.round(pipelineValue),
    projectValue: Math.round(projectValue),
    activeRetainers,
    atRiskAmount: Math.round(atRiskAmount),
    renewalStatus,
    revenueByServiceType: [...revenueByServiceType.entries()].map(([serviceType, amount]) => ({
      serviceType,
      amount: Math.round(amount),
    })),
  };
}
