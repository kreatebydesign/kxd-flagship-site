import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { processOperationalFlow } from "@/lib/operational-flow";
import { TRAINING_CATALOG, getCatalogLesson, getCatalogPath } from "./catalog";
import { EXECUTIVE_OPS_COORDINATOR_TRACK } from "./growth-track";
import {
  buildProgressMap,
  pickContinueLesson,
  pickRecentLessons,
  pickRecommendedLesson,
  toLessonView,
  toPathView,
} from "./map";
import {
  getTrainingPermissions,
  learnerKeyFromUser,
  learnerLabelFromUser,
} from "./permissions";
import { listProgressForLearner, upsertLessonProgress } from "./progress";
import { ensureTrainingSeeded } from "./seed";
import type {
  OperationalPracticeSpec,
  TrainingDashboardData,
  TrainingIntelligencePrompt,
  TrainingLessonContent,
  TrainingLessonDefinition,
  TrainingLessonView,
  TrainingPathDefinition,
  TrainingPathView,
  TrainingWalkthroughStep,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyUser = Record<string, any> | null | undefined;

function emptyOperations(): TrainingLessonContent["operations"] {
  return {
    osAlreadyDoes: [],
    yourResponsibility: [],
    askIntelligenceWhen: [],
    escalateWhen: [],
    successLooksLike: [],
  };
}

/** Curriculum is catalog-led. Payload sync keeps progress refs aligned. */
async function loadCurriculum(): Promise<TrainingPathDefinition[]> {
  try {
    const payload = await getPayload({ config });
    await ensureTrainingSeeded(payload);
  } catch {
    /* catalog still works */
  }
  return TRAINING_CATALOG.filter((path) => path.status !== "archived");
}

export async function getTrainingDashboard(user: AnyUser): Promise<TrainingDashboardData> {
  const permissions = getTrainingPermissions(user);
  const learnerKey = learnerKeyFromUser(user);
  const curriculum = await loadCurriculum();
  const progressRows = await listProgressForLearner(learnerKey);
  const progressMap = buildProgressMap(progressRows);

  const paths = curriculum
    .filter((path) => path.status === "published" || permissions.canManage)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((path) => toPathView(path, progressMap));

  const publishedLessons = paths.flatMap((path) =>
    path.lessons.filter((lesson) => lesson.status === "published"),
  );
  const completedLessons = publishedLessons.filter((l) => l.progress?.status === "completed").length;
  const totalLessons = publishedLessons.length;
  const overallPercent =
    totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

  const continueLesson = pickContinueLesson(paths);
  const recommendedLesson = pickRecommendedLesson(paths);
  const currentPathSlug =
    continueLesson?.pathSlug ?? recommendedLesson?.pathSlug ?? paths[0]?.slug ?? null;

  return {
    learnerKey,
    learnerLabel: learnerLabelFromUser(user),
    canManage: permissions.canManage,
    overallPercent,
    completedLessons,
    totalLessons,
    currentPathSlug,
    paths,
    continueLesson,
    recommendedLesson,
    recentLessons: pickRecentLessons(paths),
    growthTrack: EXECUTIVE_OPS_COORDINATOR_TRACK,
    experienceTitle: "KXD Operations Experience",
    experienceLede:
      "Learn to operate Kreate by Design through KXD OS — judgment beside automation, never instead of it.",
    generatedAt: new Date().toISOString(),
  };
}

export async function getTrainingPath(
  pathSlug: string,
  user: AnyUser,
): Promise<TrainingPathView | null> {
  const path =
    (await loadCurriculum()).find((row) => row.slug === pathSlug) ?? getCatalogPath(pathSlug);
  if (!path) return null;
  const progressMap = buildProgressMap(await listProgressForLearner(learnerKeyFromUser(user)));
  return toPathView(path, progressMap);
}

export async function getTrainingLesson(
  pathSlug: string,
  lessonSlug: string,
  user: AnyUser,
): Promise<TrainingLessonView | null> {
  const path =
    (await loadCurriculum()).find((row) => row.slug === pathSlug) ?? getCatalogPath(pathSlug);
  if (!path) return null;
  const lesson =
    path.lessons.find((row) => row.slug === lessonSlug) ?? getCatalogLesson(pathSlug, lessonSlug);
  if (!lesson) return null;

  const normalized: TrainingLessonDefinition = {
    ...lesson,
    content: {
      ...lesson.content,
      walkthrough: lesson.content.walkthrough ?? [],
      operations: lesson.content.operations ?? emptyOperations(),
      intelligencePrompts: lesson.content.intelligencePrompts ?? [],
      operationalPractice: lesson.content.operationalPractice ?? null,
      steps: lesson.content.steps ?? [],
    },
  };

  const learnerKey = learnerKeyFromUser(user);
  await upsertLessonProgress({
    learnerKey,
    pathSlug,
    lessonSlug,
    markViewed: true,
  });

  const progressMap = buildProgressMap(await listProgressForLearner(learnerKey));
  return toLessonView(path, normalized, progressMap);
}

export async function completeTrainingLesson(input: {
  pathSlug: string;
  lessonSlug: string;
  user: AnyUser;
  checklistCompletedIds?: string[];
}): Promise<TrainingLessonView | null> {
  const permissions = getTrainingPermissions(input.user);
  if (!permissions.canComplete) return null;

  const learnerKey = learnerKeyFromUser(input.user);
  await upsertLessonProgress({
    learnerKey,
    pathSlug: input.pathSlug,
    lessonSlug: input.lessonSlug,
    markCompleted: true,
    checklistCompletedIds: input.checklistCompletedIds,
    percentComplete: 100,
  });

  await processOperationalFlow({
    source: "training",
    kind: "training.milestone-completed",
    entityId: `${input.pathSlug}/${input.lessonSlug}`,
    actorEmail:
      input.user && typeof input.user.email === "string" ? input.user.email : null,
  });

  return getTrainingLesson(input.pathSlug, input.lessonSlug, input.user);
}

export async function updateTrainingChecklist(input: {
  pathSlug: string;
  lessonSlug: string;
  user: AnyUser;
  checklistCompletedIds: string[];
  checklistTotal: number;
}): Promise<TrainingLessonView | null> {
  const permissions = getTrainingPermissions(input.user);
  if (!permissions.canTrackProgress) return null;

  const learnerKey = learnerKeyFromUser(input.user);
  const total = Math.max(1, input.checklistTotal);
  const done = input.checklistCompletedIds.length;
  const percentComplete = Math.min(99, Math.round((done / total) * 100));

  await upsertLessonProgress({
    learnerKey,
    pathSlug: input.pathSlug,
    lessonSlug: input.lessonSlug,
    status: done > 0 ? "in-progress" : "started",
    percentComplete,
    checklistCompletedIds: input.checklistCompletedIds,
    markViewed: true,
  });

  return getTrainingLesson(input.pathSlug, input.lessonSlug, input.user);
}

export function mapOperationsFrame(raw: unknown): {
  operations: TrainingLessonContent["operations"];
  walkthrough: TrainingWalkthroughStep[];
  intelligencePrompts: TrainingIntelligencePrompt[];
  operationalPractice: OperationalPracticeSpec | null;
} {
  if (!raw || typeof raw !== "object") {
    return {
      operations: emptyOperations(),
      walkthrough: [],
      intelligencePrompts: [],
      operationalPractice: null,
    };
  }
  const frame = raw as Record<string, unknown>;
  const asStrings = (value: unknown) =>
    Array.isArray(value) ? value.map((row) => String(row)).filter(Boolean) : [];
  return {
    operations: {
      osAlreadyDoes: asStrings(frame.osAlreadyDoes),
      yourResponsibility: asStrings(frame.yourResponsibility),
      askIntelligenceWhen: asStrings(frame.askIntelligenceWhen),
      escalateWhen: asStrings(frame.escalateWhen),
      successLooksLike: asStrings(frame.successLooksLike),
    },
    walkthrough: Array.isArray(frame.walkthrough)
      ? (frame.walkthrough as TrainingWalkthroughStep[])
      : [],
    intelligencePrompts: Array.isArray(frame.intelligencePrompts)
      ? (frame.intelligencePrompts as TrainingIntelligencePrompt[])
      : [],
    operationalPractice: (frame.operationalPractice as OperationalPracticeSpec) ?? null,
  };
}
