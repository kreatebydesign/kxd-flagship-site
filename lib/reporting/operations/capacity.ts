/**
 * Phase 33B — Safe capacity visibility (numeric limits only; no secrets).
 */

import {
  REPORTING_SWEEP_MAX_CLIENTS_DEFAULT,
  REPORTING_SWEEP_MAX_PROVIDER_ATTEMPTS_DEFAULT,
} from "@/lib/reporting/automation/constants";
import type { ReportingOpsCapacityView } from "./types";

export function resolveReportingSweepCapacityLimits(env: {
  maxClients?: string | number | null;
  maxProviderAttempts?: string | number | null;
} = {}): { maxClients: number; maxProviderAttempts: number } {
  const maxClients = positiveInt(
    env.maxClients ?? process.env.REPORTING_SWEEP_MAX_CLIENTS,
    REPORTING_SWEEP_MAX_CLIENTS_DEFAULT,
  );
  const maxProviderAttempts = positiveInt(
    env.maxProviderAttempts ?? process.env.REPORTING_SWEEP_MAX_PROVIDER_ATTEMPTS,
    REPORTING_SWEEP_MAX_PROVIDER_ATTEMPTS_DEFAULT,
  );
  return { maxClients, maxProviderAttempts };
}

function positiveInt(value: unknown, fallback: number): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

export function buildReportingOpsCapacityView(input: {
  eligibleClients: number;
  eligibleProviderSlots: number;
  lastSweepTruncated?: boolean | null;
  lastSweepFinishedAt?: string | null;
  lastSweepClientsSkippedCapacity?: number | null;
  maxClients?: number;
  maxProviderAttempts?: number;
}): ReportingOpsCapacityView {
  const limits = resolveReportingSweepCapacityLimits({
    maxClients: input.maxClients,
    maxProviderAttempts: input.maxProviderAttempts,
  });
  const maxClients = input.maxClients ?? limits.maxClients;
  const maxProviderAttempts =
    input.maxProviderAttempts ?? limits.maxProviderAttempts;

  return {
    maxClients,
    maxProviderAttempts,
    eligibleClients: Math.max(0, input.eligibleClients),
    eligibleProviderSlots: Math.max(0, input.eligibleProviderSlots),
    wouldTruncateByClients: input.eligibleClients > maxClients,
    wouldTruncateByProviders: input.eligibleProviderSlots > maxProviderAttempts,
    lastSweepTruncated:
      input.lastSweepTruncated === undefined ? null : input.lastSweepTruncated,
    lastSweepFinishedAt: input.lastSweepFinishedAt ?? null,
    lastSweepClientsSkippedCapacity:
      input.lastSweepClientsSkippedCapacity ?? null,
  };
}
