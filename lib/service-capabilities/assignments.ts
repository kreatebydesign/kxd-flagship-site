import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { getServiceCapability, isServiceCapabilityId } from "./catalog";
import {
  parseAssignmentSource,
  parseAssignmentStatus,
  planServiceActivation,
  resolveServiceScope,
} from "./resolve";
import type {
  ClientServiceAssignmentRecord,
  ResolvedServiceScope,
  ServiceAssignmentSource,
  ServiceCapabilityId,
} from "./types";

type AnyDoc = Record<string, unknown>;

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

function asIso(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return null;
}

export function mapServiceAssignmentDoc(doc: AnyDoc): ClientServiceAssignmentRecord | null {
  const id = Number(doc.id);
  const clientId = relId(doc.client);
  if (!Number.isFinite(id) || clientId == null) return null;
  if (!isServiceCapabilityId(doc.capabilityId)) return null;
  const source = parseAssignmentSource(doc.source) ?? "legacy-manual";
  const status = parseAssignmentStatus(doc.status) ?? "ended";
  return {
    id,
    clientId,
    capabilityId: doc.capabilityId,
    source,
    status,
    effectiveAt: asIso(doc.effectiveAt),
    endedAt: asIso(doc.endedAt),
    relatedContractId: relId(doc.relatedContract),
    note: typeof doc.note === "string" && doc.note.trim() ? doc.note.trim() : null,
  };
}

export async function loadResolvedServiceScope(
  clientId: number,
): Promise<ResolvedServiceScope> {
  const payload = await getPayload({ config });
  let relationshipLabel: string | null = null;
  try {
    const client = (await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    })) as unknown as AnyDoc;
    if (typeof client.commercialRelationshipLabel === "string") {
      relationshipLabel = client.commercialRelationshipLabel.trim() || null;
    }
  } catch {
    relationshipLabel = null;
  }

  try {
    const found = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-service-assignments" as any,
      where: { client: { equals: clientId } },
      limit: 200,
      depth: 0,
      overrideAccess: true,
      sort: "-effectiveAt",
    });
    const assignments = found.docs
      .map((doc) => mapServiceAssignmentDoc(doc as AnyDoc))
      .filter((row): row is ClientServiceAssignmentRecord => row != null);
    return resolveServiceScope({
      assignments,
      relationshipLabel,
      hasRecordedAssignments: found.docs.length > 0,
    });
  } catch {
    return resolveServiceScope({ assignments: [], relationshipLabel });
  }
}

export async function activateClientService(input: {
  clientId: number;
  capabilityId: ServiceCapabilityId;
  source?: ServiceAssignmentSource;
  note?: string | null;
  relatedContractId?: number | null;
}): Promise<ClientServiceAssignmentRecord> {
  const def = getServiceCapability(input.capabilityId);
  if (!def) throw new Error("Unknown service capability.");
  const payload = await getPayload({ config });
  const existing = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-service-assignments" as any,
    where: {
      and: [
        { client: { equals: input.clientId } },
        { capabilityId: { equals: input.capabilityId } },
        { status: { equals: "active" } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const current = existing.docs[0] as AnyDoc | undefined;
  const mappedCurrent = current ? mapServiceAssignmentDoc(current) : null;
  const nextSource =
    input.source ??
    mappedCurrent?.source ??
    (def.kind === "add-on" ? "add-on" : "legacy-manual");
  const plan = planServiceActivation({
    active: mappedCurrent,
    nextSource,
  });

  if (plan.kind === "update") {
    const updated = (await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-service-assignments" as any,
      id: plan.assignmentId,
      data: {
        note: input.note ?? current?.note ?? null,
        relatedContract: input.relatedContractId ?? relId(current?.relatedContract),
      },
      overrideAccess: true,
    })) as AnyDoc;
    const mapped = mapServiceAssignmentDoc(updated);
    if (!mapped) throw new Error("Could not update service assignment.");
    return mapped;
  }

  if (plan.kind === "supersede") {
    await endClientService({
      clientId: input.clientId,
      assignmentId: plan.endAssignmentId,
      status: "ended",
    });
  }

  const created = (await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-service-assignments" as any,
    data: {
      client: input.clientId,
      capabilityId: input.capabilityId,
      source: nextSource,
      status: "active",
      effectiveAt: new Date().toISOString(),
      note: input.note ?? null,
      relatedContract: input.relatedContractId ?? undefined,
    },
    overrideAccess: true,
  })) as AnyDoc;
  const mapped = mapServiceAssignmentDoc(created);
  if (!mapped) throw new Error("Could not create service assignment.");
  return mapped;
}

export async function endClientService(input: {
  clientId: number;
  assignmentId: number;
  status?: "ended" | "expired";
}): Promise<ClientServiceAssignmentRecord> {
  const payload = await getPayload({ config });
  const doc = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-service-assignments" as any,
    id: input.assignmentId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;
  if (relId(doc.client) !== input.clientId) {
    throw new Error("Service assignment does not belong to this client.");
  }
  const updated = (await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-service-assignments" as any,
    id: input.assignmentId,
    data: {
      status: input.status ?? "ended",
      endedAt: asIso(doc.endedAt) ?? new Date().toISOString(),
    },
    overrideAccess: true,
  })) as AnyDoc;
  const mapped = mapServiceAssignmentDoc(updated);
  if (!mapped) throw new Error("Could not end service assignment.");
  return mapped;
}
