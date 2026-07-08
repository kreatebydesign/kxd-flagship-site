import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { WEBSITE_REVIEW_EXPERIENCE_MODULE } from "./constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ClientRequestDoc = Record<string, any>;

export async function getWebsiteReviewRequestsForClient(
  clientId: number,
): Promise<ClientRequestDoc[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-requests" as any,
    where: {
      and: [
        { client: { equals: clientId } },
        { experienceModule: { equals: WEBSITE_REVIEW_EXPERIENCE_MODULE } },
      ],
    },
    sort: "-updatedAt",
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });

  return result.docs as ClientRequestDoc[];
}

export async function getWebsiteReviewRequestById(
  clientId: number,
  requestId: number,
): Promise<ClientRequestDoc | null> {
  const payload = await getPayload({ config });
  try {
    const doc = await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-requests" as any,
      id: requestId,
      depth: 0,
      overrideAccess: true,
    });

    const row = doc as ClientRequestDoc;
    const rowClientId =
      typeof row.client === "number"
        ? row.client
        : (row.client as { id?: number } | undefined)?.id;

    if (rowClientId !== clientId) return null;
    if (row.experienceModule !== WEBSITE_REVIEW_EXPERIENCE_MODULE) return null;

    return row;
  } catch {
    return null;
  }
}
