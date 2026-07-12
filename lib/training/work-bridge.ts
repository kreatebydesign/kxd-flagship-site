/**
 * Future Work Engine + operational practice bridge — interfaces only.
 * Learn → Practice → Review → Approved → Independent
 *
 * Do not spawn Work items in Phase 20G.
 */

import type {
  TrainingLessonDefinition,
  TrainingPracticeWorkSpec,
  TrainingWorkStage,
} from "./types";

export const TRAINING_WORK_STAGE_ORDER: TrainingWorkStage[] = [
  "learn",
  "practice",
  "review",
  "approved",
  "independent",
];

export function getNextTrainingWorkStage(
  current: TrainingWorkStage,
): TrainingWorkStage | null {
  const index = TRAINING_WORK_STAGE_ORDER.indexOf(current);
  if (index < 0 || index >= TRAINING_WORK_STAGE_ORDER.length - 1) return null;
  return TRAINING_WORK_STAGE_ORDER[index + 1] ?? null;
}

export function buildPracticeWorkSpecFromLesson(
  pathSlug: string,
  lesson: TrainingLessonDefinition,
): TrainingPracticeWorkSpec | null {
  const practice = lesson.content.operationalPractice;
  const key = (practice?.practiceWorkKey || lesson.practiceWorkKey)?.trim();
  if (!key) return null;

  const stage: TrainingWorkStage =
    lesson.workStage === "learn" ? "practice" : lesson.workStage ?? "practice";

  return {
    practiceWorkKey: key,
    lessonSlug: lesson.slug,
    pathSlug,
    title: practice?.title ?? `Practice · ${lesson.title}`,
    summary:
      practice?.summary ||
      lesson.content.practiceTaskPlaceholder?.trim() ||
      `Supervised operational practice for “${lesson.title}”.`,
    stage,
    supervised: stage === "practice" || stage === "review",
    suggestedWorkStatus: stage === "review" ? "review" : "in-progress",
    operationalPractice: practice,
    metadata: {
      source: "operations-experience",
      trainingLessonSlug: lesson.slug,
      trainingPathSlug: pathSlug,
      stage,
      practiceKind: practice?.kind,
    },
  };
}

export async function prepareSupervisedPracticeFromLesson(_input: {
  pathSlug: string;
  lesson: TrainingLessonDefinition;
  learnerKey: string;
}): Promise<{ prepared: false; reason: string; spec: TrainingPracticeWorkSpec | null }> {
  const spec = buildPracticeWorkSpecFromLesson(_input.pathSlug, _input.lesson);
  return {
    prepared: false,
    reason: "Operational practice spawn is reserved for a future phase.",
    spec,
  };
}
