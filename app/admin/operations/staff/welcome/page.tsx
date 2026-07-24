/**
 * /admin/operations/staff/welcome — first-login orientation
 */

import { StaffWelcomeScreen } from "@/components/admin/operations/staff";
import {
  describeStaffActor,
  loadStaffToday,
  requireStaffAwarePage,
  staffActorFromUser,
} from "@/lib/staff";

export const dynamic = "force-dynamic";

export default async function StaffWelcomePage() {
  const user = await requireStaffAwarePage("/admin/operations/staff/welcome");
  const actor = staffActorFromUser(user);
  const today = await loadStaffToday(user);
  const described = actor ? describeStaffActor(actor) : null;

  return (
    <StaffWelcomeScreen
      displayName={described?.name ?? today.actor.displayName}
      roleTitle={today.roleTitle}
    />
  );
}
