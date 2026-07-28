/**
 * Canonical portal account-context resolver.
 * Builds a server-safe summary from the authenticated session + memberships.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { PortalAccountContextSummary } from "./account-context-types";
import {
  dedupeActiveMembershipsByClient,
  listPortalMembershipsForUser,
} from "./memberships";
import { probeMembershipSchemaAvailable } from "./multi-client-readiness";
import type { PortalSession } from "./session";

export type { PortalAccountContextSummary } from "./account-context-types";

/**
 * Resolve account context for an authenticated portal session.
 * Identity comes from the session only — never from the browser.
 */
export async function resolvePortalAccountContext(
  session: PortalSession,
): Promise<PortalAccountContextSummary> {
  const payload = await getPayload({ config });

  let schemaAvailable = false;
  try {
    schemaAvailable = await probeMembershipSchemaAvailable(payload);
  } catch {
    // Unrelated probe failure — treat switching as unavailable; session already authorized.
    schemaAvailable = false;
  }

  const memberships = await listPortalMembershipsForUser(session.portalUserId, {
    payload,
  });
  const active = dedupeActiveMembershipsByClient(
    memberships.filter((m) => m.status === "active"),
  );

  const accessSource =
    active.length > 0 ? ("membership" as const) : ("legacy-fallback" as const);

  const accounts = active.map((m) => ({
    clientId: m.clientId,
    clientName: m.clientName,
    clientSlug: m.clientSlug,
  }));

  // Ensure the session active client appears even on legacy-fallback (single account).
  const authorizedClientIds =
    accounts.length > 0
      ? accounts.map((a) => a.clientId)
      : [session.clientId];

  const switchingAvailable =
    schemaAvailable && accounts.length > 1 && authorizedClientIds.includes(session.clientId);

  const switcherAccounts =
    switchingAvailable
      ? accounts
      : null;

  // If session client is somehow missing from accounts but switching would otherwise
  // qualify, do not show a switcher that cannot include the active account.
  if (
    switchingAvailable &&
    switcherAccounts &&
    !switcherAccounts.some((a) => a.clientId === session.clientId)
  ) {
    return {
      portalUserId: session.portalUserId,
      activeClientId: session.clientId,
      activeClientName: session.clientName,
      accessSource,
      switchingAvailable: false,
      portfolioAccessAvailable: false,
      authorizedClientIds,
      switcher: null,
    };
  }

  return {
    portalUserId: session.portalUserId,
    activeClientId: session.clientId,
    activeClientName: session.clientName,
    accessSource,
    switchingAvailable,
    portfolioAccessAvailable: false,
    authorizedClientIds,
    switcher: switchingAvailable
      ? {
          activeClientId: session.clientId,
          accounts: switcherAccounts ?? [],
        }
      : null,
  };
}
