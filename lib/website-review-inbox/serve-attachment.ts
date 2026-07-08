import { getPayload } from "payload";
import config from "@payload-config";
import { openClientReviewMedia } from "@/lib/client-review-media/serve";

export interface ServedAttachment {
  stream: Buffer | NodeJS.ReadableStream | ReadableStream<Uint8Array>;
  mimeType: string;
  filename: string;
}

export async function loadClientReviewMediaRecord(mediaId: number) {
  const payload = await getPayload({ config });
  return payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-review-media" as any,
    id: mediaId,
    depth: 0,
    overrideAccess: true,
  }) as Promise<Record<string, unknown>>;
}

export async function streamClientReviewAttachment(mediaId: number): Promise<ServedAttachment> {
  const row = await loadClientReviewMediaRecord(mediaId);
  const opened = await openClientReviewMedia(row);

  return {
    stream: opened.body,
    mimeType: opened.mimeType,
    filename: opened.filename,
  };
}
