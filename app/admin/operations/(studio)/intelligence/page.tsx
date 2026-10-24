/**
 * /admin/operations/intelligence
 * Phase 15B — Executive Intelligence Briefings
 */

import { IntelligenceScreen } from "@/components/admin/operations/intelligence/IntelligenceScreen";
import { getExecutiveBriefing } from "@/lib/intelligence/briefings";

export const dynamic = "force-dynamic";

export default async function IntelligencePage() {
  const briefing = await getExecutiveBriefing();
  return <IntelligenceScreen briefing={briefing} />;
}
