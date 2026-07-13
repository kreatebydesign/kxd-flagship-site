import "server-only";

import {
  composeExecutiveIntelligence,
  mapRecommendationToMorningFirstAction,
} from "@/lib/executive-intelligence";
import { buildExecutiveBriefing, loadBriefingContext } from "@/lib/intelligence/briefings/builder";
import type { ExecutiveBriefing } from "@/lib/intelligence/briefings/types";
import { resolveRequestTimezone } from "@/lib/platform/timezone";
import {
  buildMorningBriefIntelligence,
  loadRitualIntelligence,
} from "@/lib/rituals/intelligence";
import type { MorningBriefIntelligence } from "@/lib/rituals/intelligence";
import {
  buildMorningClientActivity,
  type MorningClientActivity,
} from "@/lib/rituals/morning-activity";
import type { MorningFirstAction } from "@/lib/rituals/morning-first-action";
import {
  buildMorningExecutiveSnapshot,
  type MorningExecutiveSnapshot,
} from "@/lib/rituals/morning-snapshot";
import {
  buildMorningBriefVoice,
  resolveExecutiveFirstName,
  type MorningBriefVoice,
} from "@/lib/rituals/morning-welcome";

export interface MorningBriefPageData {
  briefing: ExecutiveBriefing;
  intelligence: MorningBriefIntelligence;
  activity: MorningClientActivity;
  snapshot: MorningExecutiveSnapshot;
  firstAction: MorningFirstAction;
  voice: MorningBriefVoice;
  /** Phase 28B — user-facing explainability for the engine primary. */
  explainability: import("@/lib/executive-intelligence").UserFacingExplainability | null;
}

/**
 * Single page load for Morning Brief — one briefing context for activity,
 * snapshot, first action, and health; ritual intelligence loaded in parallel.
 */
export async function loadMorningBriefPageData(input?: {
  displayName?: string | null;
  email?: string | null;
}): Promise<MorningBriefPageData> {
  const { loadBrainMemory } = await import("@/lib/brain/memory");

  const [context, memory, intelligenceBundle, timeZone] = await Promise.all([
    loadBriefingContext(),
    loadBrainMemory(200),
    loadRitualIntelligence(),
    resolveRequestTimezone(),
  ]);

  const briefing = buildExecutiveBriefing(context, memory, timeZone);
  const activity = buildMorningClientActivity(context, timeZone);
  const intelligenceSurface = composeExecutiveIntelligence({
    observedAt: context.generatedAt,
    briefing: context,
  });
  const firstAction = mapRecommendationToMorningFirstAction(intelligenceSurface.recommendation);
  const firstName = resolveExecutiveFirstName(input?.displayName, input?.email);

  return {
    briefing,
    intelligence: buildMorningBriefIntelligence(intelligenceBundle),
    activity,
    snapshot: buildMorningExecutiveSnapshot(context),
    firstAction,
    voice: buildMorningBriefVoice({
      firstName,
      context,
      briefing,
      activity,
      firstAction,
      timeZone,
    }),
    explainability: intelligenceSurface.userExplainability,
  };
}
