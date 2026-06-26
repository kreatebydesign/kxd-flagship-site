/**
 * Pure infrastructure scoring — safe for Payload CLI, hooks, and Next server routes.
 */
import type { InfraDoc, InfrastructureStatus } from "./types";

const MS_PER_DAY = 86_400_000;

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

export function calculateMonthlyStackCost(costs: InfraDoc[]): number {
  return costs
    .filter((c) => c.active !== false)
    .reduce((sum, cost) => {
      const amount = asNumber(cost.amount) ?? 0;
      switch (cost.billingCycle) {
        case "annual":
          return sum + amount / 12;
        case "one-time":
          return sum;
        case "monthly":
        default:
          return sum + amount;
      }
    }, 0);
}

export function calculateAnnualStackCost(
  costs: InfraDoc[],
  record?: InfraDoc | null,
): number {
  const fromCosts = costs
    .filter((c) => c.active !== false)
    .reduce((sum, cost) => {
      const amount = asNumber(cost.amount) ?? 0;
      switch (cost.billingCycle) {
        case "monthly":
          return sum + amount * 12;
        case "annual":
        case "one-time":
          return sum + amount;
        default:
          return sum + amount * 12;
      }
    }, 0);
  const fromRecord = asNumber(record?.annualRenewalCost) ?? 0;
  return Math.max(fromCosts, fromRecord);
}

export function calculateInfrastructureScore(record: InfraDoc | null): number | null {
  if (!record) return null;

  let score = 100;

  const status = String(record.status ?? "unknown") as InfrastructureStatus;
  if (status === "critical") score -= 35;
  else if (status === "attention") score -= 18;
  else if (status === "unknown") score -= 10;

  const ssl = String(record.sslStatus ?? "unknown");
  if (ssl === "expired" || ssl === "missing") score -= 20;
  else if (ssl === "expiring") score -= 12;
  else if (ssl === "unknown") score -= 5;

  const deploy = String(record.deploymentStatus ?? "unknown");
  if (deploy === "failed") score -= 18;
  else if (deploy === "unknown" || deploy === "idle") score -= 6;

  const searchConsole = String(record.searchConsoleStatus ?? "unknown");
  if (searchConsole === "not-connected") score -= 8;
  else if (searchConsole === "unknown") score -= 4;

  const domainDays = daysUntil(record.domainExpirationDate as string);
  if (domainDays != null) {
    if (domainDays < 0) score -= 25;
    else if (domainDays <= 30) score -= 15;
    else if (domainDays <= 60) score -= 8;
  }

  const sslDays = daysUntil(record.sslExpirationDate as string);
  if (sslDays != null) {
    if (sslDays < 0) score -= 20;
    else if (sslDays <= 14) score -= 10;
  }

  if (!record.primaryDomain) score -= 8;
  if (!record.hostingProvider) score -= 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}
