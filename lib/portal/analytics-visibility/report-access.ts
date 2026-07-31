/**
 * Pure portal report access checks — no database.
 * Callers supply already-loaded report ownership fields.
 */

import type { PortalReportAccessDecision } from "./types";

export function resolveReportClientId(
  client: number | { id?: number | null } | null | undefined,
): number | null {
  if (typeof client === "number" && Number.isFinite(client) && client > 0) {
    return client;
  }
  if (client && typeof client === "object" && client.id != null) {
    const id = Number(client.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  }
  return null;
}

/**
 * Decide whether a published report may be shown for the authorized active client.
 * Cross-client and unpublished reports fail closed without revealing sibling records.
 */
export function decidePortalReportAccess(input: {
  report: { status?: string | null; client?: number | { id?: number | null } | null } | null;
  authorizedClientId: number;
}): PortalReportAccessDecision {
  if (!Number.isFinite(input.authorizedClientId) || input.authorizedClientId <= 0) {
    return { ok: false, reason: "missing" };
  }
  if (!input.report) {
    return { ok: false, reason: "missing" };
  }
  if (String(input.report.status ?? "") !== "published") {
    return { ok: false, reason: "unpublished" };
  }
  const reportClientId = resolveReportClientId(input.report.client);
  if (reportClientId == null) {
    return { ok: false, reason: "missing" };
  }
  if (reportClientId !== input.authorizedClientId) {
    return { ok: false, reason: "cross-client" };
  }
  return { ok: true };
}

/** Uniform denial for portal UI — never distinguish cross-client from missing. */
export function portalReportAccessDenied(
  decision: PortalReportAccessDecision,
): boolean {
  return !decision.ok;
}
