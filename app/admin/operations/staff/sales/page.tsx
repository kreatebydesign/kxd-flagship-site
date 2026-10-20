import { redirect } from "next/navigation";
import { StaffSalesScreen } from "@/components/admin/operations/staff/StaffSalesScreen";
import { staffActorFromUser } from "@/lib/staff/actor";
import {
  actorHasStaffCapability,
  isRestrictedStaff,
  requireStaffAwarePage,
  STAFF_HOME_PATH,
} from "@/lib/staff";
import { loadStaffSalesList } from "@/lib/staff/sales";

export const dynamic = "force-dynamic";

export default async function StaffSalesPage() {
  const user = await requireStaffAwarePage("/admin/operations/staff/sales");
  const actor = staffActorFromUser(user);
  if (!actor || !isRestrictedStaff(actor)) {
    redirect("/admin/sales");
  }
  if (!actorHasStaffCapability(actor, "staff.sales.read")) {
    redirect(STAFF_HOME_PATH);
  }

  const data = await loadStaffSalesList(actor);
  return <StaffSalesScreen data={data} />;
}
