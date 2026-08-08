import "server-only";

import { saveOperatorExperience } from "../save";
import type { OperatorExperienceSnapshot } from "../types";
import { composeExperienceRecommendation } from "./recommend";
import { loadExperienceSignals } from "./signals";
import type { ExperienceActivateInput } from "./types";

/**
 * Explicit operator activation — the only composer write path that mutates CES.
 * Reuses Manage Client Experience save. Never called from generate/recommend.
 */
export async function activateRecommendedExperience(
  clientId: number,
  input: ExperienceActivateInput,
): Promise<OperatorExperienceSnapshot> {
  const signals = await loadExperienceSignals(clientId);
  if (!signals) {
    throw new Error("Client not found.");
  }
  if (input.branding.accentColor.trim().toUpperCase() === "#C9A962") {
    throw new Error("KXD gold cannot be stored as the client brand.");
  }

  const recommendation = composeExperienceRecommendation(
    signals,
    input.acceptedModules,
  );
  if (!recommendation.readiness.activationEligible) {
    throw new Error(
      recommendation.readiness.activationBlockers[0] ||
        "Launch-critical dependencies remain unresolved.",
    );
  }

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
