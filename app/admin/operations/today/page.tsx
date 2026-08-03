/**
 * /admin/operations/today — Today (sole founder home)
 * Phase 22A foundation · Phase 7 Batch C home policy
 */

import { ExecutiveTodayScreen } from "@/components/admin/executive-today";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { loadExecutiveToday } from "@/lib/executive-today";

export const dynamic = "force-dynamic";

export default async function ExecutiveTodayPage() {
  const user = await requirePayloadAdminPage("/admin/operations/today");
  const data = await loadExecutiveToday({
    displayName: typeof user.displayName === "string" ? user.displayName : null,
    email: typeof user.email === "string" ? user.email : null,
  });

  return <ExecutiveTodayScreen data={data} />;
}
