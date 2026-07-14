/**
 * Phase 33B — Pure action body parsing (no Payload / no mutations).
 */

import { isValidReportingOpsProvider } from "./build-row";
import type { ReportingOpsActionType } from "./types";

export type ReportingOpsActionRequest = {
  action: ReportingOpsActionType;
  clientId: number;
  provider?: string;
  confirm?: boolean;
  automationEnabled?: boolean;
  /** Validated strictly at execute time — may be number or digit string. */
  syncHourPacific?: number | string;
};

export function parseReportingOpsActionBody(
  body: unknown,
): ReportingOpsActionRequest | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid JSON body." };
  }
  const raw = body as Record<string, unknown>;
  const action = raw.action;
  const allowed: ReportingOpsActionType[] = [
    "dry-plan",
    "force-sync",
    "retry-failed",
    "clear-expired-lease",
    "set-automation",
    "set-sync-hour",
  ];
  if (typeof action !== "string" || !(allowed as string[]).includes(action)) {
    return { error: "action must be a supported reporting operations action." };
  }
  const clientId = Number(raw.clientId);
  if (!Number.isFinite(clientId) || clientId <= 0) {
    return { error: "clientId must be a positive number." };
  }
  if (
    raw.provider != null &&
    raw.provider !== "" &&
    !isValidReportingOpsProvider(raw.provider)
  ) {
    return { error: "provider must be search-console, ga4, or ads." };
  }

  return {
    action: action as ReportingOpsActionType,
    clientId,
    provider: typeof raw.provider === "string" ? raw.provider : undefined,
    confirm: raw.confirm === true,
    automationEnabled:
      typeof raw.automationEnabled === "boolean" ? raw.automationEnabled : undefined,
    syncHourPacific:
      typeof raw.syncHourPacific === "number" || typeof raw.syncHourPacific === "string"
        ? raw.syncHourPacific
        : undefined,
  };
}
