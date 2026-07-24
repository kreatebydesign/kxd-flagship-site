/**
 * /admin/operations/settings
 * Phase 2 Batch E — operator appearance preferences.
 */

import { OperatorSettingsScreen } from "@/components/admin/operations/settings/OperatorSettingsScreen";
import { requireStaffAwarePage } from "@/lib/staff/guard";
import { isRestrictedStaff, staffActorFromUser } from "@/lib/staff";

export const dynamic = "force-dynamic";

export default async function OperatorSettingsPage() {
  const user = await requireStaffAwarePage("/admin/operations/settings");
  const actor = staffActorFromUser(user);
  const variant =
    actor && isRestrictedStaff(actor) ? ("staff" as const) : ("full" as const);
  return <OperatorSettingsScreen variant={variant} />;
}
