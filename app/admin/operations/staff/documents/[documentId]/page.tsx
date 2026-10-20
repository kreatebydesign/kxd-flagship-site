import { redirect } from "next/navigation";
import { StaffDocumentDetailScreen } from "@/components/admin/operations/staff/StaffDocumentDetailScreen";
import { staffActorFromUser } from "@/lib/staff/actor";
import { getStaffPreviewSession } from "@/lib/staff/preview";
import {
  actorHasStaffCapability,
  isRestrictedStaff,
  requireStaffAwarePage,
  STAFF_HOME_PATH,
} from "@/lib/staff";
import { getStaffDocumentDetail } from "@/lib/staff-documents/data";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ documentId: string }> };

export default async function StaffDocumentDetailPage({ params }: PageProps) {
  const user = await requireStaffAwarePage("/admin/operations/staff/documents");
  const actor = staffActorFromUser(user);
  if (!actor || !isRestrictedStaff(actor)) {
    redirect("/admin/operations/today");
  }
  if (!actorHasStaffCapability(actor, "staff.documents.read")) {
    redirect(STAFF_HOME_PATH);
  }

  const documentId = Number((await params).documentId);
  if (!documentId) redirect("/admin/operations/staff/documents");

  const detail = await getStaffDocumentDetail({ actor, documentId });
  if (!detail) redirect("/admin/operations/staff/documents");

  const preview = await getStaffPreviewSession();
  const canAcknowledge =
    !preview &&
    detail.canAcknowledge &&
    actorHasStaffCapability(actor, "staff.documents.acknowledge");

  return <StaffDocumentDetailScreen document={detail} canAcknowledge={canAcknowledge} />;
}
