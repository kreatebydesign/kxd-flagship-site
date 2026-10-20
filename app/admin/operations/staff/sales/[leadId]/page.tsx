import { redirect } from "next/navigation";
import { StaffSalesDetailScreen } from "@/components/admin/operations/staff/StaffSalesDetailScreen";
import { staffActorFromUser } from "@/lib/staff/actor";
import {
  actorHasStaffCapability,
  isRestrictedStaff,
  requireStaffAwarePage,
  STAFF_HOME_PATH,
} from "@/lib/staff";
import { loadStaffSalesDetail } from "@/lib/staff/sales";

export const dynamic = "force-dynamic";

export default async function StaffSalesDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const user = await requireStaffAwarePage("/admin/operations/staff/sales");
  const actor = staffActorFromUser(user);
  if (!actor || !isRestrictedStaff(actor)) {
    redirect("/admin/sales");
  }
  if (!actorHasStaffCapability(actor, "staff.sales.read")) {
    redirect(STAFF_HOME_PATH);
  }

  const { leadId: raw } = await params;
  const leadId = Number(raw);
  if (!leadId) redirect("/admin/operations/staff/sales");

  const data = await loadStaffSalesDetail(actor, leadId);
  if (!data) redirect("/admin/operations/staff/sales");

  return <StaffSalesDetailScreen data={data} />;
}
