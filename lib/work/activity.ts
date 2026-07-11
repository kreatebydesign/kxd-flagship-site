/**
 * Append-only activity history on Work documents.
 */

import type { Payload } from "payload";
import { getPayload } from "payload";
import config from "@payload-config";
import { WORK_COLLECTION } from "./constants";
import type { WorkActivityEntry } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export function readActivityHistory(doc: AnyDoc): WorkActivityEntry[] {
  if (!Array.isArray(doc.activityHistory)) return [];
  return doc.activityHistory
    .map((row: AnyDoc) => ({
      at: String(row.at ?? ""),
      actor: row.actor ? String(row.actor) : null,
      action: String(row.action ?? ""),
      detail: row.detail ? String(row.detail) : null,
    }))
    .filter((row: WorkActivityEntry) => row.at && row.action);
}

export async function appendWorkActivityEntry(
  workId: number,
  entry: Omit<WorkActivityEntry, "at"> & { at?: string },
  payloadInstance?: Payload,
): Promise<void> {
  const payload = payloadInstance ?? (await getPayload({ config }));
  const doc = await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    id: workId,
    depth: 0,
    overrideAccess: true,
  });
  if (!doc) return;

  const existing = readActivityHistory(doc as AnyDoc);
  const next: WorkActivityEntry = {
    at: entry.at ?? new Date().toISOString(),
    actor: entry.actor ?? null,
    action: entry.action,
    detail: entry.detail ?? null,
  };

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    id: workId,
    data: {
      activityHistory: [...existing, next],
    },
    depth: 0,
    overrideAccess: true,
  });
}
