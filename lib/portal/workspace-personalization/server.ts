/**
 * Server entry — resolve personalization only after portal session authorization.
 * Never accepts a browser-supplied clientId.
 */
import "server-only";

import type { ResolvedExperienceProfile } from "@/lib/ces";
import type { PortalSession } from "@/lib/portal/session";
import {
  formatWorkspaceWelcomeTitle,
  resolveWorkspacePersonalization,
} from "./resolve";
import type { WorkspacePersonalizationModel } from "./types";

/**
 * Resolve workspace personalization for the authenticated portal session.
 * Uses session.clientId only — forged clientId query params are ignored.
 */
export function resolvePortalWorkspacePersonalization(input: {
  session: PortalSession;
  experienceProfile: ResolvedExperienceProfile;
}): WorkspacePersonalizationModel {
  return resolveWorkspacePersonalization({
    authorizedClientId: input.session.clientId,
    portalDisplayName: input.session.displayName,
    experienceProfile: input.experienceProfile,
  });
}

export { formatWorkspaceWelcomeTitle };
