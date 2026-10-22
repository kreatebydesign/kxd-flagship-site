import { redirect } from "next/navigation";
import { StaffDocumentTemplateEditorScreen } from "@/components/admin/operations/staff/StaffDocumentTemplateEditorScreen";
import { requireStaffAwarePage, staffActorFromUser } from "@/lib/staff";
import { resolveStaffDocumentsOversightPageAccess } from "@/lib/staff-documents/page-access";

export const dynamic = "force-dynamic";

const PATH = "/admin/operations/staff/oversight/documents/templates/new";

export default async function StaffDocumentTemplateNewPage() {
  const user = await requireStaffAwarePage(PATH);
  const actor = staffActorFromUser(user);
  const access = resolveStaffDocumentsOversightPageAccess(actor);
  if (access.kind === "redirect") {
    redirect(access.href);
  }

  return <StaffDocumentTemplateEditorScreen mode="create" />;
}
