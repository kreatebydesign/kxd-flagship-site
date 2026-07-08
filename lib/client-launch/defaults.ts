/**
 * Client Launch Readiness — reusable CES defaults for new client workspaces.
 * Generalized from the Primal pilot — not client-specific at runtime.
 */

import type { CesModuleId } from "@/lib/ces/types";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";

export interface DefaultCesProfileInput {
  clientName: string;
  clientSlug: string;
  accentColor?: string;
  enabledModules?: CesModuleId[];
}

export interface DefaultCesProfileData {
  profileName: string;
  status: "active";
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  surfaceTint: string | null;
  borderRadiusPreset: "default";
  motionPreset: "calm";
  welcomeEyebrow: string;
  reassuranceLine: string;
  supportTone: "direct";
  portalSidebarLabel: string;
  enabledModules: CesModuleId[];
  showKxdPartnerMark: boolean;
  partnerFooterLine: string;
  terminology: Record<string, string>;
}

export const DEFAULT_LAUNCH_COLORS = {
  primaryColor: "#0B0B0B",
  secondaryColor: "#141414",
  defaultAccentColor: "#C9A962",
} as const;

export const DEFAULT_LAUNCH_MODULES: CesModuleId[] = ["website-review"];

function workspaceLabel(clientName: string): string {
  const trimmed = clientName.trim();
  return trimmed ? `${trimmed} Workspace` : "Your Workspace";
}

function buildLaunchTerminology(clientName: string): Record<string, string> {
  const label = workspaceLabel(clientName);

  return {
    "nav.website-review": "Website Review",
    "portal.home.workspaceLabel": label,
    "portal.home.eyebrow": label,
    "portal.home.lead": PORTAL_CLIENT_LANGUAGE.homeLead,
    "portal.home.launch.eyebrow": PORTAL_CLIENT_LANGUAGE.launchEyebrow,
    "portal.home.launch.title": PORTAL_CLIENT_LANGUAGE.launchTitle,
    "portal.home.launch.lead": PORTAL_CLIENT_LANGUAGE.launchLead,
    "portal.home.launch.leadActive": PORTAL_CLIENT_LANGUAGE.launchLeadActive,
    "portal.home.launch.step1": PORTAL_CLIENT_LANGUAGE.launchSteps[0],
    "portal.home.launch.step2": PORTAL_CLIENT_LANGUAGE.launchSteps[1],
    "portal.home.launch.step3": PORTAL_CLIENT_LANGUAGE.launchSteps[2],
    "portal.home.launch.step4": PORTAL_CLIENT_LANGUAGE.launchSteps[3],
    "portal.home.stat.active": PORTAL_CLIENT_LANGUAGE.statActiveRevisions,
    "portal.home.stat.awaiting": PORTAL_CLIENT_LANGUAGE.statAwaitingYou,
    "portal.home.stat.current": PORTAL_CLIENT_LANGUAGE.statCurrentReview,
    "portal.home.stat.clear": PORTAL_CLIENT_LANGUAGE.statAllClear,
    "portal.home.currentStatus": PORTAL_CLIENT_LANGUAGE.currentStatusHeading,
    "portal.home.openRevision": PORTAL_CLIENT_LANGUAGE.openRevision,
    "portal.home.cta.latestRevision": PORTAL_CLIENT_LANGUAGE.openLatestRevision,
    "portal.home.recentRevisions": PORTAL_CLIENT_LANGUAGE.recentRevisionsHeading,
    "portal.home.module.activeCount": "Revisions in progress",
    "website-review.landing.title": PORTAL_CLIENT_LANGUAGE.reviewHeroTitle,
    "website-review.landing.lead": PORTAL_CLIENT_LANGUAGE.reviewHeroLead,
    "website-review.landing.eyebrow": PORTAL_CLIENT_LANGUAGE.focusEyebrow,
    "website-review.request.eyebrow": PORTAL_CLIENT_LANGUAGE.requestEyebrow,
    "website-review.detail.eyebrow": "Revision details",
    "website-review.cta.request": PORTAL_CLIENT_LANGUAGE.reviewCtaPrimary,
    "website-review.cta.visual": PORTAL_CLIENT_LANGUAGE.reviewCtaVisual,
    "portal.home.currentWork": PORTAL_CLIENT_LANGUAGE.connectedCurrentWork,
    "portal.home.website": PORTAL_CLIENT_LANGUAGE.connectedWebsite,
    "portal.home.recentActivity": PORTAL_CLIENT_LANGUAGE.connectedRecentActivity,
    "portal.home.deliverables": PORTAL_CLIENT_LANGUAGE.connectedDeliverables,
    "portal.home.quickActions": PORTAL_CLIENT_LANGUAGE.connectedQuickActions,
    "portal.home.quick.review-website": PORTAL_CLIENT_LANGUAGE.connectedQuickActionReviewWebsite,
    "portal.home.quick.start-review": PORTAL_CLIENT_LANGUAGE.connectedQuickActionStartReview,
    "portal.home.quick.upload-assets": PORTAL_CLIENT_LANGUAGE.connectedQuickActionUploadAssets,
    "portal.home.quick.message-kxd": PORTAL_CLIENT_LANGUAGE.connectedQuickActionMessageKxd,
    "portal.home.viewAllRevisions": PORTAL_CLIENT_LANGUAGE.viewAllRevisions,
  };
}

function accentSurfaceTint(accentColor: string): string | null {
  const hex = accentColor.trim();
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return null;
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.032)`;
}

/**
 * Build a reusable CES profile payload for a new client workspace.
 * Primal and future clients share this pattern — brand overrides are optional.
 */
export function buildDefaultCesProfileData(
  input: DefaultCesProfileInput,
): DefaultCesProfileData {
  const clientName = input.clientName.trim() || "Client";
  const accentColor = input.accentColor?.trim() || DEFAULT_LAUNCH_COLORS.defaultAccentColor;
  const enabledModules =
    input.enabledModules && input.enabledModules.length > 0
      ? input.enabledModules
      : [...DEFAULT_LAUNCH_MODULES];

  return {
    profileName: `${clientName} Experience`,
    status: "active",
    primaryColor: DEFAULT_LAUNCH_COLORS.primaryColor,
    secondaryColor: DEFAULT_LAUNCH_COLORS.secondaryColor,
    accentColor,
    surfaceTint: accentSurfaceTint(accentColor),
    borderRadiusPreset: "default",
    motionPreset: "calm",
    welcomeEyebrow: PORTAL_CLIENT_LANGUAGE.homeEyebrow,
    reassuranceLine: PORTAL_CLIENT_LANGUAGE.reviewReassuranceLine1,
    supportTone: "direct",
    portalSidebarLabel: clientName,
    enabledModules,
    showKxdPartnerMark: true,
    partnerFooterLine: "Powered by KXD OS",
    terminology: buildLaunchTerminology(clientName),
  };
}
