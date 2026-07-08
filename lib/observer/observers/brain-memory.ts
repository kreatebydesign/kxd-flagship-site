import type { ObserverContext } from "../context";
import type { Observation, ObserverModule } from "../types";
import { makeObservation } from "../utils";

export const brainMemoryObserver: ObserverModule = {
  id: "brain-memory",
  label: "Brain Memory Observer",
  observe(ctx: ObserverContext): Observation[] {
    const observations: Observation[] = [];
    const recordedAt = ctx.observedAt;

    const recentMemory = ctx.brainMemory.filter((record) => {
      const days = Math.floor(
        (Date.now() - new Date(record.createdAt).getTime()) / 86_400_000,
      );
      return days <= 30;
    });

    if (recentMemory.length === 0) {
      observations.push(
        makeObservation({
          source: "brain-memory",
          category: "state",
          occurredAt: recordedAt,
          recordedAt,
          importance: "low",
          fact: "No brain memory events recorded in the last 30 days.",
          fingerprintKey: "memory:empty",
          relatedWorkspace: "brain",
          status: "informational",
          automation: { informational: true },
        }),
      );
      return observations;
    }

    const actionCounts = {
      shown: recentMemory.filter((r) => r.action === "shown").length,
      dismissed: recentMemory.filter((r) => r.action === "dismissed").length,
      completed: recentMemory.filter((r) => r.action === "completed").length,
      ignored: recentMemory.filter((r) => r.action === "ignored").length,
    };

    observations.push(
      makeObservation({
        source: "brain-memory",
        category: "state",
        occurredAt: recordedAt,
        recordedAt,
        importance: "normal",
        fact: `${recentMemory.length} recommendation memory event${recentMemory.length === 1 ? "" : "s"} in the last 30 days.`,
        fingerprintKey: `memory-count:${recentMemory.length}`,
        supportingEvidence: Object.entries(actionCounts).map(([action, count]) => ({
          id: action,
          label: action,
          value: count,
        })),
        relatedWorkspace: "brain",
        automation: { informational: true },
      }),
    );

    for (const record of recentMemory.slice(0, 15)) {
      const title = record.title ?? record.recommendationId;

      observations.push(
        makeObservation({
          source: "brain-memory",
          category: "memory",
          occurredAt: record.createdAt,
          recordedAt,
          importance: record.action === "completed" ? "normal" : "low",
          confidence: "high",
          fact: `Recommendation "${title}" was ${record.action}.`,
          fingerprintKey: `memory:${record.id}:${record.action}`,
          relatedClientId: record.clientId ?? null,
          relatedWorkspace: "brain",
          relatedObjects: [
            {
              type: "brain-memory",
              id: record.id,
              label: record.recommendationId,
            },
          ],
          status: record.action === "completed" ? "resolved" : "informational",
          automation: {
            informational: true,
            resolved: record.action === "completed",
            recurring: record.action === "shown" || record.action === "ignored",
          },
        }),
      );
    }

    return observations;
  },
};
