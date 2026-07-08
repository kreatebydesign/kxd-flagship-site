import type { Observation } from "@/lib/observer/types";
import { BUSINESS_SIGNAL_TAXONOMY } from "./taxonomy";
import type { BusinessPattern, BusinessPatternTrend } from "./types";
import { patternId } from "./utils";

interface PatternInput {
  id: string;
  taxonomy: (typeof BUSINESS_SIGNAL_TAXONOMY)[keyof typeof BUSINESS_SIGNAL_TAXONOMY];
  label: string;
  description: string;
  trend: BusinessPatternTrend;
  occurrenceCount: number;
  fingerprint: string;
  latest: Observation;
}

function toPattern(input: PatternInput): BusinessPattern {
  return {
    id: input.id,
    taxonomy: input.taxonomy,
    label: input.label,
    description: input.description,
    trend: input.trend,
    occurrenceCount: input.occurrenceCount,
    observationFingerprints: [input.fingerprint],
    relatedClientId: input.latest.relatedClientId,
    relatedClientName: input.latest.relatedClientName,
  };
}

function matchesFingerprint(fp: string, ...needles: string[]): boolean {
  const lower = fp.toLowerCase();
  return needles.some((n) => lower.includes(n.toLowerCase()));
}

/**
 * Derive business patterns from observation history.
 */
export function buildBusinessPatterns(input: {
  repeated: Array<{ fingerprint: string; count: number; latest: Observation }>;
  stable: Observation[];
  novel: Observation[];
}): BusinessPattern[] {
  const patterns: BusinessPattern[] = [];

  for (const entry of input.repeated) {
    const { fingerprint, count, latest } = entry;

    if (matchesFingerprint(fingerprint, "blocked", "item-blocked")) {
      patterns.push(
        toPattern({
          id: patternId(BUSINESS_SIGNAL_TAXONOMY.OPERATIONS_LOAD, `blocked:${fingerprint}`),
          taxonomy: BUSINESS_SIGNAL_TAXONOMY.OPERATIONS_LOAD,
          label: "Repeated blocked work",
          description: `Blocked work has appeared ${count} times in observation history.`,
          trend: "repeated",
          occurrenceCount: count,
          fingerprint,
          latest,
        }),
      );
      continue;
    }

    if (matchesFingerprint(fingerprint, "deliverables", "due-soon", "due:")) {
      patterns.push(
        toPattern({
          id: patternId(BUSINESS_SIGNAL_TAXONOMY.DELIVERY_PRESSURE, `due:${fingerprint}`),
          taxonomy: BUSINESS_SIGNAL_TAXONOMY.DELIVERY_PRESSURE,
          label: "Repeated delivery pressure",
          description: `Upcoming deliverable pressure has recurred ${count} times.`,
          trend: "repeated",
          occurrenceCount: count,
          fingerprint,
          latest,
        }),
      );
      continue;
    }

    if (matchesFingerprint(fingerprint, "review", "new:", "active:")) {
      patterns.push(
        toPattern({
          id: patternId(BUSINESS_SIGNAL_TAXONOMY.REVIEW_BACKLOG, `review:${fingerprint}`),
          taxonomy: BUSINESS_SIGNAL_TAXONOMY.REVIEW_BACKLOG,
          label: "Repeated review backlog",
          description: `Website review backlog signal has repeated ${count} times.`,
          trend: "repeated",
          occurrenceCount: count,
          fingerprint,
          latest,
        }),
      );
      continue;
    }

    if (matchesFingerprint(fingerprint, "stale", "needs-reply", "overdue-followup")) {
      patterns.push(
        toPattern({
          id: patternId(BUSINESS_SIGNAL_TAXONOMY.COMMUNICATIONS_ATTENTION, `comms:${fingerprint}`),
          taxonomy: BUSINESS_SIGNAL_TAXONOMY.COMMUNICATIONS_ATTENTION,
          label: "Repeated communications attention",
          description: `Communication follow-up signal has repeated ${count} times.`,
          trend: "repeated",
          occurrenceCount: count,
          fingerprint,
          latest,
        }),
      );
      continue;
    }

    if (matchesFingerprint(fingerprint, "open-count", "blocked:", "overloaded", "strained")) {
      patterns.push(
        toPattern({
          id: patternId(BUSINESS_SIGNAL_TAXONOMY.OPERATIONS_LOAD, `load:${fingerprint}`),
          taxonomy: BUSINESS_SIGNAL_TAXONOMY.OPERATIONS_LOAD,
          label: "Increasing operational load",
          description: `Operational load signal has appeared ${count} times across runs.`,
          trend: count >= 3 ? "increasing" : "repeated",
          occurrenceCount: count,
          fingerprint,
          latest,
        }),
      );
    }
  }

  for (const obs of input.stable) {
    if (matchesFingerprint(obs.fingerprint, "completed-today", "completed-30d")) {
      patterns.push(
        toPattern({
          id: patternId(BUSINESS_SIGNAL_TAXONOMY.EXECUTION_MOMENTUM, `stable:${obs.fingerprint}`),
          taxonomy: BUSINESS_SIGNAL_TAXONOMY.EXECUTION_MOMENTUM,
          label: "Stable execution momentum",
          description: "Completion activity has remained consistent across recent observation runs.",
          trend: "stable",
          occurrenceCount: 3,
          fingerprint: obs.fingerprint,
          latest: obs,
        }),
      );
    }

    if (matchesFingerprint(obs.fingerprint, ":clear", "inbox:clear", "comms:clear", "requests:clear")) {
      patterns.push(
        toPattern({
          id: patternId(BUSINESS_SIGNAL_TAXONOMY.EXECUTION_MOMENTUM, `stable-clear:${obs.fingerprint}`),
          taxonomy: BUSINESS_SIGNAL_TAXONOMY.EXECUTION_MOMENTUM,
          label: "Stable clear posture",
          description: "Clear-state signals have persisted across recent runs.",
          trend: "stable",
          occurrenceCount: 3,
          fingerprint: obs.fingerprint,
          latest: obs,
        }),
      );
    }
  }

  for (const obs of input.novel.slice(0, 5)) {
    if (obs.importance === "critical" || obs.importance === "high") {
      patterns.push(
        toPattern({
          id: patternId(obs.source, `novel:${obs.fingerprint}`),
          taxonomy: fingerprintToTaxonomy(obs.fingerprint, obs.source),
          label: "Novel business signal",
          description: `A new observation appeared for the first time: ${obs.fact}`,
          trend: "novel",
          occurrenceCount: 1,
          fingerprint: obs.fingerprint,
          latest: obs,
        }),
      );
    }
  }

  // Deduplicate by id
  const seen = new Set<string>();
  return patterns.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

function fingerprintToTaxonomy(
  fingerprint: string,
  source: Observation["source"],
): (typeof BUSINESS_SIGNAL_TAXONOMY)[keyof typeof BUSINESS_SIGNAL_TAXONOMY] {
  if (matchesFingerprint(fingerprint, "blocked")) return BUSINESS_SIGNAL_TAXONOMY.OPERATIONS_LOAD;
  if (matchesFingerprint(fingerprint, "due", "deliverable")) return BUSINESS_SIGNAL_TAXONOMY.DELIVERY_PRESSURE;
  if (source === "review") return BUSINESS_SIGNAL_TAXONOMY.REVIEW_BACKLOG;
  if (source === "communications") return BUSINESS_SIGNAL_TAXONOMY.COMMUNICATIONS_ATTENTION;
  if (source === "timeline") return BUSINESS_SIGNAL_TAXONOMY.RELATIONSHIP_ENGAGEMENT;
  if (source === "brain-memory") return BUSINESS_SIGNAL_TAXONOMY.MEMORY_LIFECYCLE;
  return BUSINESS_SIGNAL_TAXONOMY.HEALTH_PRESSURE;
}
