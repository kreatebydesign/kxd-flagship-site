/**
 * /admin/operations/brief
 * Phase 16C — Morning Brief ritual mode
 * Phase 18A — Intelligence stack integration
 */

import { MorningBriefScreen } from "@/components/admin/operations/rituals/MorningBriefScreen";
import { getExecutiveBriefing } from "@/lib/intelligence/briefings";
import {
  buildMorningBriefIntelligence,
  loadRitualIntelligence,
} from "@/lib/rituals/intelligence";

export const dynamic = "force-dynamic";

export default async function MorningBriefPage() {
  const [briefing, intelligenceBundle] = await Promise.all([
    getExecutiveBriefing(),
    loadRitualIntelligence(),
  ]);
  const intelligence = buildMorningBriefIntelligence(intelligenceBundle);
  return <MorningBriefScreen briefing={briefing} intelligence={intelligence} />;
}
