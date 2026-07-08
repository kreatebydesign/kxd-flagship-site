import "server-only";

import { redirect } from "next/navigation";
import type { CesModuleId, ResolvedExperienceProfile } from "../types";
import { isCesModuleEnabled } from "../types";

export function requireCesModule(
  profile: ResolvedExperienceProfile,
  moduleId: CesModuleId,
  fallback = "/portal",
): void {
  if (!isCesModuleEnabled(profile, moduleId)) {
    redirect(fallback);
  }
}
