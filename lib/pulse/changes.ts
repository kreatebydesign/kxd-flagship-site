import { taxonomyLabel } from "@/lib/business-brain";
import type { BusinessSignal, BusinessSignalSeverity } from "@/lib/business-brain";
import type { BusinessSignalTaxonomy } from "@/lib/business-brain/taxonomy";
import type { Observation } from "@/lib/observer/types";
import type { PulseChange, PulseInput, PulseResult } from "./types";
import { changeId, significanceFromSeverity, signalsByTaxonomy } from "./utils";

const SEVERITY_ORDER: BusinessSignalSeverity[] = [
  "critical",
  "high",
  "moderate",
  "low",
  "positive",
];

function worstSeverity(signals: BusinessSignal[]): BusinessSignalSeverity {
  let worst: BusinessSignalSeverity = "positive";
  for (const signal of signals) {
    if (SEVERITY_ORDER.indexOf(signal.severity) < SEVERITY_ORDER.indexOf(worst)) {
      worst = signal.severity;
    }
  }
  return worst;
}

function changeDescription(
  taxonomy: BusinessSignalTaxonomy,
  direction: PulseChange["direction"],
  severity: BusinessSignalSeverity,
): string {
  const label = taxonomyLabel(taxonomy).toLowerCase();

  switch (direction) {
    case "new":
      return `${taxonomyLabel(taxonomy)} appeared for the first time in this pulse cycle.`;
    case "resolved":
      return `${taxonomyLabel(taxonomy)} is no longer present in the current executive state.`;
    case "increased":
      return `${taxonomyLabel(taxonomy)} has increased — ${label} is more pronounced than the previous pulse.`;
    case "decreased":
      return `${taxonomyLabel(taxonomy)} has decreased — ${label} is easing compared to the previous pulse.`;
    case "unchanged":
      return `${taxonomyLabel(taxonomy)} remains at ${severity} severity.`;
  }
}

function compareSignalTaxonomies(
  current: Map<BusinessSignalTaxonomy, BusinessSignal[]>,
  previous: Map<BusinessSignalTaxonomy, BusinessSignal[]>,
): PulseChange[] {
  const changes: PulseChange[] = [];
  const allTaxonomies = new Set([
    ...current.keys(),
    ...previous.keys(),
  ]);

  for (const taxonomy of allTaxonomies) {
    const curr = current.get(taxonomy) ?? [];
    const prev = previous.get(taxonomy) ?? [];

    if (curr.length === 0 && prev.length > 0) {
      changes.push({
        id: changeId(`resolved:${taxonomy}`),
        taxonomy,
        label: `${taxonomyLabel(taxonomy)} resolved`,
        description: changeDescription(taxonomy, "resolved", prev[0]!.severity),
        direction: "resolved",
        significance: significanceFromSeverity(prev[0]!.severity),
        signalIds: prev.map((s) => s.id),
        observationFingerprints: prev.flatMap((s) => s.observationFingerprints),
      });
      continue;
    }

    if (curr.length > 0 && prev.length === 0) {
      const severity = worstSeverity(curr);
      changes.push({
        id: changeId(`new:${taxonomy}`),
        taxonomy,
        label: `${taxonomyLabel(taxonomy)} emerged`,
        description: changeDescription(taxonomy, "new", severity),
        direction: "new",
        significance: significanceFromSeverity(severity),
        signalIds: curr.map((s) => s.id),
        observationFingerprints: curr.flatMap((s) => s.observationFingerprints),
      });
      continue;
    }

    if (curr.length > 0 && prev.length > 0) {
      const currSeverity = worstSeverity(curr);
      const prevSeverity = worstSeverity(prev);
      const currRank = SEVERITY_ORDER.indexOf(currSeverity);
      const prevRank = SEVERITY_ORDER.indexOf(prevSeverity);

      let direction: PulseChange["direction"] = "unchanged";
      if (currRank < prevRank) direction = "increased";
      else if (currRank > prevRank) direction = "decreased";

      if (direction !== "unchanged") {
        changes.push({
          id: changeId(`${direction}:${taxonomy}`),
          taxonomy,
          label: `${taxonomyLabel(taxonomy)} ${direction}`,
          description: changeDescription(taxonomy, direction, currSeverity),
          direction,
          significance: significanceFromSeverity(currSeverity),
          signalIds: curr.map((s) => s.id),
          observationFingerprints: curr.flatMap((s) => s.observationFingerprints),
        });
      }
    }
  }

  return changes;
}

function novelObservationChanges(novel: Observation[]): PulseChange[] {
  return novel
    .filter((obs) => obs.importance === "critical" || obs.importance === "high")
    .slice(0, 5)
    .map((obs) => ({
      id: changeId(`novel:${obs.fingerprint}`),
      taxonomy: "observation.novel" as const,
      label: "New observation",
      description: obs.fact,
      direction: "new" as const,
      significance: obs.importance === "critical" ? ("high" as const) : ("moderate" as const),
      signalIds: [],
      observationFingerprints: [obs.fingerprint],
    }));
}

function deltaObservationChanges(
  delta: NonNullable<PulseInput["delta"]>,
): PulseChange[] {
  if (delta.added.length === 0) return [];

  const highImportance = delta.added.filter(
    (obs) => obs.importance === "critical" || obs.importance === "high",
  );

  if (highImportance.length === 0) return [];

  return [
    {
      id: changeId("delta:added"),
      taxonomy: "observation.novel",
      label: "New activity detected",
      description:
        highImportance.length === 1
          ? `One new high-importance observation: ${highImportance[0]!.fact}`
          : `${highImportance.length} new high-importance observations since the last pulse.`,
      direction: "new",
      significance: highImportance.some((o) => o.importance === "critical") ? "high" : "moderate",
      signalIds: [],
      observationFingerprints: highImportance.map((o) => o.fingerprint),
    },
  ];
}

function noMovementChange(input: PulseInput, changes: PulseChange[]): PulseChange | null {
  if (input.previousBrain && changes.length > 0) return null;
  if (!input.previousBrain && input.brain.signalCount === 0 && input.novel.length === 0) {
    return {
      id: changeId("no-movement"),
      taxonomy: "observation.novel",
      label: "No significant movement",
      description: "No significant movement detected in this initial pulse cycle.",
      direction: "unchanged",
      significance: "low",
      signalIds: [],
      observationFingerprints: [],
    };
  }
  return null;
}

function multipleChangesSummary(changes: PulseChange[]): PulseChange | null {
  const meaningful = changes.filter(
    (c) => c.direction !== "unchanged" && c.significance !== "low",
  );
  if (meaningful.length < 3) return null;

  return {
    id: changeId("multiple-changes"),
    taxonomy: "observation.novel",
    label: "Multiple meaningful changes",
    description: `${meaningful.length} meaningful changes occurred since the last pulse.`,
    direction: "new",
    significance: meaningful.some((c) => c.significance === "high") ? "high" : "moderate",
    signalIds: meaningful.flatMap((c) => c.signalIds),
    observationFingerprints: meaningful.flatMap((c) => c.observationFingerprints),
  };
}

/**
 * Determine what changed since the last pulse run.
 */
export function buildPulseChanges(input: PulseInput): PulseChange[] {
  const currentByTaxonomy = signalsByTaxonomy(input.brain.signals);
  const previousByTaxonomy = signalsByTaxonomy(input.previousBrain?.signals ?? []);

  const changes: PulseChange[] = [
    ...compareSignalTaxonomies(currentByTaxonomy, previousByTaxonomy),
    ...novelObservationChanges(input.novel),
  ];

  if (input.delta) {
    changes.push(...deltaObservationChanges(input.delta));
  }

  const noMovement = noMovementChange(input, changes);
  if (noMovement) changes.push(noMovement);

  if (input.previousBrain && changes.length === 0) {
    changes.push({
      id: changeId("no-movement"),
      taxonomy: "observation.novel",
      label: "No significant movement",
      description: "No significant movement detected since the last pulse.",
      direction: "unchanged",
      significance: "low",
      signalIds: [],
      observationFingerprints: [],
    });
  }

  const summary = multipleChangesSummary(changes);
  if (summary) changes.unshift(summary);

  // Deduplicate by id, sort by significance
  const seen = new Set<string>();
  const significanceRank = { high: 0, moderate: 1, low: 2 };

  return changes
    .filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    })
    .sort((a, b) => significanceRank[a.significance] - significanceRank[b.significance])
    .slice(0, 12);
}
