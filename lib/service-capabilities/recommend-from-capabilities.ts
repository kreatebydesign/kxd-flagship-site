import type { PortalModuleId } from "@/lib/ces/modules/canonical";
import type { ReportingCapabilityId } from "@/lib/reporting/domain/capabilities";
import type { ResolvedServiceScope } from "./types";

/** Pure capability → CES ids. Readiness / needs-setup stays in the composer. */
export function recommendFromCapabilities(scope: ResolvedServiceScope): {
  portalModules: readonly PortalModuleId[];
  reportingCapabilities: readonly ReportingCapabilityId[];
} {
  if (!scope.hasAuthoritativeScope) {
    return { portalModules: [], reportingCapabilities: [] };
  }
  return {
    portalModules: scope.grantedModules,
    reportingCapabilities: scope.grantedReporting,
  };
}
