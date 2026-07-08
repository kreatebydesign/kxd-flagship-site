import type { ObserverContext } from "../context";
import type { Observation, ObserverModule } from "../types";
import { makeObservation } from "../utils";

export const reviewObserver: ObserverModule = {
  id: "review",
  label: "Review Observer",
  observe(ctx: ObserverContext): Observation[] {
    const observations: Observation[] = [];
    const recordedAt = ctx.observedAt;
    const { newCount, activeCount } = ctx.reviewInbox;

    if (newCount > 0) {
      observations.push(
        makeObservation({
          source: "review",
          category: "state",
          occurredAt: recordedAt,
          recordedAt,
          importance: newCount >= 3 ? "high" : "normal",
          fact: `${newCount} new website review submission${newCount === 1 ? "" : "s"} awaiting triage.`,
          fingerprintKey: `new:${newCount}`,
          supportingEvidence: [{ id: "new-count", label: "New reviews", value: newCount }],
          relatedWorkspace: "review-inbox",
          automation: {
            actionable: true,
            requiresApproval: true,
            informational: false,
          },
        }),
      );
    }

    if (activeCount > 0) {
      observations.push(
        makeObservation({
          source: "review",
          category: "state",
          occurredAt: recordedAt,
          recordedAt,
          importance: activeCount > 10 ? "high" : "normal",
          fact: `${activeCount} active website review revision${activeCount === 1 ? "" : "s"} in progress.`,
          fingerprintKey: `active:${activeCount}`,
          relatedWorkspace: "review-inbox",
          automation: { informational: true },
        }),
      );
    }

    for (const item of ctx.reviewInboxItems.filter((i) => i.status === "new").slice(0, 8)) {
      observations.push(
        makeObservation({
          source: "review",
          category: "event",
          occurredAt: item.submittedAt,
          recordedAt,
          importance: item.priority === "urgent" ? "critical" : item.priority === "high" ? "high" : "normal",
          fact: `Website review "${item.title}" submitted by ${item.clientName}.`,
          fingerprintKey: `submission:${item.id}`,
          relatedClientId: item.clientId,
          relatedClientName: item.clientName,
          relatedWorkspace: "review-inbox",
          relatedObjects: [
            {
              type: "client-request",
              id: item.id,
              label: item.title,
              href: item.workspaceUrl,
            },
          ],
          automation: {
            actionable: true,
            requiresApproval: true,
          },
        }),
      );
    }

    if (newCount === 0 && activeCount === 0) {
      observations.push(
        makeObservation({
          source: "review",
          category: "state",
          occurredAt: recordedAt,
          recordedAt,
          importance: "low",
          fact: "Website review inbox is clear.",
          fingerprintKey: "inbox:clear",
          relatedWorkspace: "review-inbox",
          status: "informational",
          automation: { informational: true, resolved: true },
        }),
      );
    }

    return observations;
  },
};
