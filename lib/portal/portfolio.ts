/**
 * Authorized Portfolio access gate — Phase 4 Batch F.
 *
 * Multi-membership alone never grants portfolio views unless the server
 * marks portfolioAccessAvailable. Aggregation still requires every included
 * client to be membership-authorized (enforced by loaders).
 *
 * Pure helpers — safe for verifiers (no Payload / Next dependencies).
 */

import type { PortalAccountContextSummary } from "./account-context-types";

export type PortfolioAccessReason =
  | "authorized-multi-account"
  | "not-enabled"
  | "single-account"
  | "switching-inactive"
  | "no-authorized-accounts";

export type PortfolioAccessDecision =
  | { available: true; reason: "authorized-multi-account" }
  | { available: false; reason: Exclude<PortfolioAccessReason, "authorized-multi-account"> };

/**
 * Decide whether the authorized combined portfolio surface may render.
 * Never trusts browser-supplied client lists — callers pass server context only.
 */
export function resolvePortfolioAccess(
  context: Pick<
    PortalAccountContextSummary,
    "switchingAvailable" | "authorizedClientIds" | "portfolioAccessAvailable"
  >,
): PortfolioAccessDecision {
  if (!context.portfolioAccessAvailable) {
    return { available: false, reason: "not-enabled" };
  }

  if (!Array.isArray(context.authorizedClientIds) || context.authorizedClientIds.length === 0) {
    return { available: false, reason: "no-authorized-accounts" };
  }

  if (!context.switchingAvailable) {
    return { available: false, reason: "switching-inactive" };
  }

  if (context.authorizedClientIds.length <= 1) {
    return { available: false, reason: "single-account" };
  }

  return { available: true, reason: "authorized-multi-account" };
}
