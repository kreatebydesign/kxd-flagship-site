import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { staffMayAccessClient } from "../client-assignments";
import type { StaffActor } from "../types";
import {
  normalizeStaffClientNoteBody,
  type StaffClientNoteKind,
  validateStaffClientNoteInput,
} from "./policy";
import type { StaffClientNoteRecord } from "./types";

export const STAFF_CLIENT_NOTES_COLLECTION = "staff-client-notes" as const;

export type { StaffClientNoteRecord } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = Number((value as AnyDoc).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

export function toStaffClientNoteRecord(doc: AnyDoc): StaffClientNoteRecord {
  return {
    id: Number(doc.id),
    clientId: relId(doc.client) ?? 0,
    authorUserId: relId(doc.authorUser) ?? 0,
    authorDisplayName: String(doc.authorDisplayName ?? "").trim() || "Staff",
    kind: (doc.kind as StaffClientNoteKind) || "note",
    body: String(doc.body ?? "").trim(),
    createdAt: String(doc.createdAt ?? new Date().toISOString()),
    updatedAt: String(doc.updatedAt ?? doc.createdAt ?? new Date().toISOString()),
  };
}

export async function listStaffClientNotesForClient(
  clientId: number,
  options?: { limit?: number },
): Promise<StaffClientNoteRecord[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: STAFF_CLIENT_NOTES_COLLECTION as any,
    where: { client: { equals: clientId } },
    sort: "-createdAt",
    limit: options?.limit ?? 100,
    depth: 0,
    overrideAccess: true,
  });
  return (result.docs as AnyDoc[]).map(toStaffClientNoteRecord);
}

export async function createStaffClientNote(input: {
  actor: StaffActor;
  clientId: number;
  kind: StaffClientNoteKind;
  body: string;
}): Promise<
  | { ok: true; note: StaffClientNoteRecord }
  | { ok: false; error: string; status: number }
> {
  const validation = validateStaffClientNoteInput({
    body: input.body,
    kind: input.kind,
  });
  if (!validation.ok) {
    return { ok: false, error: validation.error, status: 400 };
  }

  const allowed = await staffMayAccessClient(input.actor, input.clientId);
  if (!allowed) {
    return {
      ok: false,
      error: "Staff permission denied: client not in assigned scope.",
      status: 403,
    };
  }

  const body = normalizeStaffClientNoteBody(input.body);
  const payload = await getPayload({ config });
  const doc = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: STAFF_CLIENT_NOTES_COLLECTION as any,
    data: {
      client: input.clientId,
      authorUser: input.actor.userId,
      authorDisplayName: input.actor.displayName.trim() || input.actor.email,
      kind: input.kind,
      body,
    },
    depth: 0,
    overrideAccess: true,
  });

  return { ok: true, note: toStaffClientNoteRecord(doc as AnyDoc) };
}
