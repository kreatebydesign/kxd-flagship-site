/**
 * Phase 3 Batch C — server-only relationship event list/create/update.
 * Operator-only. Cross-client contact attachment is rejected.
 * Owning client is immutable on edit. No activity emission (private fields).
 * No Calendar / Timeline / scheduling writes.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  EVENT_CATEGORY_LABEL,
  EVENT_STATUS_LABEL,
  type RelationshipEventCategory,
  type RelationshipEventStatus,
} from "./relationship-types";

const COLLECTION = "client-relationship-events";
const CONTACTS_COLLECTION = "client-contacts";

export class EventOwnershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EventOwnershipError";
  }
}

export class EventValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EventValidationError";
  }
}

export type RelationshipEventWriteInput = {
  title: string;
  eventAt: string;
  eventCategory?: RelationshipEventCategory;
  status?: RelationshipEventStatus;
  location?: string | null;
  contextNotes?: string | null;
  followUpNotes?: string | null;
  dietaryNotes?: string | null;
  accessibilityNotes?: string | null;
  contactIds?: number[];
};

export type OperatorClientOption = {
  id: number;
  name: string;
};

export type OperatorContactOption = {
  id: number;
  name: string;
  status: "active" | "inactive";
  roleTitle: string | null;
};

export type OperatorRelationshipEventRow = {
  id: number;
  title: string;
  clientId: number;
  clientName: string;
  eventAt: string;
  eventCategory: RelationshipEventCategory;
  eventCategoryLabel: string;
  status: RelationshipEventStatus;
  statusLabel: string;
  location: string | null;
  contactIds: number[];
  contactNames: string[];
  hasPrivateContext: boolean;
  hasFollowUpNotes: boolean;
  contextNotes: string | null;
  followUpNotes: string | null;
  dietaryNotes: string | null;
  accessibilityNotes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  href: string;
  clientHref: string;
  clientRelationshipHref: string;
  payloadHref: string;
};

export type ListRelationshipEventsQuery = {
  q?: string;
  clientId?: number;
  status?: RelationshipEventStatus | "all";
  category?: RelationshipEventCategory | "all";
  timeframe?: "upcoming" | "recent" | "all";
  limit?: number;
};

function relationId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  if (typeof value === "object" && value !== null && "id" in value) {
    return relationId((value as { id: unknown }).id);
  }
  return null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptional(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseCategory(value: unknown): RelationshipEventCategory {
  if (
    value === "meeting" ||
    value === "dinner" ||
    value === "engagement" ||
    value === "visit" ||
    value === "other"
  ) {
    return value;
  }
  throw new EventValidationError("Invalid event category.");
}

function parseStatus(value: unknown): RelationshipEventStatus {
  if (value === "planned" || value === "completed" || value === "cancelled") {
    return value;
  }
  throw new EventValidationError("Invalid event status.");
}

function parseOptionalCategory(
  value: unknown,
): RelationshipEventCategory | undefined {
  if (value == null || value === "") return undefined;
  return parseCategory(value);
}

function parseOptionalStatus(value: unknown): RelationshipEventStatus | undefined {
  if (value == null || value === "") return undefined;
  return parseStatus(value);
}

function validateTitle(title: unknown): string {
  if (typeof title !== "string" || !title.trim()) {
    throw new EventValidationError("Title is required.");
  }
  return title.trim();
}

function validateEventAt(eventAt: unknown): string {
  if (typeof eventAt !== "string" || !eventAt.trim()) {
    throw new EventValidationError("Event date and time are required.");
  }
  const date = new Date(eventAt);
  if (Number.isNaN(date.getTime())) {
    throw new EventValidationError("Event date and time are invalid.");
  }
  return date.toISOString();
}

async function assertClientExists(clientId: number): Promise<string> {
  const payload = await getPayload({ config });
  try {
    const client = await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    });
    return asString((client as { name?: unknown }).name) ?? `Client ${clientId}`;
  } catch {
    throw new EventValidationError("Client not found.");
  }
}

/**
 * Verify every contactId belongs to trustedClientId.
 * Returns ordered unique ids. Rejects cross-client and missing contacts.
 */
async function assertContactsBelongToClient(
  trustedClientId: number,
  contactIds: number[] | undefined,
): Promise<number[]> {
  if (!contactIds || contactIds.length === 0) return [];

  const unique: number[] = [];
  const seen = new Set<number>();
  for (const raw of contactIds) {
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) {
      throw new EventValidationError("Invalid contact id.");
    }
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
  }

  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: CONTACTS_COLLECTION as any,
    where: {
      and: [
        { id: { in: unique } },
        { client: { equals: trustedClientId } },
      ],
    },
    limit: unique.length,
    depth: 0,
    overrideAccess: true,
  });

  if (result.docs.length !== unique.length) {
    throw new EventOwnershipError(
      "One or more contacts do not belong to the selected client.",
    );
  }

  return unique;
}

async function loadContactNamesForClient(
  clientId: number,
  contactIds: number[],
): Promise<{ names: string[]; ids: number[] }> {
  if (contactIds.length === 0) return { names: [], ids: [] };
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: CONTACTS_COLLECTION as any,
    where: {
      and: [
        { id: { in: contactIds } },
        { client: { equals: clientId } },
      ],
    },
    limit: contactIds.length,
    depth: 0,
    overrideAccess: true,
  });

  const byId = new Map<number, string>();
  for (const doc of result.docs as unknown as Record<string, unknown>[]) {
    const id = relationId(doc.id);
    if (id == null) continue;
    byId.set(id, asString(doc.name) ?? `Contact ${id}`);
  }

  const ids: number[] = [];
  const names: string[] = [];
  for (const id of contactIds) {
    const name = byId.get(id);
    if (!name) continue;
    ids.push(id);
    names.push(name);
  }
  return { names, ids };
}

function extractContactIds(doc: Record<string, unknown>): number[] {
  const raw = Array.isArray(doc.contacts) ? doc.contacts : [];
  const ids: number[] = [];
  const seen = new Set<number>();
  for (const entry of raw) {
    const id = relationId(entry);
    if (id == null || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

async function mapEventRow(
  doc: Record<string, unknown>,
  clientNameById: Map<number, string>,
): Promise<OperatorRelationshipEventRow> {
  const id = relationId(doc.id) ?? 0;
  const clientId = relationId(doc.client) ?? 0;
  const category = (() => {
    try {
      return parseCategory(doc.eventCategory);
    } catch {
      return "meeting" as RelationshipEventCategory;
    }
  })();
  const status = (() => {
    try {
      return parseStatus(doc.status);
    } catch {
      return "planned" as RelationshipEventStatus;
    }
  })();

  const contactIdsRaw = extractContactIds(doc);
  const { names, ids } = await loadContactNamesForClient(clientId, contactIdsRaw);

  const contextNotes = asString(doc.contextNotes);
  const followUpNotes = asString(doc.followUpNotes);

  return {
    id,
    title: asString(doc.title) ?? "Untitled event",
    clientId,
    clientName: clientNameById.get(clientId) ?? `Client ${clientId}`,
    eventAt: asString(doc.eventAt) ?? "",
    eventCategory: category,
    eventCategoryLabel: EVENT_CATEGORY_LABEL[category],
    status,
    statusLabel: EVENT_STATUS_LABEL[status],
    location: asString(doc.location),
    contactIds: ids,
    contactNames: names,
    hasPrivateContext: Boolean(contextNotes),
    hasFollowUpNotes: Boolean(followUpNotes),
    contextNotes,
    followUpNotes,
    dietaryNotes: asString(doc.dietaryNotes),
    accessibilityNotes: asString(doc.accessibilityNotes),
    createdAt: asString(doc.createdAt),
    updatedAt: asString(doc.updatedAt),
    href: `/admin/operations/events/${id}`,
    clientHref: `/admin/operations/clients/${clientId}`,
    clientRelationshipHref: `/admin/operations/clients/${clientId}?tab=relationship`,
    payloadHref: `/admin/collections/client-relationship-events/${id}`,
  };
}

async function loadClientNameMap(clientIds: number[]): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (clientIds.length === 0) return map;
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "clients",
    where: { id: { in: clientIds } },
    limit: clientIds.length,
    depth: 0,
    overrideAccess: true,
  });
  for (const doc of result.docs as unknown as Record<string, unknown>[]) {
    const id = relationId(doc.id);
    if (id == null) continue;
    map.set(id, asString(doc.name) ?? `Client ${id}`);
  }
  return map;
}

export async function listOperatorClientOptions(): Promise<OperatorClientOption[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "clients",
    limit: 300,
    depth: 0,
    sort: "name",
    overrideAccess: true,
  });
  return (result.docs as unknown as Record<string, unknown>[])
    .map((doc) => {
      const id = relationId(doc.id);
      if (id == null) return null;
      return {
        id,
        name: asString(doc.name) ?? `Client ${id}`,
      };
    })
    .filter((row): row is OperatorClientOption => row != null);
}

export async function listOperatorContactOptionsForClient(
  clientId: number,
): Promise<OperatorContactOption[]> {
  if (!Number.isFinite(clientId) || clientId <= 0) {
    throw new EventValidationError("Invalid client context.");
  }
  await assertClientExists(clientId);

  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: CONTACTS_COLLECTION as any,
    where: { client: { equals: clientId } },
    limit: 200,
    depth: 0,
    sort: "name",
    overrideAccess: true,
  });

  return (result.docs as unknown as Record<string, unknown>[]).map((doc) => {
    const id = relationId(doc.id) ?? 0;
    return {
      id,
      name: asString(doc.name) ?? `Contact ${id}`,
      status: doc.status === "inactive" ? "inactive" : "active",
      roleTitle: asString(doc.roleTitle),
    };
  });
}

export async function listRelationshipEvents(
  query: ListRelationshipEventsQuery = {},
): Promise<OperatorRelationshipEventRow[]> {
  const payload = await getPayload({ config });
  const limit = Math.min(Math.max(query.limit ?? 100, 1), 200);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const and: any[] = [];
  if (query.clientId && Number.isFinite(query.clientId)) {
    and.push({ client: { equals: query.clientId } });
  }
  if (query.status && query.status !== "all") {
    and.push({ status: { equals: query.status } });
  }
  if (query.category && query.category !== "all") {
    and.push({ eventCategory: { equals: query.category } });
  }
  if (query.q?.trim()) {
    and.push({ title: { contains: query.q.trim() } });
  }

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: and.length > 0 ? { and } : undefined,
    limit,
    depth: 0,
    sort: "-eventAt",
    overrideAccess: true,
  });

  const docs = result.docs as unknown as Record<string, unknown>[];
  const clientIds = [
    ...new Set(
      docs
        .map((d) => relationId(d.client))
        .filter((id): id is number => id != null),
    ),
  ];
  const clientNames = await loadClientNameMap(clientIds);
  const rows = await Promise.all(docs.map((doc) => mapEventRow(doc, clientNames)));

  const now = Date.now();
  const timeframe = query.timeframe ?? "all";

  let filtered = rows;
  if (timeframe === "upcoming") {
    filtered = rows.filter(
      (row) =>
        row.status === "planned" &&
        row.eventAt &&
        new Date(row.eventAt).getTime() >= now,
    );
    filtered.sort(
      (a, b) => new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime(),
    );
  } else if (timeframe === "recent") {
    filtered = rows.filter(
      (row) =>
        !(
          row.status === "planned" &&
          row.eventAt &&
          new Date(row.eventAt).getTime() >= now
        ),
    );
    filtered.sort(
      (a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime(),
    );
  } else {
    // Operational default: upcoming planned soonest, then everything else newest-first.
    const upcoming = rows
      .filter(
        (row) =>
          row.status === "planned" &&
          row.eventAt &&
          new Date(row.eventAt).getTime() >= now,
      )
      .sort(
        (a, b) => new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime(),
      );
    const rest = rows
      .filter((row) => !upcoming.some((u) => u.id === row.id))
      .sort(
        (a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime(),
      );
    filtered = [...upcoming, ...rest];
  }

  return filtered;
}

export async function getRelationshipEventById(
  eventId: number,
): Promise<OperatorRelationshipEventRow> {
  if (!Number.isFinite(eventId) || eventId <= 0) {
    throw new EventValidationError("Invalid event id.");
  }

  const payload = await getPayload({ config });
  let doc: Record<string, unknown>;
  try {
    doc = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      id: eventId,
      depth: 0,
      overrideAccess: true,
    })) as unknown as Record<string, unknown>;
  } catch {
    throw new EventOwnershipError("Relationship event not found.");
  }

  const clientId = relationId(doc.client);
  if (clientId == null) {
    throw new EventOwnershipError("Relationship event is missing a client.");
  }
  const clientNames = await loadClientNameMap([clientId]);
  return mapEventRow(doc, clientNames);
}

export async function createRelationshipEvent(
  trustedClientId: number,
  input: RelationshipEventWriteInput,
): Promise<{ id: number }> {
  if (!Number.isFinite(trustedClientId) || trustedClientId <= 0) {
    throw new EventValidationError("Invalid client context.");
  }

  await assertClientExists(trustedClientId);
  const contactIds = await assertContactsBelongToClient(
    trustedClientId,
    input.contactIds,
  );

  const payload = await getPayload({ config });
  const doc = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    data: {
      client: trustedClientId,
      title: validateTitle(input.title),
      eventAt: validateEventAt(input.eventAt),
      eventCategory: parseOptionalCategory(input.eventCategory) ?? "meeting",
      status: parseOptionalStatus(input.status) ?? "planned",
      location: normalizeOptional(input.location) ?? null,
      contextNotes: normalizeOptional(input.contextNotes) ?? null,
      followUpNotes: normalizeOptional(input.followUpNotes) ?? null,
      dietaryNotes: normalizeOptional(input.dietaryNotes) ?? null,
      accessibilityNotes: normalizeOptional(input.accessibilityNotes) ?? null,
      contacts: contactIds,
      internalOnly: true,
    },
    overrideAccess: true,
  });

  return { id: Number(doc.id) };
}

/**
 * Update an event. Owning client is immutable — browser-supplied clientId is ignored.
 */
export async function updateRelationshipEvent(
  eventId: number,
  input: Partial<RelationshipEventWriteInput> & {
    /** Optional expected client for ownership confirmation; must match record. */
    expectedClientId?: number;
  },
): Promise<{ id: number }> {
  if (!Number.isFinite(eventId) || eventId <= 0) {
    throw new EventValidationError("Invalid event id.");
  }

  const payload = await getPayload({ config });
  let existing: Record<string, unknown>;
  try {
    existing = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      id: eventId,
      depth: 0,
      overrideAccess: true,
    })) as unknown as Record<string, unknown>;
  } catch {
    throw new EventOwnershipError("Relationship event not found.");
  }

  const ownerClientId = relationId(existing.client);
  if (ownerClientId == null) {
    throw new EventOwnershipError("Relationship event is missing a client.");
  }

  if (
    input.expectedClientId != null &&
    Number.isFinite(input.expectedClientId) &&
    input.expectedClientId !== ownerClientId
  ) {
    throw new EventOwnershipError("Event does not belong to the selected client.");
  }

  const data: Record<string, unknown> = {
    internalOnly: true,
  };

  if (input.title !== undefined) data.title = validateTitle(input.title);
  if (input.eventAt !== undefined) data.eventAt = validateEventAt(input.eventAt);
  if (input.eventCategory !== undefined) {
    data.eventCategory = parseCategory(input.eventCategory);
  }
  if (input.status !== undefined) data.status = parseStatus(input.status);
  if (input.location !== undefined) {
    data.location = normalizeOptional(input.location) ?? null;
  }
  if (input.contextNotes !== undefined) {
    data.contextNotes = normalizeOptional(input.contextNotes) ?? null;
  }
  if (input.followUpNotes !== undefined) {
    data.followUpNotes = normalizeOptional(input.followUpNotes) ?? null;
  }
  if (input.dietaryNotes !== undefined) {
    data.dietaryNotes = normalizeOptional(input.dietaryNotes) ?? null;
  }
  if (input.accessibilityNotes !== undefined) {
    data.accessibilityNotes = normalizeOptional(input.accessibilityNotes) ?? null;
  }
  if (input.contactIds !== undefined) {
    data.contacts = await assertContactsBelongToClient(
      ownerClientId,
      input.contactIds,
    );
  }

  // Never reassign client from browser input.
  delete data.client;

  const doc = await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    id: eventId,
    data,
    overrideAccess: true,
  });

  return { id: Number(doc.id) };
}
