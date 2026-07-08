/** Payload-safe — used by CLI hooks and migrate scripts (no server-only). */

import { getPayload } from "payload";
import config from "@payload-config";
import { WORK_COLLECTION } from "../constants";
import type {
  LinkRelationshipInput,
  LinkRelationshipResult,
  WorkIntegrationMetadata,
  WorkRelationshipRecord,
} from "./types";
import { WORK_INTEGRATION_METADATA_VERSION, formatWorkNumber } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function parseMetadata(raw: unknown): WorkIntegrationMetadata {
  if (!raw || typeof raw !== "object") {
    return { integrationVersion: WORK_INTEGRATION_METADATA_VERSION, relationships: [] };
  }
  const meta = raw as WorkIntegrationMetadata;
  return {
    workNumber: meta.workNumber,
    integrationVersion: meta.integrationVersion ?? WORK_INTEGRATION_METADATA_VERSION,
    relationships: Array.isArray(meta.relationships) ? meta.relationships : [],
  };
}

function relationshipKey(type: string, entityId: string, role?: string): string {
  return `${type}:${entityId}:${role ?? ""}`;
}

export async function readWorkRelationships(workId: number): Promise<WorkRelationshipRecord[]> {
  const payload = await getPayload({ config });
  const doc = await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    id: workId,
    depth: 0,
    overrideAccess: true,
  });
  if (!doc) return [];
  return parseMetadata((doc as AnyDoc).metadata).relationships ?? [];
}

export async function assignWorkNumber(workId: number): Promise<string> {
  const workNumber = formatWorkNumber(workId);
  const payload = await getPayload({ config });
  const doc = await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    id: workId,
    depth: 0,
    overrideAccess: true,
  });
  if (!doc) throw new Error("Work item not found.");

  const metadata = parseMetadata((doc as AnyDoc).metadata);
  if (metadata.workNumber) return metadata.workNumber;

  const next: WorkIntegrationMetadata = {
    ...metadata,
    workNumber,
    integrationVersion: WORK_INTEGRATION_METADATA_VERSION,
  };

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    id: workId,
    data: { metadata: next },
    overrideAccess: true,
  });

  return workNumber;
}

/**
 * Link Work to an external entity — many-to-many via metadata.relationships.
 */
export async function linkRelationship(input: LinkRelationshipInput): Promise<LinkRelationshipResult> {
  const payload = await getPayload({ config });
  const doc = await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    id: input.workId,
    depth: 0,
    overrideAccess: true,
  });

  if (!doc) throw new Error("Work item not found.");

  const metadata = parseMetadata((doc as AnyDoc).metadata);
  const existing = metadata.relationships ?? [];
  const key = relationshipKey(input.type, input.entityId, input.role);
  const seen = new Set(existing.map((r) => relationshipKey(r.type, r.entityId, r.role)));

  const nextRecord: WorkRelationshipRecord = {
    type: input.type,
    entityId: input.entityId,
    label: input.label,
    role: input.role,
    linkedAt: new Date().toISOString(),
  };

  const relationships = seen.has(key) ? existing : [...existing, nextRecord];

  const nextMetadata: WorkIntegrationMetadata = {
    ...metadata,
    relationships,
    integrationVersion: WORK_INTEGRATION_METADATA_VERSION,
    workNumber: metadata.workNumber ?? formatWorkNumber(input.workId),
  };

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    id: input.workId,
    data: { metadata: nextMetadata },
    overrideAccess: true,
  });

  return { ok: true, workId: input.workId, relationships };
}

export async function unlinkRelationship(
  workId: number,
  type: LinkRelationshipInput["type"],
  entityId: string,
  role?: string,
): Promise<LinkRelationshipResult> {
  const payload = await getPayload({ config });
  const doc = await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    id: workId,
    depth: 0,
    overrideAccess: true,
  });

  if (!doc) throw new Error("Work item not found.");

  const metadata = parseMetadata((doc as AnyDoc).metadata);
  const key = relationshipKey(type, entityId, role);
  const relationships = (metadata.relationships ?? []).filter(
    (r) => relationshipKey(r.type, r.entityId, r.role) !== key,
  );

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    id: workId,
    data: {
      metadata: {
        ...metadata,
        relationships,
        integrationVersion: WORK_INTEGRATION_METADATA_VERSION,
      },
    },
    overrideAccess: true,
  });

  return { ok: true, workId, relationships };
}

export function findRelationshipsByEntity(
  relationships: WorkRelationshipRecord[],
  type: LinkRelationshipInput["type"],
  entityId: string,
): WorkRelationshipRecord[] {
  return relationships.filter((r) => r.type === type && r.entityId === entityId);
}
