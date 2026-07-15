import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { WEBSITE_WORKSPACE_EXPERIENCE_MODULE } from "./constants";
import {
  mapRequestStatusToWorkspace,
  workspaceStatusLabel,
  WEBSITE_WORKSPACE_ACTIVITY_DETAILS,
} from "@/lib/ces/vocabulary/website-workspace";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export async function loadWebsiteWorkspaceTimeline(requestId: number): Promise<
  Array<{
    id: string;
    label: string;
    at: string;
    detail?: string;
  }>
> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "executive-timeline-events" as any,
    where: {
      and: [
        { request: { equals: requestId } },
        { internalOnly: { equals: false } },
      ],
    },
    sort: "createdAt",
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });

  return (result.docs as AnyDoc[])
    .filter((doc) => {
      const meta = doc.metadata as Record<string, unknown> | null | undefined;
      return meta?.experienceModule === WEBSITE_WORKSPACE_EXPERIENCE_MODULE;
    })
    .map((doc) => {
      const meta = (doc.metadata ?? {}) as Record<string, unknown>;
      const clientStatus = mapRequestStatusToWorkspace(
        typeof meta.clientStatus === "string" ? meta.clientStatus : String(doc.status ?? ""),
      );
      const label =
        typeof meta.clientStatus === "string"
          ? workspaceStatusLabel(mapRequestStatusToWorkspace(String(meta.clientStatus)))
          : String(doc.title ?? workspaceStatusLabel(clientStatus));

      return {
        id: String(doc.id),
        label,
        at: String(doc.timestamp ?? doc.createdAt ?? new Date().toISOString()),
        detail:
          doc.summary
            ? String(doc.summary)
            : WEBSITE_WORKSPACE_ACTIVITY_DETAILS[clientStatus],
      };
    });
}
