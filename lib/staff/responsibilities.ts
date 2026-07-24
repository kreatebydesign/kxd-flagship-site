/**
 * Recurring staff responsibilities — templates that materialize Work Engine items.
 * Not a second task system. No default assignment without Matt/local fixture.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { createWork } from "@/lib/work/runner";
import { toLocalDateKey } from "@/lib/work/planning/dates";
import type {
  StaffResponsibilityCadence,
  StaffResponsibilityTemplate,
} from "./types";
import {
  responsibilityDueOn,
  responsibilitySourceId,
  STAFF_RESPONSIBILITY_SOURCE_PREFIX,
} from "./responsibility-rules";

export const STAFF_RESPONSIBILITY_COLLECTION = "staff-responsibilities" as const;
export {
  responsibilityDueOn,
  responsibilitySourceId,
  STAFF_RESPONSIBILITY_SOURCE_PREFIX,
};

/** Library keys Matt can choose — never auto-assigned. */
export const STAFF_RESPONSIBILITY_LIBRARY = [
  {
    key: "review-client-submissions",
    title: "Review new client submissions",
    purpose: "Triage new client submissions and prepare next steps for Matt when needed.",
    expectedOutcome: "Each new submission reviewed or queued with a clear note.",
    estimatedMinutes: 25,
  },
  {
    key: "website-review-inbox",
    title: "Check Website Review Inbox",
    purpose: "Review Website Review items that require staff triage.",
    expectedOutcome: "Inbox triaged; sensitive outcomes prepared for Matt.",
    estimatedMinutes: 20,
  },
  {
    key: "prepare-follow-ups",
    title: "Prepare approved follow-ups",
    purpose: "Draft follow-ups Matt has already approved in principle.",
    expectedOutcome: "Drafts ready for Matt's final review — not sent.",
    estimatedMinutes: 30,
  },
  {
    key: "verify-invoice-status",
    title: "Verify invoice status",
    purpose: "Check invoice status and prepare a verification summary for Matt.",
    expectedOutcome: "Facts-only verification note — no charges or refunds.",
    estimatedMinutes: 15,
  },
  {
    key: "review-onboarding-progress",
    title: "Review onboarding progress",
    purpose: "Check assigned onboarding steps and surface blockers.",
    expectedOutcome: "Clear progress note and any blockers for Matt.",
    estimatedMinutes: 20,
  },
  {
    key: "check-scheduling-requests",
    title: "Check scheduling requests",
    purpose: "Review scheduling proposals assigned for staff preparation.",
    expectedOutcome: "Options prepared; no external calendar writes alone.",
    estimatedMinutes: 15,
  },
  {
    key: "update-internal-records",
    title: "Update internal records",
    purpose: "Keep assigned internal records accurate from known facts.",
    expectedOutcome: "Records updated without inventing client facts.",
    estimatedMinutes: 20,
  },
  {
    key: "end-of-day-summary",
    title: "End-of-day operational summary",
    purpose: "Capture what moved today for Matt's awareness.",
    expectedOutcome: "Short internal summary — no silent date changes.",
    estimatedMinutes: 10,
  },
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "id" in value) {
    return Number((value as AnyDoc).id) || null;
  }
  return null;
}

function readWeekdayMask(doc: AnyDoc): number[] {
  if (!Array.isArray(doc.weekdayMask)) return [];
  return doc.weekdayMask
    .map((row: unknown) => {
      if (typeof row === "number") return row;
      if (row && typeof row === "object" && "day" in row) {
        return Number((row as AnyDoc).day);
      }
      return NaN;
    })
    .filter((n: number) => Number.isFinite(n) && n >= 0 && n <= 6);
}

export function toResponsibilityTemplate(doc: AnyDoc): StaffResponsibilityTemplate {
  return {
    id: Number(doc.id),
    title: String(doc.title ?? "Responsibility"),
    purpose: String(doc.purpose ?? ""),
    expectedOutcome: String(doc.expectedOutcome ?? ""),
    estimatedMinutes:
      typeof doc.estimatedMinutes === "number" && doc.estimatedMinutes > 0
        ? doc.estimatedMinutes
        : null,
    ownerUserId: relId(doc.owner),
    cadence: (doc.cadence as StaffResponsibilityCadence) || "daily",
    weekdayMask: readWeekdayMask(doc),
    scope: doc.scope === "client" ? "client" : "internal",
    clientId: relId(doc.client),
    requiresApproval: Boolean(doc.requiresApproval),
    active: doc.active !== false,
    libraryKey: doc.libraryKey ? String(doc.libraryKey) : null,
  };
}

async function findWorkBySourceId(sourceId: string): Promise<AnyDoc | null> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "work" as any,
    where: { sourceId: { equals: sourceId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return (result.docs[0] as AnyDoc | undefined) ?? null;
}

export async function listStaffResponsibilities(options?: {
  ownerUserId?: number;
  activeOnly?: boolean;
}): Promise<StaffResponsibilityTemplate[]> {
  const payload = await getPayload({ config });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (options?.ownerUserId != null) {
    where.owner = { equals: options.ownerUserId };
  }
  if (options?.activeOnly) {
    where.active = { equals: true };
  }

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: STAFF_RESPONSIBILITY_COLLECTION as any,
    where: Object.keys(where).length ? where : undefined,
    limit: 100,
    depth: 0,
    overrideAccess: true,
    sort: "title",
  });

  return result.docs.map((doc) => toResponsibilityTemplate(doc as AnyDoc));
}

/**
 * Materialize today's Work Engine instances for an owner's active responsibilities.
 * Idempotent — never duplicates the same sourceId.
 */
export async function materializeResponsibilitiesForUser(
  ownerUserId: number,
  day: Date = new Date(),
): Promise<{ created: number; skipped: number }> {
  const dateKey = toLocalDateKey(day);
  const templates = await listStaffResponsibilities({
    ownerUserId,
    activeOnly: true,
  });

  let created = 0;
  let skipped = 0;

  for (const template of templates) {
    if (!responsibilityDueOn(template, day)) {
      skipped += 1;
      continue;
    }

    const sourceId = responsibilitySourceId(template.id, dateKey);
    const existing = await findWorkBySourceId(sourceId);
    if (existing) {
      skipped += 1;
      continue;
    }

    const tags = ["staff-responsibility"];
    if (template.requiresApproval) tags.push("requires-approval");
    if (template.libraryKey) tags.push(`resp:${template.libraryKey}`);

    await createWork({
      clientId: template.clientId,
      title: template.title,
      summary: template.purpose,
      description: template.expectedOutcome,
      source: "manual",
      sourceId,
      category: "operations",
      status: "planned",
      priority: "normal",
      assignedToId: ownerUserId,
      estimatedEffort:
        template.estimatedMinutes != null
          ? Math.round((template.estimatedMinutes / 60) * 100) / 100
          : undefined,
      plannedForDate: dateKey,
      dueDate: dateKey,
      tags,
      createdBy: "staff-responsibility",
      internalProject: "Staff responsibility",
    });
    created += 1;
  }

  return { created, skipped };
}

export async function upsertStaffResponsibility(input: {
  id?: number;
  title: string;
  purpose: string;
  expectedOutcome: string;
  estimatedMinutes?: number | null;
  ownerUserId: number | null;
  cadence: StaffResponsibilityCadence;
  weekdayMask?: number[];
  scope?: "internal" | "client";
  clientId?: number | null;
  requiresApproval?: boolean;
  active?: boolean;
  libraryKey?: string | null;
}): Promise<StaffResponsibilityTemplate> {
  const payload = await getPayload({ config });
  const data = {
    title: input.title.trim(),
    purpose: input.purpose.trim(),
    expectedOutcome: input.expectedOutcome.trim(),
    estimatedMinutes: input.estimatedMinutes ?? undefined,
    owner: input.ownerUserId ?? undefined,
    cadence: input.cadence,
    weekdayMask: (input.weekdayMask ?? []).map((day) => ({ day })),
    scope: input.scope ?? "internal",
    client: input.clientId ?? undefined,
    requiresApproval: input.requiresApproval ?? false,
    active: input.active ?? true,
    libraryKey: input.libraryKey ?? undefined,
  };

  if (input.id) {
    const doc = await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: STAFF_RESPONSIBILITY_COLLECTION as any,
      id: input.id,
      data,
      depth: 0,
      overrideAccess: true,
    });
    return toResponsibilityTemplate(doc as AnyDoc);
  }

  const doc = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: STAFF_RESPONSIBILITY_COLLECTION as any,
    data,
    depth: 0,
    overrideAccess: true,
  });
  return toResponsibilityTemplate(doc as AnyDoc);
}
