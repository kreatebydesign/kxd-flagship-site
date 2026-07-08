import { clientId, clientName, OPEN_REQUEST_STATUSES } from "@/lib/intelligence/context";
import type { ObserverContext } from "../context";
import type { Observation, ObserverModule } from "../types";
import { makeObservation } from "../utils";

export const clientRequestObserver: ObserverModule = {
  id: "client-request",
  label: "Client Request Observer",
  observe(ctx: ObserverContext): Observation[] {
    const observations: Observation[] = [];
    const recordedAt = ctx.observedAt;

    const openRequests = ctx.intelligence.requests.filter((req) =>
      OPEN_REQUEST_STATUSES.has(String(req.status ?? "")),
    );

    if (openRequests.length > 0) {
      observations.push(
        makeObservation({
          source: "client-request",
          category: "state",
          occurredAt: recordedAt,
          recordedAt,
          importance: openRequests.length > 8 ? "high" : "normal",
          fact: `${openRequests.length} open client request${openRequests.length === 1 ? "" : "s"} across the portfolio.`,
          fingerprintKey: `open-count:${openRequests.length}`,
          relatedWorkspace: "portal",
          automation: { informational: true },
        }),
      );
    }

    for (const req of openRequests.slice(0, 12)) {
      const cid = clientId(req.client);
      const cname = clientName(req.client, ctx.intelligence);
      const title = String(req.requestTitle ?? req.title ?? "Client request");
      const status = String(req.status ?? "new");
      const updatedAt = String(req.updatedAt ?? req.createdAt ?? recordedAt);

      observations.push(
        makeObservation({
          source: "client-request",
          category: "state",
          occurredAt: updatedAt,
          recordedAt,
          importance: String(req.priority ?? "") === "urgent" ? "critical" : "normal",
          fact: `Client request "${title}" is ${status.replace(/-/g, " ")}.`,
          fingerprintKey: `request:${req.id}:${status}`,
          relatedClientId: cid,
          relatedClientName: cname,
          relatedWorkspace: "portal",
          relatedObjects: [{ type: "client-request", id: Number(req.id), label: title }],
          automation: {
            actionable: status === "new" || status === "triaged",
            requiresApproval: true,
          },
        }),
      );
    }

    if (openRequests.length === 0) {
      observations.push(
        makeObservation({
          source: "client-request",
          category: "state",
          occurredAt: recordedAt,
          recordedAt,
          importance: "low",
          fact: "No open client requests on record.",
          fingerprintKey: "requests:clear",
          relatedWorkspace: "portal",
          status: "informational",
          automation: { informational: true, resolved: true },
        }),
      );
    }

    return observations;
  },
};
