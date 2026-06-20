/**
 * payload/hooks/client-onboarding.ts
 * Syncs onboarding readiness summary fields onto the linked Client record.
 */

import type { CollectionAfterChangeHook } from "payload";
import {
  calculateOnboardingReadiness,
  formatMissingSections,
  onboardingStatusLabel,
} from "../../lib/client-onboarding.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function resolveClientId(raw: unknown): number | null {
  if (!raw) return null;
  if (typeof raw === "number") return raw;
  if (typeof raw === "object" && raw !== null && "id" in raw) {
    return (raw as AnyDoc).id as number;
  }
  return null;
}

export const syncClientOnboardingSummary: CollectionAfterChangeHook = async ({
  doc,
  req,
}) => {
  const clientId = resolveClientId(doc.client);
  if (!clientId) return doc;

  const readiness = calculateOnboardingReadiness(doc as AnyDoc);
  const missingSections = formatMissingSections(doc as AnyDoc);

  try {
    await req.payload.update({
      collection: "clients",
      id: clientId,
      data: {
        osOnboardingRecordId:      doc.id as number,
        osOnboardingStatus:        onboardingStatusLabel(doc.status as string),
        osOnboardingReadinessScore: readiness.score,
        osOnboardingReadinessLabel: readiness.label,
        osOnboardingMissingSections: missingSections,
        osOnboardingSubmittedAt:   doc.submittedAt ?? null,
        osOnboardingDashboardLink: `/admin/operations/onboarding`,
      },
      context: { skipOnboardingSync: true },
    });
  } catch (err) {
    console.error("[KXD Onboarding] Failed to sync client summary:", err);
  }

  return doc;
};
