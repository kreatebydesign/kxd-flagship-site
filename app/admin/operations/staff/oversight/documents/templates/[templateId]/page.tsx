import { notFound, redirect } from "next/navigation";
import { StaffDocumentTemplateEditorScreen } from "@/components/admin/operations/staff/StaffDocumentTemplateEditorScreen";
import { requireStaffAwarePage, staffActorFromUser } from "@/lib/staff";
import { getStaffDocumentTemplateForOperator } from "@/lib/staff-documents/template-operator";
import { resolveStaffDocumentsOversightPageAccess } from "@/lib/staff-documents/page-access";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ templateId: string }> };

export default async function StaffDocumentTemplateEditPage(props: PageProps) {
  const templateId = Number((await props.params).templateId);
  if (!Number.isFinite(templateId) || templateId <= 0) notFound();

  const path = `/admin/operations/staff/oversight/documents/templates/${templateId}`;
  const user = await requireStaffAwarePage(path);
  const actor = staffActorFromUser(user);
  const access = resolveStaffDocumentsOversightPageAccess(actor);
  if (access.kind === "redirect") {
    redirect(access.href);
  }

  const template = await getStaffDocumentTemplateForOperator(templateId);
  if (!template) {
    redirect("/admin/operations/staff/oversight/documents");
  }

  return (
    <StaffDocumentTemplateEditorScreen
      key={`${template.id}-${template.updatedAt}-${template.status}`}
      mode="edit"
      template={template}
    />
  );
}
