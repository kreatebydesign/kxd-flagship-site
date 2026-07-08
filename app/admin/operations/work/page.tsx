/**
 * /admin/operations/work
 * KXD OS Phase 14B — Work Engine workspace
 */

import { WorkEngineScreen } from "@/components/admin/operations/work/WorkEngineScreen";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { getWorkWorkspace } from "@/lib/work/server";

export const dynamic = "force-dynamic";

export default async function WorkEnginePage() {
  const user = await requirePayloadAdminPage("/admin/operations/work");
  const data = await getWorkWorkspace();

  return (
    <WorkEngineScreen
      data={data}
      adminDisplayName={
        typeof user.displayName === "string" && user.displayName.trim()
          ? user.displayName.trim()
          : null
      }
    />
  );
}
