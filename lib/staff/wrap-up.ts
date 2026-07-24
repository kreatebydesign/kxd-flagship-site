/**
 * End-of-day wrap-up — reflects real activity. Never auto-completes work.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { WorkListItem } from "@/lib/work/types";
import { filterCompletedToday, isWorkOverdue } from "@/lib/work/views";
import { toLocalDateKey } from "@/lib/work/planning/dates";
import type { StaffWrapUpData } from "./types";
import { isWaitingOnMatt, todayDateLabel } from "./prioritize";

export const STAFF_DAY_WRAPUP_COLLECTION = "staff-day-wrapups" as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export function buildStaffWrapUp(input: {
  assigned: WorkListItem[];
  trainingCompletedToday?: boolean;
  savedNote?: string | null;
  now?: Date;
}): StaffWrapUpData {
  const now = input.now ?? new Date();
  const dateKey = toLocalDateKey(now);
  const open = input.assigned.filter(
    (w) => w.status !== "completed" && w.status !== "archived",
  );
  const completedToday = filterCompletedToday(input.assigned);
  const preparedForMatt = open.filter((w) => isWaitingOnMatt(w));
  const blockers = open.filter((w) => w.status === "blocked");
  const underway = open.filter(
    (w) =>
      !isWaitingOnMatt(w) &&
      w.status !== "blocked" &&
      (w.status === "in-progress" || w.status === "planned" || w.status === "new"),
  );
  const movingToTomorrow = open.filter(
    (w) =>
      !isWaitingOnMatt(w) &&
      w.status !== "blocked" &&
      (isWorkOverdue(w, now) || w.status === "in-progress"),
  );

  return {
    dateKey,
    dateLabel: todayDateLabel(now),
    completedToday: completedToday.map((w) => ({
      title: w.title,
      workId: w.id,
    })),
    preparedForMatt: preparedForMatt.map((w) => ({
      title: w.title,
      workId: w.id,
      submittedAt: w.updatedAt,
    })),
    underway: underway.map((w) => ({
      title: w.title,
      workId: w.id,
      status: w.status,
    })),
    blockers: blockers.map((w) => ({
      title: w.title,
      workId: w.id,
      detail: w.summary?.trim() || "Blocked — needs clarity before progress.",
    })),
    movingToTomorrow: movingToTomorrow.map((w) => ({
      title: w.title,
      workId: w.id,
      reason: isWorkOverdue(w, now)
        ? "Still open past due — carries forward intentionally."
        : "Still underway — not auto-completed.",
    })),
    trainingCompletedToday: Boolean(input.trainingCompletedToday),
    optionalNoteForMatt: null,
    savedNote: input.savedNote ?? null,
  };
}

export async function loadSavedWrapUpNote(
  staffUserId: number,
  dateKey: string,
): Promise<string | null> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: STAFF_DAY_WRAPUP_COLLECTION as any,
    where: {
      and: [
        { staffUser: { equals: staffUserId } },
        { dateKey: { equals: dateKey } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const doc = result.docs[0] as AnyDoc | undefined;
  if (!doc) return null;
  return doc.noteForMatt ? String(doc.noteForMatt) : null;
}

export async function saveStaffWrapUpNote(input: {
  staffUserId: number;
  dateKey: string;
  noteForMatt: string;
  snapshot?: Record<string, unknown>;
}): Promise<{ id: number }> {
  const payload = await getPayload({ config });
  const existing = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: STAFF_DAY_WRAPUP_COLLECTION as any,
    where: {
      and: [
        { staffUser: { equals: input.staffUserId } },
        { dateKey: { equals: input.dateKey } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const data = {
    staffUser: input.staffUserId,
    dateKey: input.dateKey,
    noteForMatt: input.noteForMatt.trim(),
    snapshotJson: input.snapshot ? JSON.stringify(input.snapshot) : undefined,
  };

  if (existing.docs[0]) {
    const doc = await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: STAFF_DAY_WRAPUP_COLLECTION as any,
      id: existing.docs[0].id,
      data,
      depth: 0,
      overrideAccess: true,
    });
    return { id: Number(doc.id) };
  }

  const doc = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: STAFF_DAY_WRAPUP_COLLECTION as any,
    data,
    depth: 0,
    overrideAccess: true,
  });
  return { id: Number(doc.id) };
}

export async function listRecentWrapUps(limit = 20): Promise<
  Array<{
    id: number;
    staffUserId: number;
    staffLabel: string;
    dateKey: string;
    noteForMatt: string | null;
    createdAt: string;
  }>
> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: STAFF_DAY_WRAPUP_COLLECTION as any,
    limit,
    depth: 1,
    overrideAccess: true,
    sort: "-updatedAt",
  });

  return result.docs.map((raw) => {
    const doc = raw as AnyDoc;
    const staff = doc.staffUser;
    const staffUserId =
      typeof staff === "object" && staff ? Number(staff.id) : Number(staff);
    const staffLabel =
      typeof staff === "object" && staff
        ? String(staff.displayName || staff.email || `User ${staffUserId}`)
        : `User ${staffUserId}`;
    return {
      id: Number(doc.id),
      staffUserId,
      staffLabel,
      dateKey: String(doc.dateKey ?? ""),
      noteForMatt: doc.noteForMatt ? String(doc.noteForMatt) : null,
      createdAt: String(doc.createdAt ?? doc.updatedAt ?? ""),
    };
  });
}
