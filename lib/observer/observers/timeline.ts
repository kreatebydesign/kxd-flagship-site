import { clientId, clientName, daysSince } from "@/lib/intelligence/context";
import type { ObserverContext } from "../context";
import type { Observation, ObserverModule } from "../types";
import { makeObservation } from "../utils";

const RECENT_DAYS = 14;

export const timelineObserver: ObserverModule = {
  id: "timeline",
  label: "Timeline Observer",
  observe(ctx: ObserverContext): Observation[] {
    const observations: Observation[] = [];
    const recordedAt = ctx.observedAt;

    for (const event of ctx.intelligence.executiveTimeline) {
      const occurredAt = String(event.occurredAt ?? event.createdAt ?? recordedAt);
      const days = daysSince(occurredAt);
      if (days != null && days > RECENT_DAYS) continue;

      const cid = clientId(event.client);
      const cname = clientName(event.client, ctx.intelligence);
      const importance = String(event.importance ?? "normal");
      const category = String(event.category ?? "relationship");
      const title = String(event.title ?? "Timeline event");

      observations.push(
        makeObservation({
          source: "timeline",
          category: "event",
          occurredAt,
          recordedAt,
          importance:
            importance === "critical"
              ? "critical"
              : importance === "high"
                ? "high"
                : importance === "low"
                  ? "low"
                  : "normal",
          confidence: "high",
          fact: `${title} recorded on executive timeline.`,
          fingerprintKey: `event:${event.id}`,
          supportingEvidence: [
            {
              id: `timeline-${event.id}`,
              label: category,
              detail: String(event.summary ?? event.description ?? ""),
            },
          ],
          relatedClientId: cid,
          relatedClientName: cname,
          relatedWorkspace: "timeline",
          relatedObjects: [
            {
              type: "executive-timeline-event",
              id: Number(event.id),
              label: title,
            },
          ],
          automation: {
            informational: true,
            actionable: importance === "critical" || importance === "high",
            requiresApproval: true,
          },
        }),
      );
    }

    if (ctx.intelligence.executiveTimeline.length === 0) {
      observations.push(
        makeObservation({
          source: "timeline",
          category: "state",
          occurredAt: recordedAt,
          recordedAt,
          importance: "low",
          confidence: "high",
          fact: "No executive timeline events on record.",
          fingerprintKey: "portfolio:empty",
          relatedWorkspace: "timeline",
          status: "informational",
          automation: { informational: true },
        }),
      );
    }

    return observations;
  },
};
