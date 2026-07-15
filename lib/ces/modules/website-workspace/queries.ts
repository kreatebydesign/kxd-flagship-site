import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { WEBSITE_WORKSPACE_EXPERIENCE_MODULE } from "./constants";
import type { WebsiteWorkspaceUpdateContext } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export async function getWebsiteWorkspaceRequestsForClient(
  clientId: number,
): Promise<AnyDoc[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-requests" as any,
    where: {
      and: [
        { client: { equals: clientId } },
        { experienceModule: { equals: WEBSITE_WORKSPACE_EXPERIENCE_MODULE } },
      ],
    },
    sort: "-createdAt",
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });

  return result.docs as AnyDoc[];
}

export async function getWebsiteWorkspaceRequestById(
  clientId: number,
  requestId: number,
): Promise<AnyDoc | null> {
  const payload = await getPayload({ config });
  try {
    const doc = await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-requests" as any,
      id: requestId,
      depth: 0,
      overrideAccess: true,
    });
    const row = doc as AnyDoc;
    const rowClientId =
      typeof row.client === "number"
        ? row.client
        : Number((row.client as { id?: number } | undefined)?.id);
    if (rowClientId !== clientId) return null;
    if (row.experienceModule !== WEBSITE_WORKSPACE_EXPERIENCE_MODULE) return null;
    return row;
  } catch {
    return null;
  }
}

export function readWorkspaceContext(
  doc: AnyDoc,
): WebsiteWorkspaceUpdateContext | null {
  const raw = doc.reviewContext;
  if (!raw || typeof raw !== "object") return null;
  const ctx = raw as WebsiteWorkspaceUpdateContext;
  if (ctx.source !== "website-workspace") return null;
  if (!ctx.pageSlug || !ctx.sectionId) return null;
  return ctx;
}

export function isOpenWorkspaceRequestStatus(status: string): boolean {
  return (
    status === "new" ||
    status === "triaged" ||
    status === "approved" ||
    status === "waiting-on-client" ||
    status === "in-progress"
  );
}
