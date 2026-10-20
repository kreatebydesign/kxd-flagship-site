import { redirect } from "next/navigation";
import { StaffTimeClockScreen } from "@/components/admin/operations/staff/StaffTimeClockScreen";
import {
  STAFF_HOME_PATH,
  actorHasStaffCapability,
  requireStaffAwarePage,
  staffActorFromUser,
} from "@/lib/staff";
import { loadStaffTimeClockPage } from "@/lib/staff-time/load";

export const dynamic = "force-dynamic";

export default async function StaffTimeClockPage() {
  const user = await requireStaffAwarePage("/admin/operations/staff/time");
  const actor = staffActorFromUser(user);

  if (
    !actor ||
    (!actorHasStaffCapability(actor, "staff.time.read.self") &&
      !actorHasStaffCapability(actor, "staff.time.clock"))
  ) {
    redirect(STAFF_HOME_PATH);
  }

  const data = await loadStaffTimeClockPage(actor);
  return <StaffTimeClockScreen initial={data} />;
}
