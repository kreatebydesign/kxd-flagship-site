/**
 * Junior Creator Assigned Tasks — types and server helpers.
 * Separate from Academy missions. Always scope by authenticated junior id.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  isJuniorTasksSchemaUnavailableError,
  rethrowIfJuniorTasksSchemaUnavailable,
  withJuniorTasksSchemaRead,
} from "./tasks-schema";

export {
  JUNIOR_TASKS_SCHEMA_UNAVAILABLE_MESSAGE,
  JuniorTasksSchemaUnavailableError,
  isJuniorTasksSchemaUnavailableError,
} from "./tasks-schema";

export const JUNIOR_TASK_STATUS_VALUES = [
  "assigned",
  "in_progress",
  "ready_for_review",
  "completed",
  "blocked",
  "cancelled",
] as const;

export type JuniorTaskStatus = (typeof JUNIOR_TASK_STATUS_VALUES)[number];

export const JUNIOR_TASK_PRIORITY_VALUES = ["high", "medium", "low"] as const;
export type JuniorTaskPriority = (typeof JUNIOR_TASK_PRIORITY_VALUES)[number];

/** Statuses a Junior Creator may set on their own task. */
export const JUNIOR_ALLOWED_STATUS_UPDATES: readonly JuniorTaskStatus[] = [
  "in_progress",
  "ready_for_review",
  "blocked",
] as const;

export const JUNIOR_TASK_STATUS_LABEL: Record<JuniorTaskStatus, string> = {
  assigned: "Assigned",
  in_progress: "In Progress",
  ready_for_review: "Ready for Review",
  completed: "Completed",
  blocked: "Blocked",
  cancelled: "Cancelled",
};

export const JUNIOR_TASK_PRIORITY_LABEL: Record<JuniorTaskPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export type JuniorAssignedTask = {
  id: number;
  title: string;
  instructions: string;
  clientLabel: string;
  juniorCreatorUserId: number;
  priority: JuniorTaskPriority;
  estimatedMinutes: number;
  dueAt: string | null;
  status: JuniorTaskStatus;
  completionNotes: string | null;
  relatedLink: string | null;
  seedKey: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export function mapJuniorTask(doc: AnyDoc): JuniorAssignedTask {
  const juniorId =
    typeof doc.juniorCreatorUser === "object" && doc.juniorCreatorUser
      ? Number(doc.juniorCreatorUser.id)
      : Number(doc.juniorCreatorUser);

  return {
    id: Number(doc.id),
    title: String(doc.title ?? ""),
    instructions: String(doc.instructions ?? ""),
    clientLabel: String(doc.clientLabel ?? ""),
    juniorCreatorUserId: juniorId,
    priority: (JUNIOR_TASK_PRIORITY_VALUES.includes(doc.priority)
      ? doc.priority
      : "medium") as JuniorTaskPriority,
    estimatedMinutes: Number(doc.estimatedMinutes ?? 0),
    dueAt: doc.dueAt ? String(doc.dueAt) : null,
    status: (JUNIOR_TASK_STATUS_VALUES.includes(doc.status)
      ? doc.status
      : "assigned") as JuniorTaskStatus,
    completionNotes: doc.completionNotes ? String(doc.completionNotes) : null,
    relatedLink: doc.relatedLink ? String(doc.relatedLink) : null,
    seedKey: doc.seedKey ? String(doc.seedKey) : null,
    archived: Boolean(doc.archived),
    createdAt: String(doc.createdAt ?? ""),
    updatedAt: String(doc.updatedAt ?? ""),
  };
}

export function isJuniorTaskStatus(value: string): value is JuniorTaskStatus {
  return (JUNIOR_TASK_STATUS_VALUES as readonly string[]).includes(value);
}

export function isJuniorTaskPriority(value: string): value is JuniorTaskPriority {
  return (JUNIOR_TASK_PRIORITY_VALUES as readonly string[]).includes(value);
}

export async function listTasksForJunior(
  juniorCreatorUserId: number,
): Promise<JuniorAssignedTask[]> {
  return withJuniorTasksSchemaRead(async () => {
    const payload = await getPayload({ config });
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "junior-creator-tasks" as any,
      where: {
        and: [
          { juniorCreatorUser: { equals: juniorCreatorUserId } },
          { archived: { not_equals: true } },
          { status: { not_equals: "cancelled" } },
        ],
      },
      limit: 100,
      depth: 0,
      sort: "priority",
      overrideAccess: true,
    });

    const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const statusRank: Record<string, number> = {
      in_progress: 0,
      assigned: 1,
      blocked: 2,
      ready_for_review: 3,
      completed: 4,
      cancelled: 5,
    };

    return (result.docs as AnyDoc[])
      .map(mapJuniorTask)
      .sort((a, b) => {
        const pr =
          (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9);
        if (pr !== 0) return pr;
        const sr =
          (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9);
        if (sr !== 0) return sr;
        return a.title.localeCompare(b.title);
      });
  }, []);
}

export async function getTaskForJunior(
  taskId: number,
  juniorCreatorUserId: number,
): Promise<JuniorAssignedTask | null> {
  return withJuniorTasksSchemaRead(async () => {
    const payload = await getPayload({ config });
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = (await payload.findByID({
        collection: "junior-creator-tasks" as any,
        id: taskId,
        depth: 0,
        overrideAccess: true,
      })) as AnyDoc;
      const mapped = mapJuniorTask(doc);
      if (mapped.juniorCreatorUserId !== juniorCreatorUserId) return null;
      if (mapped.archived || mapped.status === "cancelled") return null;
      return mapped;
    } catch (err) {
      if (isJuniorTasksSchemaUnavailableError(err)) throw err;
      return null;
    }
  }, null);
}

/**
 * Junior-safe update: status (allowlist) + completion notes only.
 * Always verifies ownership server-side.
 */
export async function updateTaskAsJunior(input: {
  taskId: number;
  juniorCreatorUserId: number;
  status?: JuniorTaskStatus;
  completionNotes?: string;
}): Promise<JuniorAssignedTask> {
  try {
    const existing = await getTaskForJunior(
      input.taskId,
      input.juniorCreatorUserId,
    );
    if (!existing) {
      throw new Error("JUNIOR_TASK_FORBIDDEN");
    }

    if (existing.status === "completed") {
      throw new Error("JUNIOR_TASK_LOCKED");
    }

    const data: Record<string, unknown> = {};

    if (input.status !== undefined) {
      if (!JUNIOR_ALLOWED_STATUS_UPDATES.includes(input.status)) {
        throw new Error("JUNIOR_TASK_STATUS_FORBIDDEN");
      }
      data.status = input.status;
    }

    if (input.completionNotes !== undefined) {
      data.completionNotes = input.completionNotes.trim() || null;
    }

    if (Object.keys(data).length === 0) {
      return existing;
    }

    const payload = await getPayload({ config });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = (await payload.update({
      collection: "junior-creator-tasks" as any,
      id: input.taskId,
      data: data as any,
      overrideAccess: true,
    })) as AnyDoc;

    return mapJuniorTask(updated);
  } catch (err) {
    rethrowIfJuniorTasksSchemaUnavailable(err);
  }
}

export type AdminTaskCreateInput = {
  title: string;
  instructions: string;
  clientLabel: string;
  juniorCreatorUserId: number;
  priority: JuniorTaskPriority;
  estimatedMinutes: number;
  dueAt?: string | null;
  relatedLink?: string | null;
  seedKey?: string | null;
  status?: JuniorTaskStatus;
};

export async function createJuniorTask(
  input: AdminTaskCreateInput,
): Promise<JuniorAssignedTask> {
  try {
    const payload = await getPayload({ config });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const created = (await payload.create({
      collection: "junior-creator-tasks" as any,
      data: {
        title: input.title.trim(),
        instructions: input.instructions.trim(),
        clientLabel: input.clientLabel.trim(),
        juniorCreatorUser: input.juniorCreatorUserId,
        priority: input.priority,
        estimatedMinutes: Math.round(input.estimatedMinutes),
        dueAt: input.dueAt || null,
        relatedLink: input.relatedLink?.trim() || null,
        seedKey: input.seedKey?.trim() || null,
        status: input.status ?? "assigned",
        archived: false,
      } as any,
      overrideAccess: true,
    })) as AnyDoc;
    return mapJuniorTask(created);
  } catch (err) {
    rethrowIfJuniorTasksSchemaUnavailable(err);
  }
}

export async function findTaskBySeedKey(
  seedKey: string,
): Promise<JuniorAssignedTask | null> {
  return withJuniorTasksSchemaRead(async () => {
    const payload = await getPayload({ config });
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "junior-creator-tasks" as any,
      where: { seedKey: { equals: seedKey } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const doc = result.docs[0] as AnyDoc | undefined;
    return doc ? mapJuniorTask(doc) : null;
  }, null);
}

export async function listAllJuniorTasks(options?: {
  juniorCreatorUserId?: number;
  includeArchived?: boolean;
}): Promise<JuniorAssignedTask[]> {
  return withJuniorTasksSchemaRead(async () => {
    const payload = await getPayload({ config });
    const clauses: Record<string, unknown>[] = [];
    if (options?.juniorCreatorUserId) {
      clauses.push({
        juniorCreatorUser: { equals: options.juniorCreatorUserId },
      });
    }
    if (!options?.includeArchived) {
      clauses.push({ archived: { not_equals: true } });
    }

    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "junior-creator-tasks" as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: (clauses.length > 0 ? { and: clauses } : undefined) as any,
      limit: 200,
      depth: 0,
      sort: "-updatedAt",
      overrideAccess: true,
    });

    return (result.docs as AnyDoc[]).map(mapJuniorTask);
  }, []);
}

export async function updateJuniorTaskAsAdmin(
  taskId: number,
  data: Record<string, unknown>,
): Promise<JuniorAssignedTask> {
  try {
    const payload = await getPayload({ config });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = (await payload.update({
      collection: "junior-creator-tasks" as any,
      id: taskId,
      data: data as any,
      overrideAccess: true,
    })) as AnyDoc;
    return mapJuniorTask(updated);
  } catch (err) {
    rethrowIfJuniorTasksSchemaUnavailable(err);
  }
}

export type JuniorCreatorIdentity = {
  id: number;
  displayName: string;
  email: string;
};

function mapJuniorIdentity(doc: AnyDoc): JuniorCreatorIdentity {
  return {
    id: Number(doc.id),
    displayName: String(doc.displayName ?? ""),
    email: String(doc.email ?? ""),
  };
}

/** Exact record by primary key — preferred when the authenticated id is known. */
export async function findJuniorCreatorById(
  id: number,
): Promise<JuniorCreatorIdentity | null> {
  if (!Number.isFinite(id) || id <= 0) return null;
  const payload = await getPayload({ config });
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = (await payload.findByID({
      collection: "junior-creator-users" as any,
      id,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
    return mapJuniorIdentity(doc);
  } catch {
    return null;
  }
}

/** Exact email match (auth login identity). Refuses ambiguity. */
export async function findJuniorCreatorByEmail(
  email: string,
): Promise<JuniorCreatorIdentity | null> {
  const needle = email.trim().toLowerCase();
  if (!needle) return null;
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "junior-creator-users" as any,
    where: { email: { equals: needle } },
    limit: 2,
    depth: 0,
    overrideAccess: true,
  });
  if (result.docs.length !== 1) return null;
  return mapJuniorIdentity(result.docs[0] as AnyDoc);
}

export async function findJuniorCreatorByDisplayName(
  displayName: string,
): Promise<JuniorCreatorIdentity | null> {
  const payload = await getPayload({ config });
  const exact = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "junior-creator-users" as any,
    where: { displayName: { equals: displayName } },
    limit: 5,
    depth: 0,
    overrideAccess: true,
  });

  if (exact.docs.length === 1) {
    return mapJuniorIdentity(exact.docs[0] as AnyDoc);
  }

  // Case-insensitive fallback when Payload equals is case-sensitive.
  // Still requires exactly one match — never picks the first of many.
  const all = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "junior-creator-users" as any,
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });
  const needle = displayName.trim().toLowerCase();
  const matches = (all.docs as AnyDoc[]).filter(
    (u) => String(u.displayName ?? "").trim().toLowerCase() === needle,
  );
  if (matches.length !== 1) return null;
  return mapJuniorIdentity(matches[0]);
}
