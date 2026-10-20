import { notFound, redirect } from "next/navigation";
import { StaffDocumentOperatorDetailScreen } from "@/components/admin/operations/staff/StaffDocumentOperatorDetailScreen";
import { getStaffDocumentDetail, listStaffDocumentsForOperator } from "@/lib/staff-documents/data";
import { resolveStaffDocumentsOversightPageAccess } from "@/lib/staff-documents/page-access";
import { requireStaffAwarePage, staffActorFromUser } from "@/lib/staff";

export const dynamic = "force-dynamic";

const OVERSIGHT_DOC_PATH = "/admin/operations/staff/oversight/documents";

type PageProps = { params: Promise<{ documentId: string }> };

export default async function StaffDocumentOperatorDetailPage({ params }: PageProps) {
  const user = await requireStaffAwarePage(OVERSIGHT_DOC_PATH);
  const actor = staffActorFromUser(user);
  const access = resolveStaffDocumentsOversightPageAccess(actor);
  if (access.kind === "redirect") {
    redirect(access.href);
  }
  if (!actor) redirect(OVERSIGHT_DOC_PATH);

  const documentId = Number((await params).documentId);
  if (!Number.isFinite(documentId) || documentId <= 0) notFound();

  let detail: Awaited<ReturnType<typeof getStaffDocumentDetail>> = null;
  try {
    detail = await getStaffDocumentDetail({
      actor,
      documentId,
      operatorView: true,
    });
  } catch {
    notFound();
  }
  if (!detail) notFound();

  const assignments = await listStaffDocumentsForOperator();
  const staffLabel =
    assignments.find((row) => row.id === documentId)?.staffLabel ?? `User ${detail.staffUserId}`;

  return <StaffDocumentOperatorDetailScreen document={detail} staffLabel={staffLabel} />;
}
