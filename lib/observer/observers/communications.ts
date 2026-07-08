import { buildCommunicationsSnapshot } from "@/lib/client-command/communications/data";
import { clientId, clientName } from "@/lib/intelligence/context";
import type { ObserverContext } from "../context";
import type { Observation, ObserverModule } from "../types";
import { makeObservation } from "../utils";

export const communicationsObserver: ObserverModule = {
  id: "communications",
  label: "Communications Observer",
  observe(ctx: ObserverContext): Observation[] {
    const observations: Observation[] = [];
    const recordedAt = ctx.observedAt;
    const snapshot = buildCommunicationsSnapshot(ctx.communicationDocs);
    const { communications } = ctx;

    if (communications.needsReplyCount > 0) {
      observations.push(
        makeObservation({
          source: "communications",
          category: "threshold",
          occurredAt: recordedAt,
          recordedAt,
          importance: communications.needsReplyCount >= 3 ? "high" : "normal",
          fact: `${communications.needsReplyCount} client communication thread${communications.needsReplyCount === 1 ? "" : "s"} need studio reply.`,
          fingerprintKey: `needs-reply:${communications.needsReplyCount}`,
          relatedWorkspace: "communications",
          automation: {
            actionable: true,
            requiresApproval: true,
            informational: false,
          },
        }),
      );
    }

    if (communications.staleUnresolvedCount > 0) {
      observations.push(
        makeObservation({
          source: "communications",
          category: "threshold",
          occurredAt: recordedAt,
          recordedAt,
          importance: "high",
          fact: `${communications.staleUnresolvedCount} communication thread${communications.staleUnresolvedCount === 1 ? " is" : "s are"} stale and unresolved.`,
          fingerprintKey: `stale:${communications.staleUnresolvedCount}`,
          relatedWorkspace: "communications",
          automation: {
            actionable: true,
            requiresApproval: true,
          },
        }),
      );
    }

    if (communications.overdueFollowUpCount > 0) {
      observations.push(
        makeObservation({
          source: "communications",
          category: "threshold",
          occurredAt: recordedAt,
          recordedAt,
          importance: "high",
          fact: `${communications.overdueFollowUpCount} follow-up${communications.overdueFollowUpCount === 1 ? "" : "s"} overdue.`,
          fingerprintKey: `overdue-followup:${communications.overdueFollowUpCount}`,
          relatedWorkspace: "communications",
          automation: {
            actionable: true,
            requiresApproval: true,
          },
        }),
      );
    }

    for (const row of snapshot.communications.filter((c) => c.status === "needs_reply").slice(0, 8)) {
      const doc = ctx.communicationDocs.find((d) => d.id === row.id);
      const cid = doc ? clientId(doc.client) : null;
      const cname = doc ? clientName(doc.client, ctx.intelligence) : row.contactName ?? "Client";
      const label = row.subject ?? row.summary ?? "Communication";

      observations.push(
        makeObservation({
          source: "communications",
          category: "state",
          occurredAt: row.date,
          recordedAt,
          importance: "normal",
          fact: `Communication "${label}" with ${cname} needs reply.`,
          fingerprintKey: `thread-needs-reply:${row.id}`,
          relatedClientId: cid,
          relatedClientName: cname,
          relatedWorkspace: "communications",
          relatedObjects: [{ type: "client-communication", id: row.id, label }],
          automation: {
            actionable: true,
            requiresApproval: true,
          },
        }),
      );
    }

    if (
      communications.needsReplyCount === 0 &&
      communications.staleUnresolvedCount === 0 &&
      communications.openCount === 0
    ) {
      observations.push(
        makeObservation({
          source: "communications",
          category: "state",
          occurredAt: recordedAt,
          recordedAt,
          importance: "low",
          fact: "No open communication threads requiring attention.",
          fingerprintKey: "comms:clear",
          relatedWorkspace: "communications",
          status: "informational",
          automation: { informational: true, resolved: true },
        }),
      );
    }

    return observations;
  },
};
