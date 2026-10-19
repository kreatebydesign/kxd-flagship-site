/**
 * Staff My Clients — assigned client portfolio (staff-client-assignments).
 */

import { redirect } from "next/navigation";
import { StaffMyClientsScreen } from "@/components/admin/operations/staff/StaffMyClientsScreen";
import { staffActorFromUser } from "@/lib/staff/actor";
import { loadStaffMyClients } from "@/lib/staff/client-context/load";
import {
  actorHasStaffCapability,
  isRestrictedStaff,
  requireStaffAwarePage,
  STAFF_HOME_PATH,
} from "@/lib/staff";

export const dynamic = "force-dynamic";

export default async function StaffMyClientsPage() {
  const user = await requireStaffAwarePage("/admin/operations/staff/my-clients");
  const actor = staffActorFromUser(user);
  if (!actor || !isRestrictedStaff(actor)) {
    redirect("/admin/operations/clients");
  }
  if (!actorHasStaffCapability(actor, "staff.client-context.limited")) {
    redirect(STAFF_HOME_PATH);
  }

  const data = await loadStaffMyClients(actor);
  return <StaffMyClientsScreen data={data} />;
}
