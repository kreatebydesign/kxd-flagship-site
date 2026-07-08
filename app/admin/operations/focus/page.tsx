/**
 * /admin/operations/focus
 * Phase 16C — Focus Mode ritual
 */

import { FocusModeScreen } from "@/components/admin/operations/rituals/FocusModeScreen";
import { getExecutiveBriefing } from "@/lib/intelligence/briefings";
import { buildFocusContext } from "@/lib/rituals/focus-builder";
import { getWorkWorkspace } from "@/lib/work/server";

export const dynamic = "force-dynamic";

export default async function FocusModePage() {
  const [briefing, work] = await Promise.all([getExecutiveBriefing(), getWorkWorkspace()]);
  const focus = buildFocusContext(briefing, work);
  return <FocusModeScreen focus={focus} />;
}
