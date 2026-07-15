import "server-only";

import type { WebsiteReviewAttachmentMeta } from "./attachments";
import {
  isWebsiteReviewImageMime,
  WEBSITE_REVIEW_MAX_ATTACHMENTS,
} from "./attachments";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export function mapReviewMediaDocToAttachment(doc: AnyDoc): WebsiteReviewAttachmentMeta {
  const id = doc.id as number;
  const filename = String(doc.originalFilename ?? doc.filename ?? "Attachment");
  const mimeType = String(doc.mimeType ?? "application/octet-stream");
  const filesize = Number(doc.filesize ?? 0);

  return {
    id,
    filename,
    mimeType,
    filesize,
    isImage: isWebsiteReviewImageMime(mimeType),
    url: `/api/portal/website-review/attachments/${id}`,
  };
}

export async function loadAttachmentsForRequest(
  requestId: number,
  maxAttachments: number = WEBSITE_REVIEW_MAX_ATTACHMENTS,
): Promise<WebsiteReviewAttachmentMeta[]> {
  const { getPayload } = await import("payload");
  const config = (await import("@payload-config")).default;
  const payload = await getPayload({ config });

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-review-media" as any,
    where: { relatedRequest: { equals: requestId } },
    sort: "createdAt",
    limit: maxAttachments,
    depth: 0,
    overrideAccess: true,
  });

  return (result.docs as AnyDoc[]).map(mapReviewMediaDocToAttachment);
}

export async function linkAttachmentsToRequest(
  attachmentIds: number[],
  clientId: number,
  requestId: number,
): Promise<void> {
  if (attachmentIds.length === 0) return;

  const { getPayload } = await import("payload");
  const config = (await import("@payload-config")).default;
  const payload = await getPayload({ config });

  for (const mediaId of attachmentIds) {
    const doc = await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-review-media" as any,
      id: mediaId,
      depth: 0,
      overrideAccess: true,
    });

    const row = doc as AnyDoc;
    const rowClientId =
      typeof row.client === "number"
        ? row.client
        : (row.client as { id?: number } | undefined)?.id;

    if (rowClientId !== clientId) {
      throw new Error(`Attachment ${mediaId} does not belong to client.`);
    }

    const existingRequest =
      typeof row.relatedRequest === "number"
        ? row.relatedRequest
        : (row.relatedRequest as { id?: number } | undefined)?.id;

    if (existingRequest != null && existingRequest !== requestId) {
      throw new Error(`Attachment ${mediaId} is already linked to another request.`);
    }

    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-review-media" as any,
      id: mediaId,
      data: { relatedRequest: requestId } as any,
      overrideAccess: true,
    });
  }
}

export async function validateAttachmentIdsForClient(
  attachmentIds: number[],
  clientId: number,
  maxAttachments: number = WEBSITE_REVIEW_MAX_ATTACHMENTS,
): Promise<void> {
  if (attachmentIds.length > maxAttachments) {
    throw new Error(`Maximum ${maxAttachments} attachments allowed.`);
  }

  const { getPayload } = await import("payload");
  const config = (await import("@payload-config")).default;
  const payload = await getPayload({ config });

  for (const mediaId of attachmentIds) {
    const doc = await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-review-media" as any,
      id: mediaId,
      depth: 0,
      overrideAccess: true,
    });

    const row = doc as AnyDoc;
    const rowClientId =
      typeof row.client === "number"
        ? row.client
        : (row.client as { id?: number } | undefined)?.id;

    if (rowClientId !== clientId) {
      throw new Error(`Attachment ${mediaId} is not available.`);
    }

    const existingRequest =
      typeof row.relatedRequest === "number"
        ? row.relatedRequest
        : (row.relatedRequest as { id?: number } | undefined)?.id;

    if (existingRequest != null) {
      throw new Error(`Attachment ${mediaId} is already in use.`);
    }
  }
}
