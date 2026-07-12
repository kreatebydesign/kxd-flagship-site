export const TRAINING_HOME = "/admin/training" as const;

export const TRAINING_PATHS_COLLECTION = "training-learning-paths" as const;
export const TRAINING_LESSONS_COLLECTION = "training-lessons" as const;
export const TRAINING_PROGRESS_COLLECTION = "training-learner-progress" as const;

export function trainingPathHref(pathSlug: string): string {
  return `${TRAINING_HOME}/${encodeURIComponent(pathSlug)}`;
}

export function trainingLessonHref(pathSlug: string, lessonSlug: string): string {
  return `${trainingPathHref(pathSlug)}/${encodeURIComponent(lessonSlug)}`;
}
