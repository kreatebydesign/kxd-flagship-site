/**
 * /admin/operations/brief
 * Phase 16C — Morning Brief ritual mode
 * Phase 18A — Intelligence stack integration
 * Phase 19B — Executive Morning Brief v2 (IA refinement)
 */

import { MorningBriefScreen } from "@/components/admin/operations/rituals/MorningBriefScreen";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { loadMorningBriefPageData } from "@/lib/rituals/morning-brief";

export const dynamic = "force-dynamic";

export default async function MorningBriefPage() {
  const user = await requirePayloadAdminPage("/admin/operations/brief");
  const { briefing, intelligence, activity, snapshot, firstAction, voice } =
    await loadMorningBriefPageData({
      displayName:
        typeof user.displayName === "string" ? user.displayName : null,
      email: typeof user.email === "string" ? user.email : null,
    });

  return (
    <MorningBriefScreen
      briefing={briefing}
      intelligence={intelligence}
      activity={activity}
      snapshot={snapshot}
      firstAction={firstAction}
      voice={voice}
    />
  );
}
