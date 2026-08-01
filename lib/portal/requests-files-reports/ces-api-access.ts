/**
 * Pure CES module API access decision — no database.
 */

import type { PortalCesModuleApiAccessDecision } from "./types";

/**
 * Portal CES mutation/read APIs must refuse when the active client's profile
 * does not entitle the module — matching page-level requireCesModule gates.
 */
export function decidePortalCesModuleApiAccess(input: {
  moduleEnabled: boolean;
}): PortalCesModuleApiAccessDecision {
  if (!input.moduleEnabled) {
    return { ok: false, reason: "module-unavailable" };
  }
  return { ok: true };
}
