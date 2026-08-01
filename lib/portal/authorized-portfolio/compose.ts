/**
 * Pure Batch F portfolio compose — membership-authorized sites only.
 */

import { composeAuthorizedMultiSiteOverview } from "../work-performance/portfolio-overview";
import type { WorkPerformanceModel } from "../work-performance/types";
import { resolvePortfolioAccess } from "../portfolio";
import type { AuthorizedPortfolioModel, AuthorizedPortfolioSite } from "./types";

export type ComposeAuthorizedPortfolioInput = {
  portfolioAccessAvailable: boolean;
  switchingAvailable: boolean;
  authorizedClientIds: number[];
  activeClientId: number;
  activeClientName: string;
  /** Must already be scoped to authorized clients only. */
  siteModels: WorkPerformanceModel[];
};

function emptyStateFor(
  availability: AuthorizedPortfolioModel["availability"],
): AuthorizedPortfolioModel["emptyState"] {
  if (availability === "single-account") {
    return {
      title: "Your workspace is ready",
      lead: "This login is linked to one account. Open Overview to continue in that workspace.",
    };
  }
  if (availability === "not-enabled") {
    return {
      title: "Portfolio is unavailable",
      lead: "A combined portfolio view is not enabled for this login.",
    };
  }
  return {
    title: "Portfolio is unavailable",
    lead: "Authorized account context could not be confirmed. Return to Overview and try again.",
  };
}

/**
 * Compose the authorized portfolio presentation model.
 * Rejects any site model outside the authorized client set (fail closed).
 */
export function composeAuthorizedPortfolio(
  input: ComposeAuthorizedPortfolioInput,
): AuthorizedPortfolioModel {
  const access = resolvePortfolioAccess({
    portfolioAccessAvailable: input.portfolioAccessAvailable,
    switchingAvailable: input.switchingAvailable,
    authorizedClientIds: input.authorizedClientIds,
  });

  const authorized = new Set(input.authorizedClientIds);
  for (const model of input.siteModels) {
    if (!authorized.has(model.clientId)) {
      throw new Error(
        "Authorized portfolio refused: site model is not in the authorized client set.",
      );
    }
  }

  // Drop models that somehow omit the active client authorization set.
  const scopedModels = input.siteModels.filter((model) => authorized.has(model.clientId));

  if (!access.available) {
    const availability =
      access.reason === "single-account"
        ? ("single-account" as const)
        : access.reason === "not-enabled"
          ? ("not-enabled" as const)
          : ("unavailable" as const);

    return {
      availability,
      reason: access.reason,
      activeClientId: input.activeClientId,
      activeClientName: input.activeClientName,
      sites: [],
      overview: {
        available: false,
        reason:
          access.reason === "single-account"
            ? "single-site"
            : access.reason === "switching-inactive"
              ? "switching-inactive"
              : "not-authorized",
        sites: [],
        totals: null,
      },
      emptyState: emptyStateFor(availability),
    };
  }

  const overview = composeAuthorizedMultiSiteOverview({
    authorizedClientIds: input.authorizedClientIds,
    siteModels: scopedModels,
    switchingAvailable: input.switchingAvailable,
  });

  const sites: AuthorizedPortfolioSite[] = overview.sites.map((site) => ({
    ...site,
    isActive: site.clientId === input.activeClientId,
  }));

  if (!overview.available || sites.length <= 1) {
    return {
      availability: "unavailable",
      reason: overview.reason,
      activeClientId: input.activeClientId,
      activeClientName: input.activeClientName,
      sites: [],
      overview,
      emptyState: emptyStateFor("unavailable"),
    };
  }

  return {
    availability: "ready",
    reason: "authorized-multi-account",
    activeClientId: input.activeClientId,
    activeClientName: input.activeClientName,
    sites,
    overview,
    emptyState: {
      title: "No authorized accounts to show",
      lead: "Your portfolio will appear here when multiple authorized accounts are available.",
    },
  };
}
