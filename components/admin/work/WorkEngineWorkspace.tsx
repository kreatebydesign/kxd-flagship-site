/**
 * /admin/work — Work Engine editorial workspace (server entry).
 * Interactive lists + Executive Work Composer live in WorkEngineClient.
 */

import { WorkEngineClient } from "@/components/admin/work/WorkEngineClient";
import type { WorkComposerUserOption } from "@/lib/work/composer";
import type { WorkWorkspaceData } from "@/lib/work/types";

export function WorkEngineWorkspace({
  data,
  greeting,
  dateDisplay,
  currentUser,
}: {
  data: WorkWorkspaceData;
  greeting: string;
  dateDisplay: string;
  currentUser?: WorkComposerUserOption | null;
}) {
  return (
    <WorkEngineClient
      data={data}
      greeting={greeting}
      dateDisplay={dateDisplay}
      currentUser={currentUser}
    />
  );
}
