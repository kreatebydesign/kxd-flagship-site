/**
 * /admin/operations/today — Today (sole founder home)
 */

import { ExecutiveTodayScreen } from "@/components/admin/executive-today";
import { FounderHybridTodayScreen } from "@/components/admin/founder-hybrid/FounderHybridTodayScreen";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { FOUNDER_HYBRID_SHELL_ENABLED } from "@/lib/admin/founder-hybrid/flags";
import { requireStaffAwarePage } from "@/lib/staff/guard";
import { loadExecutiveToday } from "@/lib/executive-today";

export const dynamic = "force-dynamic";

export default async function ExecutiveTodayPage() {
  const user = await requireStaffAwarePage("/admin/operations/today");
  const data = await loadExecutiveToday({
    displayName: typeof user.displayName === "string" ? user.displayName : null,
    email: typeof user.email === "string" ? user.email : null,
  });

  if (FOUNDER_HYBRID_SHELL_ENABLED) {
    return (
      <OperationsShell activeId="today" dateDisplay={data.dateDisplay} showQuickActions={false}>
        <FounderHybridTodayScreen data={data} />
      </OperationsShell>
    );
  }

  return <ExecutiveTodayScreen data={data} />;
}