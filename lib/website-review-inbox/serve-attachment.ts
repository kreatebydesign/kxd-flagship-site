import path from "path";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { getPayload } from "payload";
import config from "@payload-config";

const STATIC_ROOT = path.join(process.cwd(), "private/client-review-media");

export interface ServedAttachment {
  stream: ReturnType<typeof createReadStream>;
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
  const filename = String(row.filename ?? "");
  if (!filename) throw new Error("File unavailable.");

  const safeName = path.basename(filename);
  const filePath = path.join(STATIC_ROOT, safeName);
  await stat(filePath);

  return {
    stream: createReadStream(filePath),
    mimeType: String(row.mimeType ?? "application/octet-stream"),
    filename: String(row.originalFilename ?? safeName),
  };
}
