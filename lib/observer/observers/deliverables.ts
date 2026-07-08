import { clientId, clientName, daysUntil } from "@/lib/intelligence/context";
import type { ObserverContext } from "../context";
import type { Observation, ObserverModule } from "../types";
import { makeObservation } from "../utils";

export const deliverablesObserver: ObserverModule = {
  id: "deliverables",
  label: "Deliverables Observer",
  observe(ctx: ObserverContext): Observation[] {
    const observations: Observation[] = [];
    const recordedAt = ctx.observedAt;

    const dueSoon = ctx.intelligence.deliverables.filter((d) => {
      const status = String(d.status ?? "");
      if (status === "complete" || status === "delivered") return false;
      const days = daysUntil(String(d.dueDate ?? ""));
      return days != null && days >= 0 && days <= 7;
    });

    const completedRecent = ctx.intelligence.deliverables.filter((d) => {
      const status = String(d.status ?? "");
      if (status !== "delivered" && status !== "complete") return false;
      const updated = String(d.updatedAt ?? d.createdAt ?? "");
      const days = Math.floor(
        (Date.now() - new Date(updated).getTime()) / 86_400_000,
      );
      return days <= 30;
    });

    if (dueSoon.length > 0) {
      observations.push(
        makeObservation({
          source: "deliverables",
          category: "threshold",
          occurredAt: recordedAt,
          recordedAt,
          importance: dueSoon.length >= 5 ? "high" : "normal",
          fact: `${dueSoon.length} monthly deliverable${dueSoon.length === 1 ? "" : "s"} due within 7 days.`,
          fingerprintKey: `due-soon:${dueSoon.length}`,
          relatedWorkspace: "operations",
          automation: {
            actionable: true,
            requiresApproval: true,
          },
        }),
      );
    }

    for (const d of dueSoon.slice(0, 8)) {
      const cid = clientId(d.client);
      const cname = clientName(d.client, ctx.intelligence);
      const title = String(d.title ?? "Deliverable");

      observations.push(
        makeObservation({
          source: "deliverables",
          category: "state",
          occurredAt: String(d.dueDate ?? recordedAt),
          recordedAt,
          importance: "normal",
          fact: `Deliverable "${title}" is due for ${cname}.`,
          fingerprintKey: `due:${d.id}`,
          relatedClientId: cid,
          relatedClientName: cname,
          relatedWorkspace: "operations",
          relatedObjects: [{ type: "monthly-deliverable", id: Number(d.id), label: title }],
          automation: {
            actionable: true,
            requiresApproval: true,
          },
        }),
      );
    }

    if (completedRecent.length > 0) {
      observations.push(
        makeObservation({
          source: "deliverables",
          category: "lifecycle",
          occurredAt: recordedAt,
          recordedAt,
          importance: "normal",
          fact: `${completedRecent.length} deliverable${completedRecent.length === 1 ? "" : "s"} completed in the last 30 days.`,
          fingerprintKey: `completed-30d:${completedRecent.length}`,
          relatedWorkspace: "operations",
          status: "informational",
          automation: { informational: true, resolved: true },
        }),
      );
    }

    return observations;
  },
};
