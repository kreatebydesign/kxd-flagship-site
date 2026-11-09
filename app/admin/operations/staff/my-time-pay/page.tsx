import { redirect } from "next/navigation";
import { StaffMyTimePayScreen } from "@/components/admin/operations/staff/StaffMyTimePayScreen";
import {
  STAFF_HOME_PATH,
  actorHasStaffCapability,
  requireStaffAwarePage,
  staffActorFromUser,
} from "@/lib/staff";
import { loadStaffMyTimePayPage } from "@/lib/staff-pay/employee-self-view";
import { staffTimePayRequestsTableReady } from "@/lib/staff-time/pay-requests";

export const dynamic = "force-dynamic";

export default async function StaffMyTimePayPage() {
  const user = await requireStaffAwarePage("/admin/operations/staff/my-time-pay");
  const actor = staffActorFromUser(user);

  if (!actor || !actorHasStaffCapability(actor, "staff.time.read.self")) {
    redirect(STAFF_HOME_PATH);
  }

  const [view, payRequestsEnabled] = await Promise.all([
    loadStaffMyTimePayPage(actor),
    staffTimePayRequestsTableReady(),
  ]);

  return (
    <StaffMyTimePayScreen initial={view} payRequestsEnabled={payRequestsEnabled} />
  );
}
