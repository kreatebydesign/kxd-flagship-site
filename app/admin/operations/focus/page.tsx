/**
 * /admin/operations/focus
 * Phase 16C — Focus Mode ritual
 * Phase 18A — Intelligence stack integration
 * Phase 28B — Executive Intelligence primary decision
 */

import { FocusModeScreen } from "@/components/admin/operations/rituals/FocusModeScreen";
import { getExecutiveBriefing, loadBriefingContext } from "@/lib/intelligence/briefings";
import { buildFocusContext } from "@/lib/rituals/focus-builder";
import { buildFocusIntelligence, loadRitualIntelligence } from "@/lib/rituals/intelligence";
import { getWorkWorkspace } from "@/lib/work/server";

export const dynamic = "force-dynamic";

export default async function FocusModePage() {
  const [briefing, work, intelligenceBundle, briefingContext] = await Promise.all([
    getExecutiveBriefing(),
    getWorkWorkspace(),
    loadRitualIntelligence(),
    loadBriefingContext(),
  ]);
  const intelligence = buildFocusIntelligence(intelligenceBundle);
  const focus = buildFocusContext(briefing, work, intelligence, briefingContext);
  return <FocusModeScreen focus={focus} />;
}
