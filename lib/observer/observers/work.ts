import type { ObserverContext } from "../context";
import type { Observation, ObserverModule } from "../types";
import { makeObservation } from "../utils";

export const workObserver: ObserverModule = {
  id: "work",
  label: "Work Observer",
  observe(ctx: ObserverContext): Observation[] {
    const observations: Observation[] = [];
    const recordedAt = ctx.observedAt;
    const { stats } = ctx.work;

    observations.push(
      makeObservation({
        source: "work",
        category: "state",
        occurredAt: recordedAt,
        recordedAt,
        importance: stats.openCount > 30 ? "high" : "normal",
        fact: `${stats.openCount} open work item${stats.openCount === 1 ? "" : "s"} in the Work Engine.`,
        fingerprintKey: `open-count:${stats.openCount}`,
        supportingEvidence: [{ id: "open", label: "Open count", value: stats.openCount }],
        relatedWorkspace: "work-engine",
        automation: { informational: true },
      }),
    );

    if (stats.blockedCount > 0) {
      observations.push(
        makeObservation({
          source: "work",
          category: "threshold",
          occurredAt: recordedAt,
          recordedAt,
          importance: stats.blockedCount >= 3 ? "critical" : "high",
          fact: `${stats.blockedCount} work item${stats.blockedCount === 1 ? " is" : "s are"} blocked.`,
          fingerprintKey: `blocked:${stats.blockedCount}`,
          supportingEvidence: [{ id: "blocked", label: "Blocked count", value: stats.blockedCount }],
          relatedWorkspace: "work-engine",
          automation: {
            actionable: true,
            requiresApproval: true,
            informational: false,
          },
        }),
      );
    }

    if (stats.waitingOnClientCount > 0) {
      observations.push(
        makeObservation({
          source: "work",
          category: "state",
          occurredAt: recordedAt,
          recordedAt,
          importance: stats.waitingOnClientCount > 5 ? "high" : "normal",
          fact: `${stats.waitingOnClientCount} work item${stats.waitingOnClientCount === 1 ? "" : "s"} waiting on client input.`,
          fingerprintKey: `waiting-client:${stats.waitingOnClientCount}`,
          relatedWorkspace: "work-engine",
          automation: { informational: true },
        }),
      );
    }

    if (stats.completedTodayCount > 0) {
      observations.push(
        makeObservation({
          source: "work",
          category: "lifecycle",
          occurredAt: recordedAt,
          recordedAt,
          importance: "normal",
          fact: `${stats.completedTodayCount} work item${stats.completedTodayCount === 1 ? "" : "s"} completed today.`,
          fingerprintKey: `completed-today:${stats.completedTodayCount}`,
          relatedWorkspace: "work-engine",
          status: "informational",
          automation: { informational: true, resolved: true },
        }),
      );
    }

    const blockedItems = ctx.work.currentWork.filter((item) => item.status === "blocked");

    for (const item of blockedItems.slice(0, 10)) {
      observations.push(
        makeObservation({
          source: "work",
          category: "state",
          occurredAt: item.updatedAt,
          recordedAt,
          importance: item.priority === "critical" ? "critical" : "high",
          fact: `Work item "${item.title}" is blocked.`,
          fingerprintKey: `item-blocked:${item.id}`,
          relatedClientId: item.clientId,
          relatedClientName: item.clientName,
          relatedWorkspace: "work-engine",
          relatedObjects: [
            { type: "work", id: item.id, label: item.title, href: item.adminHref },
          ],
          automation: {
            actionable: true,
            requiresApproval: true,
            informational: false,
          },
        }),
      );
    }

    return observations;
  },
};
