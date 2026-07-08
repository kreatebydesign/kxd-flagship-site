import { buildRelationshipHealth } from "@/lib/intelligence/briefings/health";
import type { ObserverContext } from "../context";
import type { Observation, ObserverModule } from "../types";
import { makeObservation } from "../utils";

export const relationshipHealthObserver: ObserverModule = {
  id: "relationship-health",
  label: "Relationship Health Observer",
  observe(ctx: ObserverContext): Observation[] {
    const observations: Observation[] = [];
    const recordedAt = ctx.observedAt;
    const health = buildRelationshipHealth(ctx);

    observations.push(
      makeObservation({
        source: "relationship-health",
        category: "health-signal",
        occurredAt: recordedAt,
        recordedAt,
        importance:
          health.level === "at-risk"
            ? "critical"
            : health.level === "cooling"
              ? "high"
              : "normal",
        confidence: "high",
        fact: `Relationship health score is ${health.score} (${health.level}).`,
        fingerprintKey: `score:${health.score}:${health.level}`,
        supportingEvidence: health.signals.map((signal, i) => ({
          id: `signal-${i}`,
          label: signal,
        })),
        relatedWorkspace: "intelligence",
        automation: { informational: true },
      }),
    );

    for (const signal of health.signals) {
      if (signal.includes("Insufficient") || signal.includes("No active")) continue;

      observations.push(
        makeObservation({
          source: "relationship-health",
          category: "health-signal",
          occurredAt: recordedAt,
          recordedAt,
          importance:
            signal.includes("at risk") || signal.includes("cooling") || signal.includes("No executive")
              ? "high"
              : "normal",
          confidence: "medium",
          fact: signal.endsWith(".") ? signal : `${signal}.`,
          fingerprintKey: `signal:${signal.slice(0, 48)}`,
          relatedWorkspace: "intelligence",
          automation: { informational: true },
        }),
      );
    }

    return observations;
  },
};
