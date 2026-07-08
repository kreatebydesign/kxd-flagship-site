import { buildOperationalHealth } from "@/lib/intelligence/briefings/health";
import type { ObserverContext } from "../context";
import type { Observation, ObserverModule } from "../types";
import { makeObservation } from "../utils";

export const operationalHealthObserver: ObserverModule = {
  id: "operational-health",
  label: "Operational Health Observer",
  observe(ctx: ObserverContext): Observation[] {
    const observations: Observation[] = [];
    const recordedAt = ctx.observedAt;
    const health = buildOperationalHealth(ctx);

    observations.push(
      makeObservation({
        source: "operational-health",
        category: "health-signal",
        occurredAt: recordedAt,
        recordedAt,
        importance:
          health.level === "overloaded"
            ? "critical"
            : health.level === "strained"
              ? "high"
              : "normal",
        confidence: "high",
        fact: `Operational health score is ${health.score} (${health.level}).`,
        fingerprintKey: `score:${health.score}:${health.level}`,
        supportingEvidence: health.signals.map((signal, i) => ({
          id: `signal-${i}`,
          label: signal,
        })),
        relatedWorkspace: "operations",
        automation: { informational: true },
      }),
    );

    for (const signal of health.signals) {
      if (signal.includes("No significant")) continue;

      observations.push(
        makeObservation({
          source: "operational-health",
          category: "health-signal",
          occurredAt: recordedAt,
          recordedAt,
          importance:
            signal.includes("blocked") || signal.includes("overloaded") || signal.includes("stalled")
              ? "high"
              : "normal",
          confidence: "high",
          fact: signal.endsWith(".") ? signal : `${signal}.`,
          fingerprintKey: `signal:${signal.slice(0, 48)}`,
          relatedWorkspace: "operations",
          automation: {
            actionable: signal.includes("blocked") || signal.includes("stalled"),
            requiresApproval: true,
          },
        }),
      );
    }

    return observations;
  },
};
