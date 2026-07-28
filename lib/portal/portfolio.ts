/**
 * Portfolio foundation — Phase 4 Batch F placeholder boundary.
 *
 * Multi-membership alone never grants portfolio-level cross-account views.
 * Portfolio access remains an explicit future capability/role.
 *
 * Pure helpers — safe for verifiers (no Payload / Next dependencies).
 */

import type { PortalAccountContextSummary } from "./account-context-types";

export type PortfolioAccessDecision = {
  available: false;
  reason: "not-enabled";
};

/**
 * Portfolio overview is intentionally absent in this batch.
 * Never aggregate client data unless a future gate enables portfolio access
 * AND every included client is membership-authorized.
 */
export function resolvePortfolioAccess(
  _context: Pick<
    PortalAccountContextSummary,
    "switchingAvailable" | "authorizedClientIds" | "portfolioAccessAvailable"
  >,
): PortfolioAccessDecision {
  return { available: false, reason: "not-enabled" };
}
