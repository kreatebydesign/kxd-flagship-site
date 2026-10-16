/**
 * Staff My Work — list and board for assigned Work Engine items.
 */

import { redirect } from "next/navigation";
import { StaffMyWorkScreen } from "@/components/admin/operations/staff/StaffMyWorkScreen";
import { staffActorFromUser } from "@/lib/staff/actor";
import { loadStaffMyWork } from "@/lib/staff/my-work";
import {
  actorHasStaffCapability,
  isRestrictedStaff,
  STAFF_HOME_PATH,
  requireStaffAwarePage,
} from "@/lib/staff";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ completed?: string }>;
};

export default async function StaffMyWorkPage({ searchParams }: PageProps) {
  const user = await requireStaffAwarePage("/admin/operations/staff/my-work");
  const actor = staffActorFromUser(user);
  if (!actor || !isRestrictedStaff(actor)) {
    redirect("/admin/work");
  }
  if (!actorHasStaffCapability(actor, "staff.assigned-work.read")) {
    redirect(STAFF_HOME_PATH);
  }

  const sp = await searchParams;
  const includeCompleted = sp.completed === "1";
  const data = await loadStaffMyWork(actor, { includeCompleted });

  return <StaffMyWorkScreen initialData={data} includeCompleted={includeCompleted} />;
}
