/**
 * /admin/operations/staff/oversight — Matt administrator oversight
 */

import { redirect } from "next/navigation";
import { StaffOversightScreen } from "@/components/admin/operations/staff";
import {
  STAFF_HOME_PATH,
  actorHasStaffCapability,
  loadStaffOversight,
  requireStaffAwarePage,
  staffActorFromUser,
} from "@/lib/staff";

export const dynamic = "force-dynamic";

export default async function StaffOversightPage() {
  const user = await requireStaffAwarePage("/admin/operations/staff/oversight");
  const actor = staffActorFromUser(user);

  if (!actor || !actorHasStaffCapability(actor, "admin.oversight")) {
    redirect(STAFF_HOME_PATH);
  }

  const data = await loadStaffOversight();

  return <StaffOversightScreen data={data} />;
}
