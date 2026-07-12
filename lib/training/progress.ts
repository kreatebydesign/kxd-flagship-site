import "server-only";

import type { Payload } from "payload";
import { getPayload } from "payload";
import config from "@payload-config";
import {
  TRAINING_LESSONS_COLLECTION,
  TRAINING_PATHS_COLLECTION,
  TRAINING_PROGRESS_COLLECTION,
} from "./constants";
import type { TrainingProgressStatus } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export interface ProgressRecord {
  id: number;
  learnerKey: string;
  pathSlug: string;
  lessonSlug: string;
  status: TrainingProgressStatus;
  percentComplete: number;
  startedAt: string | null;
  lastViewedAt: string | null;
  completedAt: string | null;
  timeSpentSeconds: number;
  checklistCompletedIds: string[];
}

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = Number((value as { id?: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

function readChecklistIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (typeof row === "string") return row;
      if (row && typeof row === "object" && "itemId" in row) {
        return String((row as { itemId?: unknown }).itemId ?? "");
      }
      return "";
    })
    .filter(Boolean);
}

export function mapProgressDoc(doc: AnyDoc, pathSlug: string, lessonSlug: string): ProgressRecord {
  return {
    id: Number(doc.id),
    learnerKey: String(doc.learnerKey ?? ""),
    pathSlug,
    lessonSlug,
    status: (String(doc.status ?? "not-started") as TrainingProgressStatus) || "not-started",
    percentComplete: Number(doc.percentComplete ?? 0) || 0,
    startedAt: doc.startedAt ? String(doc.startedAt) : null,
    lastViewedAt: doc.lastViewedAt ? String(doc.lastViewedAt) : null,
    completedAt: doc.completedAt ? String(doc.completedAt) : null,
    timeSpentSeconds: Number(doc.timeSpentSeconds ?? 0) || 0,
    checklistCompletedIds: readChecklistIds(doc.checklistState),
  };
}

async function resolveLessonRef(
  payload: Payload,
  pathSlug: string,
  lessonSlug: string,
): Promise<{ pathId: number; lessonId: number } | null> {
  const paths = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: TRAINING_PATHS_COLLECTION as any,
    where: { slug: { equals: pathSlug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const pathId = paths.docs[0] ? Number((paths.docs[0] as AnyDoc).id) : null;
  if (pathId == null) return null;

  const lessons = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: TRAINING_LESSONS_COLLECTION as any,
    where: {
      and: [{ slug: { equals: lessonSlug } }, { path: { equals: pathId } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const lessonId = lessons.docs[0] ? Number((lessons.docs[0] as AnyDoc).id) : null;
  if (lessonId == null) return null;
  return { pathId, lessonId };
}

export async function listProgressForLearner(
  learnerKey: string,
  payloadInstance?: Payload,
): Promise<ProgressRecord[]> {
  const payload = payloadInstance ?? (await getPayload({ config }));
  try {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: TRAINING_PROGRESS_COLLECTION as any,
      where: { learnerKey: { equals: learnerKey } },
      limit: 500,
      depth: 1,
      overrideAccess: true,
    });

    const rows: ProgressRecord[] = [];
    for (const doc of result.docs as AnyDoc[]) {
      const lesson = doc.lesson;
      const path = doc.path;
      const lessonSlug =
        lesson && typeof lesson === "object" && lesson.slug
          ? String(lesson.slug)
          : String(doc.lessonSlug ?? "");
      const pathSlug =
        path && typeof path === "object" && path.slug
          ? String(path.slug)
          : String(doc.pathSlug ?? "");
      if (!lessonSlug || !pathSlug) continue;
      rows.push(mapProgressDoc(doc, pathSlug, lessonSlug));
    }
    return rows;
  } catch {
    return [];
  }
}

export async function upsertLessonProgress(input: {
  learnerKey: string;
  pathSlug: string;
  lessonSlug: string;
  status?: TrainingProgressStatus;
  percentComplete?: number;
  checklistCompletedIds?: string[];
  markViewed?: boolean;
  markCompleted?: boolean;
}): Promise<ProgressRecord | null> {
  const payload = await getPayload({ config });
  const refs = await resolveLessonRef(payload, input.pathSlug, input.lessonSlug);
  if (!refs) return null;

  const now = new Date().toISOString();
  const existing = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: TRAINING_PROGRESS_COLLECTION as any,
    where: {
      and: [
        { learnerKey: { equals: input.learnerKey } },
        { lesson: { equals: refs.lessonId } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const current = existing.docs[0] as AnyDoc | undefined;
  let status: TrainingProgressStatus =
    input.status ??
    (input.markCompleted
      ? "completed"
      : ((current?.status as TrainingProgressStatus) ?? "started"));

  if (input.markViewed && status === "not-started") status = "started";
  if (input.markViewed && status === "started") status = "in-progress";
  if (input.markCompleted) status = "completed";

  const percentComplete = input.markCompleted
    ? 100
    : input.percentComplete != null
      ? Math.max(0, Math.min(100, input.percentComplete))
      : Number(current?.percentComplete ?? (status === "started" ? 5 : 0));

  const checklistState = (input.checklistCompletedIds ?? readChecklistIds(current?.checklistState)).map(
    (itemId) => ({ itemId }),
  );

  const data: AnyDoc = {
    learnerKey: input.learnerKey,
    path: refs.pathId,
    lesson: refs.lessonId,
    pathSlug: input.pathSlug,
    lessonSlug: input.lessonSlug,
    status,
    percentComplete,
    checklistState,
    lastViewedAt: input.markViewed || input.markCompleted ? now : current?.lastViewedAt ?? now,
    startedAt: current?.startedAt ?? now,
    completedAt: input.markCompleted ? now : status === "completed" ? current?.completedAt ?? now : null,
    timeSpentSeconds: Number(current?.timeSpentSeconds ?? 0) || 0,
  };

  try {
    const saved = current
      ? await payload.update({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: TRAINING_PROGRESS_COLLECTION as any,
          id: current.id,
          data,
          depth: 0,
          overrideAccess: true,
        })
      : await payload.create({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: TRAINING_PROGRESS_COLLECTION as any,
          data,
          overrideAccess: true,
        });

    return mapProgressDoc(saved as AnyDoc, input.pathSlug, input.lessonSlug);
  } catch {
    return null;
  }
}

export { relId };
