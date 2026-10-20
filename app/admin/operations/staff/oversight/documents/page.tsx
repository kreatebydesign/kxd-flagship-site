import { redirect } from "next/navigation";
import { StaffDocumentsOperatorScreen } from "@/components/admin/operations/staff/StaffDocumentsOperatorScreen";
import { loadStaffDocumentsOperatorWorkspace } from "@/lib/staff-documents/operator-load";
import {
  STAFF_HOME_PATH,
  actorHasStaffCapability,
  requireStaffAwarePage,
  staffActorFromUser,
} from "@/lib/staff";

export const dynamic = "force-dynamic";

export default async function StaffDocumentsOversightPage() {
  const user = await requireStaffAwarePage("/admin/operations/staff/oversight/documents");
  const actor = staffActorFromUser(user);
  if (!actor || !actorHasStaffCapability(actor, "admin.staff-documents.manage")) {
    redirect(STAFF_HOME_PATH);
  }

  const data = await loadStaffDocumentsOperatorWorkspace();
  return (
    <StaffDocumentsOperatorScreen
      templates={data.templates}
      assignments={data.assignments}
      staffUsers={data.staffUsers}
    />
  );
}
