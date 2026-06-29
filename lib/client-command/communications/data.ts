import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type {
  ClientCommunicationDoc,
  CreateClientCommunicationInput,
  UpdateClientCommunicationInput,
  WorkspaceCommunicationRow,
  WorkspaceCommunicationsSnapshot,
} from "./types";

const COLLECTION = "client-communications";
const STALE_DAYS = 7;

function relId(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    return Number((value as ClientCommunicationDoc).id);
  }
  return null;
}

function toRow(doc: ClientCommunicationDoc): WorkspaceCommunicationRow {
  const clientId = relId(doc.client) ?? 0;
  return {
    id: doc.id as number,
    type: String(doc.type ?? "note") as WorkspaceCommunicationRow["type"],
    direction: String(doc.direction ?? "outbound") as WorkspaceCommunicationRow["direction"],
    subject: doc.subject ? String(doc.subject) : null,
    summary: doc.summary ? String(doc.summary) : null,
    bodyPreview: doc.bodyPreview ? String(doc.bodyPreview) : null,
    contactName: doc.contactName ? String(doc.contactName) : null,
    contactEmail: doc.contactEmail ? String(doc.contactEmail) : null,
    date: String(doc.date ?? doc.createdAt ?? ""),
    status: String(doc.status ?? "logged") as WorkspaceCommunicationRow["status"],
    priority: String(doc.priority ?? "normal") as WorkspaceCommunicationRow["priority"],
    followUpDate: doc.followUpDate ? String(doc.followUpDate) : null,
    source: doc.source ? String(doc.source) : null,
    relatedProjectId: relId(doc.relatedProject),
    relatedRequestId: relId(doc.relatedRequest),
    href: `/admin/collections/client-communications/${doc.id}`,
  };
}

function isOpenStatus(status: string): boolean {
  return status === "logged" || status === "needs_reply" || status === "replied";
}

function isStaleUnresolved(row: WorkspaceCommunicationRow): boolean {
  if (!isOpenStatus(row.status)) return false;
  const ageMs = Date.now() - new Date(row.date).getTime();
  return ageMs > STALE_DAYS * 24 * 60 * 60 * 1000;
}

export function buildCommunicationsSnapshot(
  docs: ClientCommunicationDoc[],
): WorkspaceCommunicationsSnapshot {
  const communications = docs.map(toRow).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const upcomingFollowUps = communications.filter((c) => {
    if (!c.followUpDate) return false;
    const d = new Date(c.followUpDate);
    return d >= startOfToday && isOpenStatus(c.status);
  });

  const overdueFollowUps = communications.filter((c) => {
    if (!c.followUpDate) return false;
    const d = new Date(c.followUpDate);
    return d < startOfToday && isOpenStatus(c.status);
  });

  const needsReplyCount = communications.filter((c) => c.status === "needs_reply").length;
  const openCount = communications.filter((c) => isOpenStatus(c.status)).length;
  const staleUnresolvedCount = communications.filter(isStaleUnresolved).length;

  return {
    communications,
    upcomingFollowUps,
    overdueFollowUps,
    needsReplyCount,
    openCount,
    staleUnresolvedCount,
    hasStaleUnresolved: staleUnresolvedCount > 0,
  };
}

export async function loadClientCommunications(
  clientId: number,
  limit = 200,
): Promise<WorkspaceCommunicationsSnapshot> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: { client: { equals: clientId } },
    limit,
    depth: 0,
    sort: "-date",
    overrideAccess: true,
  });

  return buildCommunicationsSnapshot(result.docs as ClientCommunicationDoc[]);
}

export async function createClientCommunication(
  input: CreateClientCommunicationInput,
): Promise<ClientCommunicationDoc> {
  const payload = await getPayload({ config });
  const doc = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    data: {
      client: input.clientId,
      type: input.type,
      direction: input.direction ?? "outbound",
      subject: input.subject,
      summary: input.summary,
      bodyPreview: input.bodyPreview,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      date: input.date ?? new Date().toISOString(),
      status: input.status ?? "logged",
      priority: input.priority ?? "normal",
      followUpDate: input.followUpDate,
      source: input.source ?? "manual",
      relatedProject: input.relatedProjectId,
      relatedRequest: input.relatedRequestId,
      participants: input.participants,
      metadata: input.metadata,
    },
    overrideAccess: true,
  });

  return doc as ClientCommunicationDoc;
}

export async function updateClientCommunication(
  id: number,
  input: UpdateClientCommunicationInput,
): Promise<ClientCommunicationDoc | null> {
  const payload = await getPayload({ config });
  try {
    const doc = await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      id,
      data: {
        status: input.status,
        priority: input.priority,
        followUpDate: input.followUpDate,
      },
      overrideAccess: true,
    });
    return doc as ClientCommunicationDoc;
  } catch {
    return null;
  }
}
