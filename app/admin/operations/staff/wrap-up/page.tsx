/**
 * /admin/operations/staff/wrap-up — end-of-day review
 */

import { StaffWrapUpScreen } from "@/components/admin/operations/staff/StaffWrapUpScreen";
import {
  loadStaffToday,
  loadStaffWrapUp,
  requireStaffAwarePage,
} from "@/lib/staff";

export const dynamic = "force-dynamic";

export default async function StaffWrapUpPage() {
  const user = await requireStaffAwarePage("/admin/operations/staff/wrap-up");
  const [wrapUp, today] = await Promise.all([
    loadStaffWrapUp(user),
    loadStaffToday(user),
  ]);

  return (
    <StaffWrapUpScreen
      data={wrapUp}
      canAct={today.permissions.canAct}
      isPreview={today.permissions.isPreview}
    />
  );
}
