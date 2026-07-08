import { buildBusinessHealth } from "@/lib/intelligence/briefings/health";
import type { ObserverContext } from "../context";
import type { Observation, ObserverModule } from "../types";
import { makeObservation } from "../utils";

export const businessHealthObserver: ObserverModule = {
  id: "business-health",
  label: "Business Health Observer",
  observe(ctx: ObserverContext): Observation[] {
    const observations: Observation[] = [];
    const recordedAt = ctx.observedAt;
    const health = buildBusinessHealth(ctx);

    observations.push(
      makeObservation({
        source: "business-health",
        category: "health-signal",
        occurredAt: recordedAt,
        recordedAt,
        importance:
          health.level === "critical"
            ? "critical"
            : health.level === "needs-attention"
              ? "high"
              : "normal",
        confidence: "high",
        fact: `Business health score is ${health.score} (${health.level}).`,
        fingerprintKey: `score:${health.score}:${health.level}`,
        supportingEvidence: health.factors.map((factor, i) => ({
          id: `factor-${i}`,
          label: factor,
        })),
        relatedWorkspace: "intelligence",
        automation: { informational: true },
      }),
    );

    for (const factor of health.factors) {
      if (factor.startsWith("No significant")) continue;

      observations.push(
        makeObservation({
          source: "business-health",
          category: "health-signal",
          occurredAt: recordedAt,
          recordedAt,
          importance: factor.includes("blocked") || factor.includes("untriaged") ? "high" : "normal",
          confidence: "high",
          fact: factor.endsWith(".") ? factor : `${factor}.`,
          fingerprintKey: `factor:${factor.slice(0, 48)}`,
          relatedWorkspace: "intelligence",
          automation: {
            informational: false,
            actionable: factor.includes("blocked") || factor.includes("need reply"),
            requiresApproval: true,
          },
        }),
      );
    }

    return observations;
  },
};
