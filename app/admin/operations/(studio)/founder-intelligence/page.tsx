/**
 * /admin/operations/founder-intelligence
 * KXD Core Phase 5C — Founder Intelligence morning command brief
 */

import { FounderIntelligenceScreen } from "@/components/admin/operations/founder-intelligence/FounderIntelligenceScreen";
import { getFounderBriefing } from "@/lib/founder-intelligence/data";

export const dynamic = "force-dynamic";

export default async function FounderIntelligencePage() {
  const data = await getFounderBriefing();
  return <FounderIntelligenceScreen data={data} />;
}
