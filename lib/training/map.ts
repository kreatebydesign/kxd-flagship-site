import { trainingLessonHref, trainingPathHref } from "./constants";
import type {
  TrainingLessonDefinition,
  TrainingLessonProgress,
  TrainingLessonView,
  TrainingPathDefinition,
  TrainingPathView,
  TrainingProgressStatus,
} from "./types";
import type { ProgressRecord } from "./progress";

function emptyProgress(pathSlug: string, lessonSlug: string): TrainingLessonProgress {
  return {
    lessonSlug,
    pathSlug,
    status: "not-started",
    percentComplete: 0,
    startedAt: null,
    lastViewedAt: null,
    completedAt: null,
    timeSpentSeconds: 0,
    checklistCompletedIds: [],
  };
}

export function progressFromRecord(record: ProgressRecord | undefined, pathSlug: string, lessonSlug: string): TrainingLessonProgress {
  if (!record) return emptyProgress(pathSlug, lessonSlug);
  return {
    lessonSlug,
    pathSlug,
    status: record.status,
    percentComplete: record.percentComplete,
    startedAt: record.startedAt,
    lastViewedAt: record.lastViewedAt,
    completedAt: record.completedAt,
    timeSpentSeconds: record.timeSpentSeconds,
    checklistCompletedIds: record.checklistCompletedIds,
  };
}

export function toLessonView(
  path: TrainingPathDefinition,
  lesson: TrainingLessonDefinition,
  progressMap: Map<string, ProgressRecord>,
): TrainingLessonView {
  const key = `${path.slug}::${lesson.slug}`;
  return {
    ...lesson,
    pathSlug: path.slug,
    pathTitle: path.title,
    href: trainingLessonHref(path.slug, lesson.slug),
    progress: progressFromRecord(progressMap.get(key), path.slug, lesson.slug),
  };
}

export function toPathView(
  path: TrainingPathDefinition,
  progressMap: Map<string, ProgressRecord>,
): TrainingPathView {
  const lessons = [...path.lessons]
    .filter((lesson) => lesson.status !== "archived")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((lesson) => toLessonView(path, lesson, progressMap));

  const completedCount = lessons.filter((l) => l.progress?.status === "completed").length;
  const percentComplete =
    lessons.length === 0 ? 0 : Math.round((completedCount / lessons.length) * 100);

  return {
    slug: path.slug,
    title: path.title,
    summary: path.summary,
    description: path.description,
    estimatedMinutes: path.estimatedMinutes,
    sortOrder: path.sortOrder,
    status: path.status,
    audience: path.audience,
    href: trainingPathHref(path.slug),
    lessonCount: lessons.length,
    completedCount,
    percentComplete,
    lessons,
  };
}

export function buildProgressMap(records: ProgressRecord[]): Map<string, ProgressRecord> {
  const map = new Map<string, ProgressRecord>();
  for (const row of records) {
    map.set(`${row.pathSlug}::${row.lessonSlug}`, row);
  }
  return map;
}

export function pickContinueLesson(paths: TrainingPathView[]): TrainingLessonView | null {
  const inProgress: TrainingLessonView[] = [];
  const started: TrainingLessonView[] = [];

  for (const path of paths) {
    for (const lesson of path.lessons) {
      const status = lesson.progress?.status as TrainingProgressStatus | undefined;
      if (status === "in-progress") inProgress.push(lesson);
      if (status === "started") started.push(lesson);
    }
  }

  const byRecent = (a: TrainingLessonView, b: TrainingLessonView) =>
    String(b.progress?.lastViewedAt ?? "").localeCompare(String(a.progress?.lastViewedAt ?? ""));

  if (inProgress.length) return [...inProgress].sort(byRecent)[0] ?? null;
  if (started.length) return [...started].sort(byRecent)[0] ?? null;
  return null;
}

export function pickRecommendedLesson(paths: TrainingPathView[]): TrainingLessonView | null {
  for (const path of [...paths].sort((a, b) => a.sortOrder - b.sortOrder)) {
    if (path.status !== "published") continue;
    for (const lesson of path.lessons) {
      if (lesson.status !== "published") continue;
      if (lesson.progress?.status !== "completed") return lesson;
    }
  }
  return null;
}

export function pickRecentLessons(paths: TrainingPathView[], limit = 5): TrainingLessonView[] {
  const all = paths.flatMap((path) => path.lessons).filter((l) => l.progress?.lastViewedAt);
  return all
    .sort((a, b) =>
      String(b.progress?.lastViewedAt ?? "").localeCompare(String(a.progress?.lastViewedAt ?? "")),
    )
    .slice(0, limit);
}
