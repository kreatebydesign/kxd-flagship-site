import "server-only";

import { processOperationalFlow } from "@/lib/operational-flow";
import { getCatalogLesson, getCatalogPath } from "./catalog";
import { readPublishedCatalog } from "./curriculum";
import { resolveGrowthTrackForStaffRole } from "./growth-tracks";
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
import {
  assertTrainingLessonAccess,
  assertTrainingPathAccess,
  filterCatalogForUser,
  primaryTrainingPathSlugForRole,
  resolveStaffRoleForTraining,
} from "./role-access";
import type {
  OperationalPracticeSpec,
  TrainingDashboardData,
  TrainingIntelligencePrompt,
  TrainingLessonContent,
  TrainingLessonDefinition,
  TrainingLessonView,
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

function resolvePathDefinition(pathSlug: string) {
  return readPublishedCatalog().find((row) => row.slug === pathSlug) ?? getCatalogPath(pathSlug);
}

export async function getTrainingDashboard(user: AnyUser): Promise<TrainingDashboardData> {
  const permissions = getTrainingPermissions(user);
  const learnerKey = learnerKeyFromUser(user);
  const staffRole = resolveStaffRoleForTraining(user);
  const primaryPathSlug = primaryTrainingPathSlugForRole(staffRole);
  const curriculum = filterCatalogForUser(readPublishedCatalog(), user);
  const progressRows = await listProgressForLearner(learnerKey);
  const progressMap = buildProgressMap(progressRows);

  const paths = curriculum
    .filter((path) => path.status === "published" || permissions.canManage)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((path) => toPathView(path, progressMap));

  const publishedLessons = paths.flatMap((path) =>
    path.lessons.filter((lesson) => lesson.status === "published"),
  );
  const completedLessons = publishedLessons.filter(
    (l) => l.progress?.status === "completed",
  ).length;
  const totalLessons = publishedLessons.length;
  const overallPercent =
    totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

  const continueLesson = pickContinueLesson(paths);
  const recommendedLesson = pickRecommendedLesson(paths, primaryPathSlug);
  const currentPathSlug =
    continueLesson?.pathSlug ??
    recommendedLesson?.pathSlug ??
    primaryPathSlug ??
    paths[0]?.slug ??
    null;

  const growthTrack = resolveGrowthTrackForStaffRole(staffRole);
  const experienceTitle =
    staffRole === "business_development_specialist"
      ? "KXD Business Development Experience"
      : "KXD Operations Experience";

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
    growthTrack,
    experienceTitle,
    experienceLede:
      "Learn to operate Kreate by Design through KXD OS — judgment beside automation, never instead of it.",
    generatedAt: new Date().toISOString(),
  };
}

export async function getTrainingPath(
  pathSlug: string,
  user: AnyUser,
): Promise<TrainingPathView | null> {
  if (!assertTrainingPathAccess(user, pathSlug)) return null;
  const path = resolvePathDefinition(pathSlug);
  if (!path) return null;
  const progressMap = buildProgressMap(await listProgressForLearner(learnerKeyFromUser(user)));
  return toPathView(path, progressMap);
}

export async function getTrainingLesson(
  pathSlug: string,
  lessonSlug: string,
  user: AnyUser,
): Promise<TrainingLessonView | null> {
  if (!assertTrainingLessonAccess(user, pathSlug, lessonSlug)) return null;
  const path = resolvePathDefinition(pathSlug);
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
  if (!assertTrainingLessonAccess(input.user, input.pathSlug, input.lessonSlug)) {
    return null;
  }

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
  if (!assertTrainingLessonAccess(input.user, input.pathSlug, input.lessonSlug)) {
    return null;
  }

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
