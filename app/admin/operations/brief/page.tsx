/**
 * /admin/operations/brief
 * Phase 16C — Morning Brief ritual mode
 */

import { MorningBriefScreen } from "@/components/admin/operations/rituals/MorningBriefScreen";
import { getExecutiveBriefing } from "@/lib/intelligence/briefings";

export const dynamic = "force-dynamic";

export default async function MorningBriefPage() {
  const briefing = await getExecutiveBriefing();
  return <MorningBriefScreen briefing={briefing} />;
}
