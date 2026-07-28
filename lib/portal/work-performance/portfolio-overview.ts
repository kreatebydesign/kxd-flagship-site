/**
 * Authorized multi-site overview — presentation rollup only.
 * Never grants portfolio product access. Never aggregates unauthorized clients.
 */

import type {
  AuthorizedMultiSiteOverview,
  AuthorizedSiteRollup,
  WorkPerformanceModel,
} from "./types";

export function toAuthorizedSiteRollup(model: WorkPerformanceModel): AuthorizedSiteRollup {
  return {
    clientId: model.clientId,
    clientName: model.clientName,
    clientSlug: model.clientSlug,
    completedThisMonth: model.completedThisMonth.length,
    activeWork: model.currentlyInProgress.length,
    awaitingClient: model.updateRequests.awaitingClientCount,
    analyticsAvailability: model.analytics.availability,
    primaryWinTitle: model.wins[0]?.title ?? null,
  };
}

/**
 * Compose an overview across already-authorized site models only.
 * Callers must prove each model.clientId is in the authorized set.
 */
export function composeAuthorizedMultiSiteOverview(input: {
  authorizedClientIds: number[];
  siteModels: WorkPerformanceModel[];
  switchingAvailable: boolean;
}): AuthorizedMultiSiteOverview {
  const authorized = new Set(input.authorizedClientIds);

  // Reject any model outside the authorized set — fail closed.
  for (const model of input.siteModels) {
    if (!authorized.has(model.clientId)) {
      throw new Error(
        "Multi-site overview refused: site model is not in the authorized client set.",
      );
    }
  }

  if (!input.switchingAvailable) {
    return {
      available: false,
      reason: "switching-inactive",
      sites: [],
      totals: null,
    };
  }

  if (input.authorizedClientIds.length <= 1) {
    return {
      available: false,
      reason: "single-site",
      sites: [],
      totals: null,
    };
  }

  // Keep only authorized models; drop duplicates by clientId (first wins).
  const seen = new Set<number>();
  const sites: AuthorizedSiteRollup[] = [];
  for (const model of input.siteModels) {
    if (seen.has(model.clientId)) continue;
    seen.add(model.clientId);
    sites.push(toAuthorizedSiteRollup(model));
  }

  return {
    available: sites.length > 1,
    reason: sites.length > 1 ? "ready" : "single-site",
    sites,
    totals:
      sites.length > 1
        ? {
            siteCount: sites.length,
            completedThisMonth: sites.reduce((n, s) => n + s.completedThisMonth, 0),
            activeWork: sites.reduce((n, s) => n + s.activeWork, 0),
            awaitingClient: sites.reduce((n, s) => n + s.awaitingClient, 0),
          }
        : null,
  };
}
