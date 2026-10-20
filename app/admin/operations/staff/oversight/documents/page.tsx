import { redirect } from "next/navigation";
import { StaffDocumentsOperatorScreen } from "@/components/admin/operations/staff/StaffDocumentsOperatorScreen";
import { loadStaffDocumentsOperatorWorkspace } from "@/lib/staff-documents/operator-load";
import { requireStaffAwarePage, staffActorFromUser } from "@/lib/staff";
import { resolveStaffDocumentsOversightPageAccess } from "@/lib/staff-documents/page-access";

export const dynamic = "force-dynamic";

const OVERSIGHT_PATH = "/admin/operations/staff/oversight/documents";

export default async function StaffDocumentsOversightPage() {
  const user = await requireStaffAwarePage(OVERSIGHT_PATH);
  const actor = staffActorFromUser(user);
  const access = resolveStaffDocumentsOversightPageAccess(actor);
  if (access.kind === "redirect") {
    redirect(access.href);
  }

  let data: Awaited<ReturnType<typeof loadStaffDocumentsOperatorWorkspace>> = {
    templates: [],
    assignments: [],
    staffUsers: [],
  };
  try {
    data = await loadStaffDocumentsOperatorWorkspace();
  } catch (err) {
    console.error("[staff-documents] Operator workspace load failed:", err);
  }

  return (
    <StaffDocumentsOperatorScreen
      templates={data.templates}
      assignments={data.assignments}
      staffUsers={data.staffUsers}
    />
  );
}
