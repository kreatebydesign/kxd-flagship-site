import type { PortalAccountContextSummary } from "@/lib/portal/account-context-types";
import type { PortalSession } from "@/lib/portal/session";
import { DON_CUSICK_PORTAL_EMAIL, DON_CUSICK_PORTFOLIO_CLIENT_IDS } from "./constants";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hasFullPortfolioMembership(
  authorizedClientIds: readonly number[],
): boolean {
  const set = new Set(authorizedClientIds);
  return DON_CUSICK_PORTFOLIO_CLIENT_IDS.every((id) => set.has(id));
}

/**
 * Server gate for Don's four-business accountability workspace.
 * Requires all four client IDs on the authenticated membership set.
 */
export function canAccessDonYourSpace(input: {
  session: PortalSession;
  accountContext: PortalAccountContextSummary | null;
}): boolean {
  const { session, accountContext } = input;
  if (session.accessMode === "partner" || session.clientId <= 0) return false;

  if (session.isOperatorPreview) {
    return (DON_CUSICK_PORTFOLIO_CLIENT_IDS as readonly number[]).includes(
      session.clientId,
    );
  }

  const authorized =
    accountContext?.authorizedClientIds?.length
      ? accountContext.authorizedClientIds
      : [session.clientId];

  if (!hasFullPortfolioMembership(authorized)) {
    return false;
  }

  return normalizeEmail(session.email) === normalizeEmail(DON_CUSICK_PORTAL_EMAIL);
}