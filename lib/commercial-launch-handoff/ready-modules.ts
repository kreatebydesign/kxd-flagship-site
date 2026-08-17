/**
 * Ready-module policy for commercial → launch handoff V0.
 * New website/service clients get the smallest ready CES surface — not empty modules.
 */

import type { LaunchWizardModuleId } from "@/lib/client-launch-wizard/types";

/** CES experience modules safe for a newly launched website/service client. */
export const HANDOFF_READY_CES_MODULES: readonly LaunchWizardModuleId[] = [
  "website-review",
] as const;

/**
 * Modules that must not be auto-enabled for handoff launches even if a higher
 * plan catalog lists them. Operator may add later after content is ready.
 */
export const HANDOFF_DEFERRED_MODULES: readonly string[] = [
  "inventory",
  "executive-review",
  "website-workspace",
  "executive-performance",
  "google-ads",
  "executive-reporting",
] as const;

export function isHandoffReadyModule(moduleId: string): boolean {
  return (HANDOFF_READY_CES_MODULES as readonly string[]).includes(moduleId);
}

export function filterToHandoffReadyModules(
  moduleIds: readonly string[],
): LaunchWizardModuleId[] {
  return moduleIds.filter(isHandoffReadyModule) as LaunchWizardModuleId[];
}
