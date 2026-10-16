import "server-only";

import { readPublishedCatalog } from "./curriculum";
import {
  buildProgressMap,
  pickContinueLesson,
  pickRecommendedLesson,
  toPathView,
} from "./map";
import { learnerKeyFromUser } from "./permissions";
import { listProgressForLearner } from "./progress";
import {
  filterCatalogForUser,
  primaryTrainingPathSlugForRole,
  resolveStaffRoleForTraining,
} from "./role-access";
import { resolveGrowthTrackForStaffRole } from "./growth-tracks";
import type { TrainingLessonView, TrainingStaffSummary } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyUser = Record<string, any> | null | undefined;

/**
 * Lightweight training snapshot for Staff Home — read-only catalog, one progress query.
 */
export async function getTrainingStaffSummary(user: AnyUser): Promise<TrainingStaffSummary> {
  const learnerKey = learnerKeyFromUser(user);
  const staffRole = resolveStaffRoleForTraining(user);
  const primaryPathSlug = primaryTrainingPathSlugForRole(staffRole);
  const curriculum = filterCatalogForUser(readPublishedCatalog(), user);
  const progressRows = await listProgressForLearner(learnerKey);
  const progressMap = buildProgressMap(progressRows);

  const paths = curriculum
    .filter((path) => path.status === "published")
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

  return {
    overallPercent,
    completedLessons,
    totalLessons,
    currentPathSlug,
    continueLesson,
    recommendedLesson,
    growthTrack: resolveGrowthTrackForStaffRole(staffRole),
  };
}

export function trainingSummaryToPlanInput(summary: TrainingStaffSummary): {
  overallPercent: number;
  continueLesson: TrainingLessonView | null;
  recommendedLesson: TrainingLessonView | null;
} {
  return {
    overallPercent: summary.overallPercent,
    continueLesson: summary.continueLesson,
    recommendedLesson: summary.recommendedLesson,
  };
}
