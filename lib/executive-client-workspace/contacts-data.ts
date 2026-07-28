/**
 * Phase 3 Batch B — server-only contact create/update for Client Workspace.
 * Ownership is enforced against the trusted clientId from the operator route context.
 * Does not emit activity/audit events (private fields must not enter broad feeds).
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { ContactStatus } from "./relationship-types";

const COLLECTION = "client-contacts";

export class ContactOwnershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContactOwnershipError";
  }
}

export class ContactValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContactValidationError";
  }
}

export type ClientContactWriteInput = {
  name: string;
  roleTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: ContactStatus;
  preferredCommunication?: string | null;
  relationshipNotes?: string | null;
  preferences?: string | null;
  dietaryNotes?: string | null;
  accessibilityNotes?: string | null;
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

function normalizeOptional(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function validateName(name: unknown): string {
  if (typeof name !== "string" || !name.trim()) {
    throw new ContactValidationError("Name is required.");
  }
  return name.trim();
}

function validateStatus(status: unknown): ContactStatus | undefined {
  if (status == null || status === "") return undefined;
  if (status === "active" || status === "inactive") return status;
  throw new ContactValidationError("Status must be active or inactive.");
}

async function assertClientExists(clientId: number): Promise<void> {
  const payload = await getPayload({ config });
  try {
    await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    });
  } catch {
    throw new ContactValidationError("Client not found.");
  }
}

function buildWriteData(input: ClientContactWriteInput): Record<string, unknown> {
  const data: Record<string, unknown> = {
    name: validateName(input.name),
    internalOnly: true,
  };

  const status = validateStatus(input.status);
  if (status) data.status = status;

  const optionalFields: Array<keyof ClientContactWriteInput> = [
    "roleTitle",
    "email",
    "phone",
    "preferredCommunication",
    "relationshipNotes",
    "preferences",
    "dietaryNotes",
    "accessibilityNotes",
  ];
  for (const key of optionalFields) {
    if (key === "name" || key === "status") continue;
    if (input[key] === undefined) continue;
    data[key] = normalizeOptional(input[key] as string | null | undefined) ?? null;
  }

  return data;
}

/**
 * Create a contact owned by the trusted clientId.
 * Browser-supplied client identifiers in the field payload are ignored.
 */
export async function createClientContactForClient(
  trustedClientId: number,
  input: ClientContactWriteInput,
): Promise<{ id: number }> {
  if (!Number.isFinite(trustedClientId) || trustedClientId <= 0) {
    throw new ContactValidationError("Invalid client context.");
  }

  await assertClientExists(trustedClientId);

  const payload = await getPayload({ config });
  const doc = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    data: {
      ...buildWriteData(input),
      client: trustedClientId,
      status: validateStatus(input.status) ?? "active",
      internalOnly: true,
    },
    overrideAccess: true,
  });

  return { id: Number(doc.id) };
}

/**
 * Update a contact only when it belongs to trustedClientId.
 * Never reassigns the client relationship.
 */
export async function updateClientContactForClient(
  contactId: number,
  trustedClientId: number,
  input: Partial<ClientContactWriteInput>,
): Promise<{ id: number }> {
  if (!Number.isFinite(contactId) || contactId <= 0) {
    throw new ContactValidationError("Invalid contact id.");
  }
  if (!Number.isFinite(trustedClientId) || trustedClientId <= 0) {
    throw new ContactValidationError("Invalid client context.");
  }

  const payload = await getPayload({ config });
  let existing: Record<string, unknown>;
  try {
    existing = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      id: contactId,
      depth: 0,
      overrideAccess: true,
    })) as Record<string, unknown>;
  } catch {
    throw new ContactOwnershipError("Contact not found for this client.");
  }

  const ownerId = relationId(existing.client);
  if (ownerId !== trustedClientId) {
    throw new ContactOwnershipError("Contact does not belong to this client.");
  }

  const data: Record<string, unknown> = {
    internalOnly: true,
  };

  if (input.name !== undefined) {
    data.name = validateName(input.name);
  }
  if (input.status !== undefined) {
    data.status = validateStatus(input.status) ?? existing.status ?? "active";
  }

  const optionalFields: Array<keyof ClientContactWriteInput> = [
    "roleTitle",
    "email",
    "phone",
    "preferredCommunication",
    "relationshipNotes",
    "preferences",
    "dietaryNotes",
    "accessibilityNotes",
  ];
  for (const key of optionalFields) {
    if (input[key] === undefined) continue;
    data[key] = normalizeOptional(input[key] as string | null | undefined) ?? null;
  }

  // Explicitly never accept a client reassignment from the request body.
  delete data.client;

  const doc = await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    id: contactId,
    data,
    overrideAccess: true,
  });

  return { id: Number(doc.id) };
}
