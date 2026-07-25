/**
 * Staff help requests — Ask KXD Intelligence / request a decision.
 * Reuses Shared Core + oversight surface. Not a messaging platform.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { getWorkItem } from "@/lib/work/services";
import { isRestrictedStaff } from "./permissions";
import type { StaffActor } from "./types";

export const STAFF_HELP_COLLECTION = "staff-help-requests" as const;
export const HELP_DEDUPE_WINDOW_MS = 120_000;

export type StaffHelpStatus = "open" | "answered" | "resolved";
export type StaffHelpResponseSource =
  | "none"
  | "deterministic"
  | "ai-assisted"
  | "matt";
export type StaffHelpConfidence = "high" | "medium" | "low";

export interface StaffHelpRequestRecord {
  id: number;
  staffUserId: number;
  staffLabel: string;
  workId: number | null;
  workTitle: string | null;
  clientId: number | null;
  clientLabel: string | null;
  question: string;
  pagePath: string;
  status: StaffHelpStatus;
  intelligenceResponse: string | null;
  responseSource: StaffHelpResponseSource;
  confidence: StaffHelpConfidence | null;
  requiresMatt: boolean;
  intelligenceRespondedAt: string | null;
  mattResponse: string | null;
  mattRespondedAt: string | null;
  answeredAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  href: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "id" in value) {
    return Number((value as AnyDoc).id) || null;
  }
  return null;
}

function relLabel(value: unknown, fallback: string): string {
  if (value && typeof value === "object") {
    const doc = value as AnyDoc;
    if (typeof doc.displayName === "string" && doc.displayName.trim()) {
      return doc.displayName.trim();
    }
    if (typeof doc.email === "string" && doc.email.trim()) return doc.email.trim();
    if (typeof doc.name === "string" && doc.name.trim()) return doc.name.trim();
    if (typeof doc.title === "string" && doc.title.trim()) return doc.title.trim();
  }
  return fallback;
}

export function toHelpRequestRecord(doc: AnyDoc): StaffHelpRequestRecord {
  const staffUserId = relId(doc.staffUser) ?? 0;
  const workId = relId(doc.work);
  const clientId = relId(doc.client);
  return {
    id: Number(doc.id),
    staffUserId,
    staffLabel: relLabel(doc.staffUser, `User ${staffUserId}`),
    workId,
    workTitle: workId
      ? relLabel(doc.work, `Work #${workId}`)
      : null,
    clientId,
    clientLabel: clientId ? relLabel(doc.client, `Client #${clientId}`) : null,
    question: String(doc.question ?? "").trim(),
    pagePath: String(doc.pagePath ?? "").trim(),
    status: (doc.status as StaffHelpStatus) || "open",
    intelligenceResponse: doc.intelligenceResponse
      ? String(doc.intelligenceResponse).trim()
      : null,
    responseSource: (doc.responseSource as StaffHelpResponseSource) || "none",
    confidence: (doc.confidence as StaffHelpConfidence) || null,
    requiresMatt: Boolean(doc.requiresMatt),
    intelligenceRespondedAt: doc.intelligenceRespondedAt
      ? String(doc.intelligenceRespondedAt)
      : null,
    mattResponse: doc.mattResponse ? String(doc.mattResponse).trim() : null,
    mattRespondedAt: doc.mattRespondedAt ? String(doc.mattRespondedAt) : null,
    answeredAt: doc.answeredAt ? String(doc.answeredAt) : null,
    resolvedAt: doc.resolvedAt ? String(doc.resolvedAt) : null,
    createdAt: String(doc.createdAt ?? new Date().toISOString()),
    updatedAt: String(doc.updatedAt ?? doc.createdAt ?? new Date().toISOString()),
    href: workId
      ? `/admin/operations/staff/work/${workId}`
      : "/admin/operations/staff",
  };
}

function normalizeQuestion(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function findRecentDuplicateHelp(input: {
  staffUserId: number;
  workId: number | null;
  pagePath: string;
  question: string;
  windowMs?: number;
}): Promise<StaffHelpRequestRecord | null> {
  const payload = await getPayload({ config });
  const since = new Date(
    Date.now() - (input.windowMs ?? HELP_DEDUPE_WINDOW_MS),
  ).toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const and: any[] = [
    { staffUser: { equals: input.staffUserId } },
    { createdAt: { greater_than_equal: since } },
    { status: { in: ["open", "answered"] } },
  ];
  if (input.workId != null) {
    and.push({ work: { equals: input.workId } });
  } else {
    and.push({ pagePath: { equals: input.pagePath } });
  }

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: STAFF_HELP_COLLECTION as any,
    where: { and },
    limit: 10,
    depth: 1,
    overrideAccess: true,
    sort: "-createdAt",
  });

  const needle = normalizeQuestion(input.question);
  for (const raw of result.docs) {
    const record = toHelpRequestRecord(raw as AnyDoc);
    // Exact question only — different questions on the same page must not collide.
    if (normalizeQuestion(record.question) === needle) return record;
  }
  return null;
}

export async function createStaffHelpRequest(input: {
  actor: StaffActor;
  question: string;
  pagePath: string;
  workId?: number | null;
}): Promise<
  | { ok: true; request: StaffHelpRequestRecord; duplicate: false }
  | { ok: true; request: StaffHelpRequestRecord; duplicate: true }
  | { ok: false; error: string; status: number }
> {
  const question = input.question.trim();
  const pagePath = input.pagePath.trim() || "/admin/operations/staff";
  if (question.length < 8) {
    return {
      ok: false,
      error: "Please write a short question or blocker (at least a sentence).",
      status: 400,
    };
  }
  if (question.length > 2000) {
    return { ok: false, error: "Question is too long.", status: 400 };
  }

  const workId = input.workId ?? null;
  let clientId: number | null = null;
  let work = null as Awaited<ReturnType<typeof getWorkItem>>;

  if (workId != null) {
    work = await getWorkItem(workId);
    if (!work) {
      return { ok: false, error: "Related work item not found.", status: 404 };
    }
    if (isRestrictedStaff(input.actor) && work.assignedToId !== input.actor.userId) {
      return {
        ok: false,
        error: "You may only request help on work assigned to you.",
        status: 403,
      };
    }
    clientId = work.clientId;
  }

  const duplicate = await findRecentDuplicateHelp({
    staffUserId: input.actor.userId,
    workId,
    pagePath,
    question,
  });
  if (duplicate) {
    return { ok: true, request: duplicate, duplicate: true };
  }

  const { answerStaffHelpQuestion } = await import("./help-intelligence");
  const intelligence = await answerStaffHelpQuestion({
    question,
    pagePath,
    work,
    actor: input.actor,
  });

  const now = new Date().toISOString();
  // Safe full answer → answered. Escalation stays open for Matt.
  const status: StaffHelpStatus = intelligence.requiresMatt ? "open" : "answered";

  const payload = await getPayload({ config });
  const doc = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: STAFF_HELP_COLLECTION as any,
    data: {
      staffUser: input.actor.userId,
      work: workId ?? undefined,
      client: clientId ?? undefined,
      question,
      pagePath,
      status,
      intelligenceResponse: intelligence.intelligenceResponse,
      responseSource: intelligence.responseSource,
      confidence: intelligence.confidence,
      requiresMatt: intelligence.requiresMatt,
      intelligenceRespondedAt: now,
      answeredAt: intelligence.requiresMatt ? undefined : now,
    },
    depth: 1,
    overrideAccess: true,
  });

  return {
    ok: true,
    request: toHelpRequestRecord(doc as AnyDoc),
    duplicate: false,
  };
}

export async function listOpenHelpRequestsForOversight(): Promise<
  StaffHelpRequestRecord[]
> {
  const payload = await getPayload({ config });
  // Awaiting approval: open, or requiresMatt without approver response yet.
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: STAFF_HELP_COLLECTION as any,
    where: {
      and: [
        { status: { not_equals: "resolved" } },
        {
          or: [
            { status: { equals: "open" } },
            { requiresMatt: { equals: true } },
          ],
        },
      ],
    },
    limit: 50,
    depth: 1,
    overrideAccess: true,
    sort: "-createdAt",
  });
  return result.docs
    .map((doc) => toHelpRequestRecord(doc as AnyDoc))
    .filter((row) => row.status === "open" || (row.requiresMatt && !row.mattResponse));
}

export async function listHelpRequestsForStaff(
  staffUserId: number,
  options?: { workId?: number | null; includeResolved?: boolean },
): Promise<StaffHelpRequestRecord[]> {
  const payload = await getPayload({ config });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const and: any[] = [{ staffUser: { equals: staffUserId } }];
  if (!options?.includeResolved) {
    and.push({ status: { in: ["open", "answered"] } });
  }
  if (options?.workId != null) {
    and.push({ work: { equals: options.workId } });
  }

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: STAFF_HELP_COLLECTION as any,
    where: { and },
    limit: 20,
    depth: 1,
    overrideAccess: true,
    sort: "-createdAt",
  });
  return result.docs.map((doc) => toHelpRequestRecord(doc as AnyDoc));
}

export async function respondToHelpRequest(input: {
  helpId: number;
  response: string;
  resolve?: boolean;
}): Promise<
  | { ok: true; request: StaffHelpRequestRecord }
  | { ok: false; error: string; status: number }
> {
  const response = input.response.trim();
  if (response.length < 2) {
    return { ok: false, error: "A short response is required.", status: 400 };
  }

  const payload = await getPayload({ config });
  let existing: AnyDoc | null = null;
  try {
    existing = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: STAFF_HELP_COLLECTION as any,
      id: input.helpId,
      depth: 1,
      overrideAccess: true,
    })) as AnyDoc;
  } catch {
    existing = null;
  }
  if (!existing) {
    return { ok: false, error: "Help request not found.", status: 404 };
  }

  const now = new Date().toISOString();
  const status: StaffHelpStatus = input.resolve ? "resolved" : "answered";
  const doc = await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: STAFF_HELP_COLLECTION as any,
    id: input.helpId,
    data: {
      mattResponse: response,
      mattRespondedAt: now,
      // Preserve intelligenceResponse — never overwrite with Matt's text.
      status,
      answeredAt: existing.answeredAt ?? now,
      resolvedAt: input.resolve ? now : existing.resolvedAt ?? undefined,
      requiresMatt: input.resolve ? false : existing.requiresMatt,
    },
    depth: 1,
    overrideAccess: true,
  });

  return { ok: true, request: toHelpRequestRecord(doc as AnyDoc) };
}

export async function countOpenHelpForStaff(staffUserId: number): Promise<number> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: STAFF_HELP_COLLECTION as any,
    where: {
      and: [
        { staffUser: { equals: staffUserId } },
        { status: { equals: "open" } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return result.totalDocs;
}
