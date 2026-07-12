import "server-only";

import { getLearningInsight, getLearningIntelligenceView } from "../learning";
import { contextForWorkspace } from "./registry";

/** Operations Experience — learning architecture without adaptive implementation. */
export async function loadOperationsExperienceIntelligence(input: {
  learnerKey?: string | null;
  pathSlug?: string | null;
  lessonSlug?: string | null;
}) {
  const context = contextForWorkspace("operations-experience", {
    learnerKey: input.learnerKey ?? null,
    pathSlug: input.pathSlug ?? null,
    lessonSlug: input.lessonSlug ?? null,
  });
  const [insight, view] = await Promise.all([
    getLearningInsight(context),
    getLearningIntelligenceView(context),
  ]);
  return { insight, view, workspaceId: "operations-experience" as const };
}
