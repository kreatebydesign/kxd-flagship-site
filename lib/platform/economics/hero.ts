import type {
  PlatformEconomicsComputed,
  PlatformEconomicsSnapshotSummary,
  ValuationHeroMetrics,
} from "./types";

export function buildValuationHeroMetrics(
  computed: PlatformEconomicsComputed,
  snapshotsDesc: PlatformEconomicsSnapshotSummary[],
  calculatedAt: string,
): ValuationHeroMetrics {
  const { replacementCost } = computed;
  const prior = snapshotsDesc.length > 1 ? snapshotsDesc[1] : null;

  let changeMidUsd: number | null = null;
  let changeMidPercent: number | null = null;
  if (prior) {
    changeMidUsd = replacementCost.replacementCostMidUsd - prior.replacementCostMidUsd;
    if (prior.replacementCostMidUsd > 0) {
      changeMidPercent =
        Math.round((changeMidUsd / prior.replacementCostMidUsd) * 1000) / 10;
    }
  }

  return {
    calculatedAt,
    replacementCostMidUsd: replacementCost.replacementCostMidUsd,
    replacementCostLowUsd: replacementCost.replacementCostLowUsd,
    replacementCostHighUsd: replacementCost.replacementCostHighUsd,
    estimatedHoursMid: replacementCost.estimatedHoursMid,
    overallCompletionPercent: computed.overallCompletionPercent,
    registrySubsystemCount: computed.registrySubsystemCount,
    confidence: replacementCost.confidence,
    changeMidUsd,
    changeMidPercent,
    previousSnapshotLabel: prior?.label ?? null,
    previousSnapshotCapturedAt: prior?.capturedAt ?? null,
  };
}
