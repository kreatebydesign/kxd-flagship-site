/**
 * Server entry — resolve Authorized Portfolio after portal session authorization.
 * Aggregates only active memberships. Never trusts browser client IDs.
 */
import "server-only";

import { resolveExperienceProfile } from "@/lib/ces/server";
import type { PortalAccountContextSummary } from "@/lib/portal/account-context-types";
import { resolvePortfolioAccess } from "@/lib/portal/portfolio";
import type { PortalSession } from "@/lib/portal/session";
import { resolvePortalWorkPerformance } from "@/lib/portal/work-performance/server";
import type { WorkPerformanceModel } from "@/lib/portal/work-performance/types";
import { composeAuthorizedPortfolio } from "./compose";
import type { AuthorizedPortfolioModel } from "./types";

function sessionForAuthorizedClient(
  session: PortalSession,
  account: { clientId: number; clientName: string },
): PortalSession {
  return {
    ...session,
    clientId: account.clientId,
    clientName: account.clientName,
  };
}

/**
 * Load work/performance models for every authorized account in the portfolio.
 * Each clientId must appear in accountContext.authorizedClientIds.
 */
async function loadAuthorizedSiteModels(input: {
  session: PortalSession;
  accountContext: PortalAccountContextSummary;
}): Promise<WorkPerformanceModel[]> {
  const { session, accountContext } = input;
  const authorized = new Set(accountContext.authorizedClientIds);

  const accounts =
    accountContext.switcher?.accounts.filter((a) => authorized.has(a.clientId)) ??
    [];

  // Fail closed — portfolio requires an explicit authorized account list.
  if (accounts.length === 0) return [];

  const models = await Promise.all(
    accounts.map(async (account) => {
      if (!authorized.has(account.clientId)) {
        throw new Error(
          "Authorized portfolio refused: membership account is not in authorizedClientIds.",
        );
      }
      const scopedSession = sessionForAuthorizedClient(session, account);
      const experienceProfile = await resolveExperienceProfile(scopedSession);
      if (experienceProfile.identity.clientId !== account.clientId) {
        throw new Error(
          "Authorized portfolio refused: experience profile client does not match authorized account.",
        );
      }
      return resolvePortalWorkPerformance({
        session: scopedSession,
        experienceProfile,
        websiteReview: null,
      });
    }),
  );

  // Final isolation pass — drop anything outside the authorized set.
  return models.filter((model) => authorized.has(model.clientId));
}

/**
 * Resolve the authorized combined portfolio for the authenticated portal user.
 */
export async function resolveAuthorizedPortfolio(input: {
  session: PortalSession;
  accountContext: PortalAccountContextSummary;
}): Promise<AuthorizedPortfolioModel> {
  const { session, accountContext } = input;

  if (accountContext.portalUserId !== session.portalUserId) {
    throw new Error(
      "Authorized portfolio refused: account context user does not match session user.",
    );
  }

  if (accountContext.activeClientId !== session.clientId) {
    throw new Error(
      "Authorized portfolio refused: account context active client does not match session client.",
    );
  }

  const access = resolvePortfolioAccess(accountContext);
  if (!access.available) {
    return composeAuthorizedPortfolio({
      portfolioAccessAvailable: accountContext.portfolioAccessAvailable,
      switchingAvailable: accountContext.switchingAvailable,
      authorizedClientIds: accountContext.authorizedClientIds,
      activeClientId: session.clientId,
      activeClientName: session.clientName,
      siteModels: [],
    });
  }

  const siteModels = await loadAuthorizedSiteModels({ session, accountContext });

  return composeAuthorizedPortfolio({
    portfolioAccessAvailable: accountContext.portfolioAccessAvailable,
    switchingAvailable: accountContext.switchingAvailable,
    authorizedClientIds: accountContext.authorizedClientIds,
    activeClientId: session.clientId,
    activeClientName: session.clientName,
    siteModels,
  });
}
