import { redirect } from "next/navigation";
import { StaffDocumentsScreen } from "@/components/admin/operations/staff/StaffDocumentsScreen";
import { staffActorFromUser } from "@/lib/staff/actor";
import { requireStaffAwarePage } from "@/lib/staff";
import { listStaffDocumentsForUser } from "@/lib/staff-documents/data";
import { resolveStaffDocumentsListPageAccess } from "@/lib/staff-documents/page-access";

export const dynamic = "force-dynamic";

const LIST_PATH = "/admin/operations/staff/documents";

export default async function StaffDocumentsPage() {
  const user = await requireStaffAwarePage(LIST_PATH);
  const actor = staffActorFromUser(user);
  const access = resolveStaffDocumentsListPageAccess(actor);
  if (access.kind === "redirect") {
    redirect(access.href);
  }

  let documents: Awaited<ReturnType<typeof listStaffDocumentsForUser>> = [];
  try {
    documents = await listStaffDocumentsForUser(actor!.userId);
  } catch (err) {
    console.error("[staff-documents] My documents list failed:", err);
  }

  return <StaffDocumentsScreen documents={documents} />;
}
