import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  calculateAnnualStackCost,
  calculateInfrastructureScore,
  calculateMonthlyStackCost,
} from "./scoring";
import type {
  ClientInfrastructureDetail,
  InfraDoc,
  InfrastructureDashboardData,
  InfrastructureHealthSignal,
  InfrastructureStatus,
} from "./types";

const MS_PER_DAY = 86_400_000;
const RENEWAL_WINDOW_DAYS = 60;

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return null;
  return Math.ceil((target - Date.now()) / MS_PER_DAY);
}

function clientIdFromRel(client: unknown): number | null {
  if (typeof client === "number") return client;
  if (typeof client === "object" && client !== null && "id" in client) {
    return Number((client as InfraDoc).id);
  }
  return null;
}

function clientNameFromRel(client: unknown, clientsById: Map<number, InfraDoc>): string {
  if (typeof client === "object" && client !== null && "name" in client) {
    return String((client as InfraDoc).name);
  }
  const id = clientIdFromRel(client);
  if (id != null && clientsById.has(id)) return String(clientsById.get(id)?.name ?? "Client");
  return "Client";
}

export {
  calculateAnnualStackCost,
  calculateInfrastructureScore,
  calculateMonthlyStackCost,
} from "./scoring";

export function getInfrastructureHealthSignals(record: InfraDoc | null): InfrastructureHealthSignal[] {
  if (!record) {
    return [
      { id: "record", label: "Infrastructure record", value: "Not created", status: "unknown" },
    ];
  }

  const domainDays = daysUntil(record.domainExpirationDate as string);
  const sslDays = daysUntil(record.sslExpirationDate as string);

  return [
    {
      id: "status",
      label: "Overall status",
      value: String(record.status ?? "unknown"),
      status:
        record.status === "healthy"
          ? "ok"
          : record.status === "critical"
            ? "critical"
            : record.status === "attention"
              ? "warning"
              : "unknown",
    },
    {
      id: "domain",
      label: "Primary domain",
      value: record.primaryDomain ? String(record.primaryDomain) : "Not on file",
      status: record.primaryDomain ? "ok" : "unknown",
    },
    {
      id: "ssl",
      label: "SSL",
      value: String(record.sslStatus ?? "unknown"),
      status:
        record.sslStatus === "valid"
          ? "ok"
          : record.sslStatus === "expired" || record.sslStatus === "missing"
            ? "critical"
            : record.sslStatus === "expiring"
              ? "warning"
              : "unknown",
    },
    {
      id: "deployment",
      label: "Deployment",
      value: String(record.deploymentStatus ?? "unknown"),
      status:
        record.deploymentStatus === "live"
          ? "ok"
          : record.deploymentStatus === "failed"
            ? "critical"
            : record.deploymentStatus === "building"
              ? "warning"
              : "unknown",
    },
    {
      id: "domain-expiry",
      label: "Domain expiration",
      value:
        domainDays != null
          ? domainDays < 0
            ? "Expired"
            : `${domainDays} days`
          : "Not on file",
      status:
        domainDays == null
          ? "unknown"
          : domainDays < 0
            ? "critical"
            : domainDays <= 30
              ? "warning"
              : "ok",
    },
    {
      id: "ssl-expiry",
      label: "SSL expiration",
      value:
        sslDays != null
          ? sslDays < 0
            ? "Expired"
            : `${sslDays} days`
          : "Not on file",
      status:
        sslDays == null
          ? "unknown"
          : sslDays < 0
            ? "critical"
            : sslDays <= 14
              ? "warning"
              : "ok",
    },
    {
      id: "analytics",
      label: "Analytics",
      value: record.ga4PropertyId
        ? `GA4 · ${record.ga4PropertyId}`
        : record.analyticsProvider
          ? String(record.analyticsProvider)
          : "Not on file",
      status: record.ga4PropertyId || record.analyticsProvider ? "ok" : "unknown",
    },
    {
      id: "search-console",
      label: "Search Console",
      value: String(record.searchConsoleStatus ?? "unknown"),
      status:
        record.searchConsoleStatus === "connected"
          ? "ok"
          : record.searchConsoleStatus === "not-connected"
            ? "warning"
            : "unknown",
    },
  ];
}

async function fetchAllInfrastructure(): Promise<{
  records: InfraDoc[];
  costs: InfraDoc[];
  events: InfraDoc[];
  clients: InfraDoc[];
  retainers: InfraDoc[];
}> {
  const payload = await getPayload({ config });

  const [recordsR, costsR, eventsR, clientsR, retainersR] = await Promise.allSettled([
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-infrastructure" as any,
      limit: 500,
      depth: 1,
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "infrastructure-costs" as any,
      where: { active: { equals: true } },
      limit: 1000,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "infrastructure-events" as any,
      limit: 200,
      depth: 1,
      sort: "-occurredAt",
      overrideAccess: true,
    }),
    payload.find({
      collection: "clients",
      limit: 500,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: "retainers",
      where: { billingStatus: { in: ["active", "current", "upcoming"] } },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    }),
  ]);

  return {
    records: recordsR.status === "fulfilled" ? (recordsR.value.docs as InfraDoc[]) : [],
    costs: costsR.status === "fulfilled" ? (costsR.value.docs as InfraDoc[]) : [],
    events: eventsR.status === "fulfilled" ? (eventsR.value.docs as InfraDoc[]) : [],
    clients: clientsR.status === "fulfilled" ? (clientsR.value.docs as InfraDoc[]) : [],
    retainers: retainersR.status === "fulfilled" ? (retainersR.value.docs as InfraDoc[]) : [],
  };
}

export async function getInfrastructureCosts(
  clientId?: number,
  infrastructureId?: number,
): Promise<InfraDoc[]> {
  const payload = await getPayload({ config });
  const where: InfraDoc = { active: { equals: true } };
  if (clientId) where.client = { equals: clientId };
  if (infrastructureId) where.infrastructure = { equals: infrastructureId };

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "infrastructure-costs" as any,
    where,
    limit: 200,
    depth: 0,
    sort: "category",
    overrideAccess: true,
  });
  return result.docs as InfraDoc[];
}

export async function getInfrastructureEvents(
  clientId?: number,
  infrastructureId?: number,
): Promise<InfraDoc[]> {
  const payload = await getPayload({ config });
  const where: InfraDoc = {};
  if (clientId) where.client = { equals: clientId };
  if (infrastructureId) where.infrastructure = { equals: infrastructureId };

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "infrastructure-events" as any,
    where,
    limit: 100,
    depth: 0,
    sort: "-occurredAt",
    overrideAccess: true,
  });
  return result.docs as InfraDoc[];
}

export async function getUpcomingRenewals(limit = 12): Promise<InfraDoc[]> {
  const { records } = await fetchAllInfrastructure();
  const horizon = Date.now() + RENEWAL_WINDOW_DAYS * MS_PER_DAY;

  return records
    .filter((record) => {
      const next = record.nextRenewalDate as string | undefined;
      if (!next) return false;
      const ts = new Date(next).getTime();
      return !Number.isNaN(ts) && ts <= horizon;
    })
    .sort((a, b) =>
      String(a.nextRenewalDate).localeCompare(String(b.nextRenewalDate)),
    )
    .slice(0, limit);
}

export async function getClientInfrastructure(
  clientId: number,
): Promise<ClientInfrastructureDetail | null> {
  const payload = await getPayload({ config });

  let client: InfraDoc | null = null;
  try {
    client = (await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    })) as InfraDoc;
  } catch {
    return null;
  }

  const infraResult = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-infrastructure" as any,
    where: { client: { equals: clientId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const record = infraResult.docs.length > 0 ? (infraResult.docs[0] as InfraDoc) : null;
  const infraId = record?.id as number | undefined;

  const [costs, events] = await Promise.all([
    getInfrastructureCosts(clientId, infraId),
    getInfrastructureEvents(clientId, infraId),
  ]);

  const score = calculateInfrastructureScore(record);
  const monthlyCost = calculateMonthlyStackCost(costs);
  const annualCost = calculateAnnualStackCost(costs, record);

  return {
    record,
    client,
    costs,
    events,
    healthSignals: getInfrastructureHealthSignals(record),
    score,
    monthlyCost,
    annualCost,
  };
}

export async function getInfrastructureDashboard(): Promise<InfrastructureDashboardData> {
  const { records, costs, events, clients, retainers } = await fetchAllInfrastructure();
  const clientsById = new Map(clients.map((c) => [c.id as number, c]));

  const statusCounts: Record<InfrastructureStatus, number> = {
    healthy: 0,
    attention: 0,
    critical: 0,
    unknown: 0,
  };

  for (const record of records) {
    const status = String(record.status ?? "unknown") as InfrastructureStatus;
    if (status in statusCounts) statusCounts[status]++;
    else statusCounts.unknown++;
  }

  const scores = records
    .map((r) => calculateInfrastructureScore(r))
    .filter((s): s is number => s != null);
  const overallHealthScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

  let overallHealthLabel = "Unknown";
  if (overallHealthScore != null) {
    if (overallHealthScore >= 80) overallHealthLabel = "Healthy";
    else if (overallHealthScore >= 60) overallHealthLabel = "Needs Attention";
    else overallHealthLabel = "Critical";
  }

  const criticalEvents = events.filter(
    (e) =>
      e.status === "open" &&
      (e.severity === "critical" || e.severity === "warning"),
  );

  const criticalIssues =
    statusCounts.critical +
    criticalEvents.filter((e) => e.severity === "critical").length;

  const upcomingRenewals = await getUpcomingRenewals(8);
  const monthlyStackCost = calculateMonthlyStackCost(costs);
  const annualStackCost = records.reduce(
    (sum, record) => sum + calculateAnnualStackCost(
      costs.filter((c) => clientIdFromRel(c.client) === clientIdFromRel(record.client)),
      record,
    ),
    0,
  );

  const totalMrr = retainers.reduce(
    (sum, r) => sum + (asNumber(r.monthlyAmount) ?? 0),
    0,
  );
  const marginOpportunity =
    totalMrr > 0 ? Math.round(totalMrr - monthlyStackCost) : null;

  const enrichedRecords = records.map((record) => ({
    ...record,
    clientName: clientNameFromRel(record.client, clientsById),
    clientId: clientIdFromRel(record.client),
    computedScore: calculateInfrastructureScore(record),
  }));

  return {
    overallHealthScore,
    overallHealthLabel,
    totalClientsTracked: records.length,
    criticalIssues,
    upcomingRenewals: upcomingRenewals.map((r) => ({
      ...r,
      clientName: clientNameFromRel(r.client, clientsById),
      clientId: clientIdFromRel(r.client),
    })),
    monthlyStackCost: Math.round(monthlyStackCost),
    annualStackCost: Math.round(annualStackCost),
    marginOpportunity,
    records: enrichedRecords,
    clients,
    criticalEvents: criticalEvents.slice(0, 10),
    recentEvents: events.slice(0, 12),
    statusCounts,
  };
}

export function formatInfraCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatInfraDate(iso: string | null | undefined): string {
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

export function infraStatusLabel(status: string): string {
  return status
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
