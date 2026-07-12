import "server-only";

/**
 * Phase 21C — Operations Intelligence Mentor services.
 * Uses the permanent KXD Intelligence Layer. No parallel system.
 */

import { getLearningInsight } from "../learning";
import {
  MENTOR_ANSWER_MAX_CHARS,
  MENTOR_STEP_MAX_CHARS,
  clip,
} from "./boundaries";
import { isMentorCapabilityId } from "./capabilities";
import { buildMentorContext } from "./context";
import { buildDeterministicGuidance } from "./deterministic";
import { applyEscalationToDraft } from "./escalation";
import {
  getGuidanceProvider,
  shouldAttemptInterpretation,
} from "./provider";
import {
  buildGuidanceCacheKey,
  createUsageMeta,
  getCachedGuidance,
  hashLearnerKey,
  logMentorUsage,
  newRequestId,
  setCachedGuidance,
  withGuidanceDedupe,
} from "./usage";
import type {
  OperationsGuidanceRequest,
  OperationsGuidanceResponse,
  OperationsMentorContext,
} from "./types";

export {
  explainOperationalConcept,
  recommendLearningNextStep,
  reviewLearningProgress,
} from "./deterministic";
export { assessEscalationNeed } from "./escalation";

function enrichWithLayerInsight(
  draft: Omit<OperationsGuidanceResponse, "usage">,
  insightTitle: string | null,
): Omit<OperationsGuidanceResponse, "usage"> {
  if (!insightTitle) return draft;
  if (draft.capability !== "next" && draft.capability !== "explain") return draft;
  return {
    ...draft,
    reason: clip(
      `${draft.reason} Layer signal: ${insightTitle}.`,
      MENTOR_STEP_MAX_CHARS,
    ),
  };
}

async function composeGuidance(
  context: OperationsMentorContext,
): Promise<Omit<OperationsGuidanceResponse, "usage">> {
  let draft = buildDeterministicGuidance(context);
  draft = applyEscalationToDraft(context, draft);

  /* Soft link to permanent layer — never blocks mentor if pipeline is cold. */
  try {
    const insight = await getLearningInsight({
      workspaceId: "operations-experience",
      learnerKey: context.learnerKey,
      pathSlug: context.pathSlug,
      lessonSlug: context.lessonSlug,
      limit: 1,
    });
    draft = enrichWithLayerInsight(draft, insight?.title ?? null);
  } catch {
    /* keep deterministic draft */
  }

  if (shouldAttemptInterpretation(draft.taskComplexity, draft.confidence)) {
    const provider = getGuidanceProvider();
    if (provider.interpret) {
      const patch = await provider.interpret(context, draft);
      if (patch) {
        draft = {
          ...draft,
          ...patch,
          mode: "interpreted",
          conciseAnswer: clip(
            patch.conciseAnswer ?? draft.conciseAnswer,
            MENTOR_ANSWER_MAX_CHARS,
          ),
          recommendedNextStep: clip(
            patch.recommendedNextStep ?? draft.recommendedNextStep,
            MENTOR_STEP_MAX_CHARS,
          ),
        };
      }
    }
  }

  return draft;
}

/**
 * Primary mentor entry — intentional requests only.
 */
export async function requestOperationsGuidance(input: {
  request: OperationsGuidanceRequest;
  learnerKey: string;
  learnerLabel: string;
}): Promise<OperationsGuidanceResponse | { error: string }> {
  const { request, learnerKey, learnerLabel } = input;

  if (!isMentorCapabilityId(request.capability)) {
    return { error: "Unknown mentor action." };
  }

  const pathSlug = request.pathSlug?.trim();
  const lessonSlug = request.lessonSlug?.trim();
  if (!pathSlug || !lessonSlug) {
    return { error: "pathSlug and lessonSlug are required." };
  }

  const context = buildMentorContext({
    pathSlug,
    lessonSlug,
    capability: request.capability,
    learnerKey,
    learnerLabel,
    checklistCompletedIds: request.checklistCompletedIds,
    learnerNote: request.learnerNote,
  });

  if (!context) {
    return { error: "Lesson not found in Operations Experience catalog." };
  }

  const cacheKey = buildGuidanceCacheKey(request, learnerKey);
  const cached = getCachedGuidance<OperationsGuidanceResponse>(cacheKey);
  if (cached) {
    const requestId = newRequestId();
    const response: OperationsGuidanceResponse = {
      ...cached,
      usage: createUsageMeta({
        requestId,
        cached: true,
        deduped: false,
        mode: cached.mode,
        capability: cached.capability,
        pathSlug,
        lessonSlug,
        noteLength: (request.learnerNote ?? "").trim().length,
      }),
    };
    logMentorUsage({
      requestId,
      capability: response.capability,
      pathSlug,
      lessonSlug,
      learnerKeyHash: hashLearnerKey(learnerKey),
      mode: response.mode,
      cached: true,
      deduped: false,
      noteLength: response.usage.noteLength,
      involveMatt: response.involveMatt,
    });
    return response;
  }

  const { value, deduped } = await withGuidanceDedupe(cacheKey, async () => {
    const draft = await composeGuidance(context);
    const requestId = newRequestId();
    const response: OperationsGuidanceResponse = {
      ...draft,
      usage: createUsageMeta({
        requestId,
        cached: false,
        deduped: false,
        mode: draft.mode,
        capability: draft.capability,
        pathSlug,
        lessonSlug,
        noteLength: (request.learnerNote ?? "").trim().length,
      }),
    };
    setCachedGuidance(cacheKey, response);
    return response;
  });

  const requestId = deduped ? newRequestId() : value.usage.requestId;
  const response: OperationsGuidanceResponse = {
    ...value,
    usage: {
      ...value.usage,
      requestId,
      deduped,
      cached: false,
    },
  };

  logMentorUsage({
    requestId,
    capability: response.capability,
    pathSlug,
    lessonSlug,
    learnerKeyHash: hashLearnerKey(learnerKey),
    mode: response.mode,
    cached: false,
    deduped,
    noteLength: response.usage.noteLength,
    involveMatt: response.involveMatt,
  });

  return response;
}
