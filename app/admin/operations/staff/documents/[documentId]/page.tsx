import { redirect } from "next/navigation";
import { StaffDocumentDetailScreen } from "@/components/admin/operations/staff/StaffDocumentDetailScreen";
import { staffActorFromUser } from "@/lib/staff/actor";
import { getStaffPreviewSession } from "@/lib/staff/preview";
import { actorHasStaffCapability, requireStaffAwarePage } from "@/lib/staff";
import { getStaffDocumentDetail } from "@/lib/staff-documents/data";
import { resolveStaffDocumentsListPageAccess } from "@/lib/staff-documents/page-access";

export const dynamic = "force-dynamic";

const LIST_PATH = "/admin/operations/staff/documents";

type PageProps = { params: Promise<{ documentId: string }> };

export default async function StaffDocumentDetailPage({ params }: PageProps) {
  const documentId = Number((await params).documentId);
  const detailPath =
    Number.isFinite(documentId) && documentId > 0
      ? `/admin/operations/staff/documents/${documentId}`
      : LIST_PATH;

  const user = await requireStaffAwarePage(detailPath);
  const actor = staffActorFromUser(user);
  const access = resolveStaffDocumentsListPageAccess(actor);
  if (access.kind === "redirect") {
    redirect(access.href);
  }
  if (!actor) {
    redirect(LIST_PATH);
  }

  if (!documentId) redirect(LIST_PATH);

  const detail = await getStaffDocumentDetail({ actor, documentId });
  if (!detail) redirect(LIST_PATH);

  const preview = await getStaffPreviewSession();
  const canAcknowledge =
    !preview &&
    detail.canAcknowledge &&
    actorHasStaffCapability(actor, "staff.documents.acknowledge");

  return <StaffDocumentDetailScreen document={detail} canAcknowledge={canAcknowledge} />;
}
