/**
 * Batch F — Authorized combined portfolio (client-safe presentation).
 * Authorization never trusts this model from the browser.
 */

import type { AuthorizedMultiSiteOverview, AuthorizedSiteRollup } from "../work-performance/types";

export type AuthorizedPortfolioAvailability =
  | "ready"
  | "single-account"
  | "unavailable"
  | "not-enabled";

export type AuthorizedPortfolioSite = AuthorizedSiteRollup & {
  /** True when this site matches the session active client. */
  isActive: boolean;
};

export type AuthorizedPortfolioModel = {
  availability: AuthorizedPortfolioAvailability;
  reason: string;
  activeClientId: number;
  activeClientName: string;
  sites: AuthorizedPortfolioSite[];
  overview: AuthorizedMultiSiteOverview;
  emptyState: {
    title: string;
    lead: string;
  };
};
