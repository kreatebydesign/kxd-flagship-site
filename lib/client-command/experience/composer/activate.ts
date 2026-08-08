import "server-only";

import { saveOperatorExperience } from "../save";
import type { OperatorExperienceSnapshot } from "../types";
import type { ExperienceActivateInput } from "./types";

/**
 * Explicit operator activation — the only composer write path.
 * Reuses Manage Client Experience save. Never called from generate/recommend.
 */
export async function activateRecommendedExperience(
  clientId: number,
  input: ExperienceActivateInput,
): Promise<OperatorExperienceSnapshot> {
  return saveOperatorExperience(clientId, {
    profileStatus: "active",
    clientName: input.branding.clientName,
    portalSidebarLabel: input.branding.portalSidebarLabel,
    welcomeEyebrow: input.branding.welcomeEyebrow,
    reassuranceLine: input.branding.reassuranceLine,
    supportTone: input.branding.supportTone,
    primaryColor: input.branding.primaryColor,
    secondaryColor: input.branding.secondaryColor,
    accentColor: input.branding.accentColor,
    borderRadiusPreset: input.branding.borderRadiusPreset,
    motionPreset: input.branding.motionPreset,
    showKxdPartnerMark: input.branding.showKxdPartnerMark,
    partnerFooterLine: input.branding.partnerFooterLine,
    terminology: {},
    selectedPortalModules: input.acceptedModules,
  });
}
