/**
 * Phase 33B — Operator table filters over ReportingOpsRow.
 */

import type { ReportingOpsFilter, ReportingOpsRow } from "./types";

export function parseReportingOpsFilter(value: unknown): ReportingOpsFilter {
  const allowed: ReportingOpsFilter[] = [
    "all",
    "healthy",
    "failing",
    "due",
    "deferred",
    "not-configured",
    "not-entitled",
    "awaiting-action",
    "running",
    "disabled",
  ];
  if (typeof value === "string" && (allowed as string[]).includes(value)) {
    return value as ReportingOpsFilter;
  }
  return "all";
}

export function filterReportingOpsRows(
  rows: readonly ReportingOpsRow[],
  input: {
    filter?: ReportingOpsFilter;
    clientId?: number | null;
    clientSlug?: string | null;
    provider?: string | null;
  },
): ReportingOpsRow[] {
  const filter = input.filter ?? "all";
  const slug = input.clientSlug?.trim().toLowerCase() ?? "";
  const provider = input.provider?.trim() ?? "";

  return rows.filter((row) => {
    if (input.clientId != null && Number.isFinite(input.clientId) && row.clientId !== input.clientId) {
      return false;
    }
    if (slug && (row.clientSlug ?? "").toLowerCase() !== slug && !row.clientName.toLowerCase().includes(slug)) {
      return false;
    }
    if (
      provider &&
      provider !== "all" &&
      row.provider !== provider
    ) {
      return false;
    }

    switch (filter) {
      case "all":
        return true;
      case "healthy":
        return (
          row.operationalStatus === "healthy" ||
          row.operationalStatus === "scheduled" ||
          row.operationalStatus === "fresh-but-manual"
        );
      case "failing":
        return row.operationalStatus === "failing";
      case "due":
        return row.operationalStatus === "due";
      case "deferred":
        return row.operationalStatus === "deferred-backoff";
      case "not-configured":
        return row.operationalStatus === "missing-configuration";
      case "not-entitled":
        return row.operationalStatus === "not-entitled";
      case "awaiting-action":
        return (
          row.operationalStatus === "awaiting-client" ||
          row.operationalStatus === "authorization-unavailable" ||
          row.operationalStatus === "missing-configuration"
        );
      case "running":
        return (
          row.operationalStatus === "running" ||
          row.operationalStatus === "stale-lease"
        );
      case "disabled":
        return (
          row.operationalStatus === "disabled" ||
          row.operationalStatus === "fresh-but-manual"
        );
      default:
        return true;
    }
  });
}
