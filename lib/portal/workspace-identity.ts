/**
 * Shared client-workspace identity — presentation only.
 * Resolves from existing CES profile / presentation registry fields.
 * Adding a client = data/config, not a new component.
 */

import type { ResolvedExperienceProfile } from "@/lib/ces/types";
import { isGenericWorkspaceSidebarLabel } from "@/lib/ces/copy/client-nav-labels";

/** Canonical KXD IP secondary line for private client portals. */
export const PRIVATE_KXD_WORKSPACE_LABEL = "Private KXD Workspace";

export type ClientWorkspaceIdentityModel = {
  clientName: string;
  logoUrl: string | null;
  logoAlt: string;
  logoOnDarkTreatment: "default" | "light-panel";
  /** Secondary line under the business name (never duplicates the name). */
  workspaceLabel: string;
  websiteUrl: string | null;
};

function labelsMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Resolve the reusable workspace identity from an experience profile.
 * Falls back safely when logo/branding fields are absent.
 */
export function resolveClientWorkspaceIdentity(
  profile: ResolvedExperienceProfile | null | undefined,
  fallbackClientName?: string,
): ClientWorkspaceIdentityModel {
  const clientName =
    profile?.identity.clientName?.trim() ||
    fallbackClientName?.trim() ||
    "Your partnership";

  const sidebarLabel = profile?.hospitality.portalSidebarLabel?.trim() || "";
  const presentationEyebrow =
    profile?.presentation?.workspaceEyebrow?.trim() || "";

  const pickLabel = (label: string): string | null => {
    if (!label) return null;
    if (labelsMatch(label, clientName)) return null;
    if (isGenericWorkspaceSidebarLabel(label)) return null;
    return label;
  };

  const workspaceLabel =
    pickLabel(sidebarLabel) ||
    pickLabel(presentationEyebrow) ||
    PRIVATE_KXD_WORKSPACE_LABEL;

  const logoUrl =
    profile?.identity.logoUrl?.trim() ||
    profile?.presentation?.logoSrc?.trim() ||
    null;

  const logoAlt =
    profile?.identity.logoAlt?.trim() ||
    profile?.presentation?.logoAlt?.trim() ||
    clientName;

  return {
    clientName,
    logoUrl,
    logoAlt,
    logoOnDarkTreatment: profile?.identity.logoOnDarkTreatment ?? "default",
    workspaceLabel,
    websiteUrl: profile?.identity.websiteUrl?.trim() || null,
  };
}
