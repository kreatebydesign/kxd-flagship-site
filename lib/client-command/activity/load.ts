import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { getExecutiveTimeline } from "@/lib/executive-timeline/data";
import type { CommandDoc } from "../types";
import type { WorkspaceTimelineEvent } from "../workspace-types";
import {
  mapExecutiveDocToWorkspaceEvent,
  mapLegacyClientTimelineToWorkspaceEvent,
} from "./formatters";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

async function fetchClientTimelineLegacy(clientId: number): Promise<CommandDoc[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-timeline-events" as any,
    where: { client: { equals: clientId } },
    sort: "-eventDate",
    limit: 200,
    depth: 0,
    overrideAccess: true,
  });
  return result.docs as CommandDoc[];
}

export async function loadClientActivityTimeline(
  clientId: number,
): Promise<WorkspaceTimelineEvent[]> {
  const [executiveTimeline, legacyTimeline] = await Promise.all([
    getExecutiveTimeline(clientId),
    fetchClientTimelineLegacy(clientId),
  ]);

  const events = [
    ...executiveTimeline.map((doc) => mapExecutiveDocToWorkspaceEvent(doc as AnyDoc)),
    ...legacyTimeline.map((doc) => mapLegacyClientTimelineToWorkspaceEvent(doc as AnyDoc)),
  ];

  return events.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}
