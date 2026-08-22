/**
 * Portal engagement lifecycle — pure presentation helpers.
 */

import type { ResolvedServiceScope } from "@/lib/service-capabilities/types";
import type { ActiveEngagementSnapshot } from "@/lib/portal/active-engagement/types";

export type PortalEngagementLifecycle = "website-build" | "managed-ongoing" | "unknown";

const REBUILD_PATTERN = /\b(rebuild|new website|website build|website project)\b/i;

export function resolvePortalEngagementLifecycle(input: {
  engagement?: ActiveEngagementSnapshot | null;
  monthlyRetainerAmount?: number | null;
  serviceScope?: ResolvedServiceScope | null;
}): PortalEngagementLifecycle {
  const title = input.engagement?.title?.trim() ?? "";
  if (title && REBUILD_PATTERN.test(title)) return "website-build";

  const monthly =
    typeof input.monthlyRetainerAmount === "number" && Number.isFinite(input.monthlyRetainerAmount)
      ? input.monthlyRetainerAmount
      : null;
  const scope = input.serviceScope;
  const hasAnalyticsService = scope?.activeCapabilityIds.includes("analytics_reporting") ?? false;
  const hasManagedWebsite = scope?.activeCapabilityIds.includes("managed_website") ?? false;

  if (monthly === 0 && !hasAnalyticsService) return "website-build";
  if (hasManagedWebsite && !hasAnalyticsService && monthly != null && monthly <= 0) {
    return "website-build";
  }
  if (scope?.hasAuthoritativeScope && scope.activeCapabilityIds.length > 0) {
    return "managed-ongoing";
  }

  return "unknown";
}

export function isWebsiteBuildLifecycle(lifecycle: PortalEngagementLifecycle): boolean {
  return lifecycle === "website-build";
}
