import "server-only";

import type { PlatformEconomicsComputed, PlatformEconomicsInputs } from "./types";
import type { PlatformEconomicsDashboardContext } from "./types";
import { createPlatformEconomicsSnapshot, economicsSnapshotExistsForFingerprint } from "./snapshots";
import { PLATFORM_ECONOMICS_CALC_VERSION } from "./types";

const EVIDENCE_LABEL_PREFIX = "Evidence · ";

export function isEvidenceEconomicsSnapshotLabel(label: string): boolean {
  return label.startsWith(EVIDENCE_LABEL_PREFIX);
}

/**
 * Idempotent evidence capture — invoke only from authorized POST mutations
 * (manual milestone or release workflow), never from page render or GET.
 */
export async function captureEvidenceValuationSnapshot(args: {
  ctx: PlatformEconomicsDashboardContext;
  inputs: PlatformEconomicsInputs;
  computed: PlatformEconomicsComputed;
  milestoneNotes: string[];
  label?: string;
}): Promise<{ created: boolean; skippedReason?: string; label?: string; id?: string }> {
  const { ctx, inputs, computed, milestoneNotes, label: customLabel } = args;
  const exists = await economicsSnapshotExistsForFingerprint(computed.sourceFingerprint);
  if (exists) {
    return { created: false, skippedReason: "fingerprint-already-recorded" };
  }

  const date = new Date().toISOString().slice(0, 10);
  const label =
    customLabel?.trim() ||
    `${EVIDENCE_LABEL_PREFIX}Verified registry ${ctx.overview.overallCompletionPercent}% · ${date}`;

  const doc = await createPlatformEconomicsSnapshot({
    label,
    calculationVersion: PLATFORM_ECONOMICS_CALC_VERSION,
    sourceFingerprint: computed.sourceFingerprint,
    inputs,
    outputs: computed,
    milestoneNotes: [
      "Authorized evidence capture (not triggered by dashboard page view).",
      ...milestoneNotes.slice(0, 6),
    ],
  });

  return { created: true, label, id: String(doc.id) };
}
