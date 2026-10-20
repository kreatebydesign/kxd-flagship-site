import { redirect } from "next/navigation";
import { StaffDocumentsScreen } from "@/components/admin/operations/staff/StaffDocumentsScreen";
import { staffActorFromUser } from "@/lib/staff/actor";
import {
  actorHasStaffCapability,
  isRestrictedStaff,
  requireStaffAwarePage,
  STAFF_HOME_PATH,
} from "@/lib/staff";
import { listStaffDocumentsForUser } from "@/lib/staff-documents/data";

export const dynamic = "force-dynamic";

export default async function StaffDocumentsPage() {
  const user = await requireStaffAwarePage("/admin/operations/staff/documents");
  const actor = staffActorFromUser(user);
  if (!actor || !isRestrictedStaff(actor)) {
    redirect("/admin/operations/today");
  }
  if (!actorHasStaffCapability(actor, "staff.documents.read")) {
    redirect(STAFF_HOME_PATH);
  }

  const documents = await listStaffDocumentsForUser(actor.userId);
  return <StaffDocumentsScreen documents={documents} />;
}
