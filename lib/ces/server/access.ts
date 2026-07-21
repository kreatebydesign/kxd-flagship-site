import "server-only";

import { redirect } from "next/navigation";
import type { CesModuleId, ResolvedExperienceProfile } from "../types";
import { isCesModuleEnabled } from "../types";

/**
 * Server-side CES module gate for portal pages/routes.
 *
 * Phase 35A: `resolveExperienceProfile` already intersects enabledModules with
 * Client Plans entitlements for explicitly assigned plans. Callers must pass a
 * profile from that resolver (or equivalent). Hidden nav alone is not security.
 *
 * Remaining follow-up (not migrated this phase — still use profile checks):
 * - Direct CES profile reads in admin readiness (`lib/portal/access-data.ts`)
 * - Reporting ops loaders that read raw `enabledModules` for operator tooling
 * - Activation scripts that mutate CES modules outside the plan UI
 */
export function requireCesModule(
  profile: ResolvedExperienceProfile,
  moduleId: CesModuleId,
  fallback = "/portal",
): void {
  if (!isCesModuleEnabled(profile, moduleId)) {
    redirect(fallback);
  }
}
