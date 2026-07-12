/**
 * /admin/work — Work Engine planning workspace (server entry).
 */

import { WorkPlanningClient } from "@/components/admin/work/WorkPlanningClient";
import type { WorkComposerUserOption } from "@/lib/work/composer";
import type { WorkPlanningPageData } from "@/lib/work/planning";

export function WorkEngineWorkspace({
  planning,
  greeting,
  dateDisplay,
  currentUser,
}: {
  planning: WorkPlanningPageData;
  greeting: string;
  dateDisplay: string;
  currentUser?: WorkComposerUserOption | null;
}) {
  return (
    <WorkPlanningClient
      initialView={planning.view}
      initialPool={planning.pool}
      contextHints={planning.contextHints}
      options={planning.options}
      greeting={greeting}
      dateDisplay={dateDisplay}
      currentUser={currentUser}
    />
  );
}
