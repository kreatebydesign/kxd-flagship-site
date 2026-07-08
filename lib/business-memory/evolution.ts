import type { BusinessEvolution, BusinessMemoryInput } from "./types";
import { memoryId } from "./utils";

/**
 * Track business evolution from pulse snapshot history and brain posture shifts.
 */
export function buildBusinessEvolution(input: BusinessMemoryInput): BusinessEvolution[] {
  const evolution: BusinessEvolution[] = [];
  const snapshots = [...input.previousPulseSnapshots, {
    generatedAt: input.pulse.generatedAt,
    postureLevel: input.pulse.posture.level,
    postureLabel: input.pulse.posture.label,
    signalCount: input.brain.signalCount,
    changeCount: input.pulse.changes.length,
    watchlistCount: input.pulse.watchlist.length,
    priorityDomains: input.pulse.priorities.map((p) => p.domain),
  }];

  if (snapshots.length >= 2) {
    const earlier = snapshots[snapshots.length - 2]!;
    const later = snapshots[snapshots.length - 1]!;

    if (earlier.postureLevel !== later.postureLevel) {
      evolution.push({
        id: memoryId("evolution", "posture-shift"),
        label: "Executive posture shifted",
        description: `Business posture moved from ${earlier.postureLabel} to ${later.postureLabel} across pulse cycles.`,
        fromState: earlier.postureLabel,
        toState: later.postureLabel,
        observationFingerprints: [],
      });
    }

    if (later.watchlistCount > earlier.watchlistCount + 1) {
      evolution.push({
        id: memoryId("evolution", "watchlist-growth"),
        label: "Watch areas expanded",
        description: `Areas under continued watch increased from ${earlier.watchlistCount} to ${later.watchlistCount}.`,
        fromState: `${earlier.watchlistCount} watch items`,
        toState: `${later.watchlistCount} watch items`,
        observationFingerprints: input.pulse.watchlist.flatMap((w) => w.signalIds),
      });
    }

    if (later.changeCount > earlier.changeCount) {
      evolution.push({
        id: memoryId("evolution", "movement-increased"),
        label: "Business movement increased",
        description: "More meaningful changes are appearing between pulse cycles.",
        fromState: `${earlier.changeCount} changes`,
        toState: `${later.changeCount} changes`,
        observationFingerprints: input.pulse.changes.flatMap((c) => c.observationFingerprints),
      });
    }
  }

  const brainPosture = input.brain.summary.overallPosture;
  if (input.brain.summary.positiveSignalCount > 0 && brainPosture !== "strained") {
    evolution.push({
      id: memoryId("evolution", "execution-momentum"),
      label: "Execution momentum present",
      description: input.brain.signals.find((s) => s.severity === "positive")?.meaning ??
        "Positive execution signals are visible in the current brain interpretation.",
      fromState: "Prior observation history",
      toState: "Execution momentum recorded",
      observationFingerprints: input.brain.signals
        .filter((s) => s.severity === "positive")
        .flatMap((s) => s.observationFingerprints),
    });
  }

  if (input.context.priorities.length > 0) {
    const top = [...input.context.priorities].sort((a, b) => b.weight - a.weight)[0]!;
    evolution.push({
      id: memoryId("evolution", `priority:${top.key}`),
      label: "Business priorities in context",
      description: `${top.label} remains a weighted priority in the current business context.`,
      fromState: "Business context baseline",
      toState: `${top.label} emphasized`,
      observationFingerprints: [],
    });
  }

  const seen = new Set<string>();
  return evolution
    .filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    })
    .slice(0, 8);
}
