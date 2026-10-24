import { notFound } from "next/navigation";
import { ReviewWorkspaceGone } from "@/components/admin/operations/review-inbox/ReviewWorkspaceGone";
import { ReviewWorkspaceScreen } from "@/components/admin/operations/review-inbox/ReviewWorkspaceScreen";
import { getReviewWorkspace } from "@/lib/website-review-inbox/detail";
import { staffMayAccessClient } from "@/lib/staff/client-assignments";
import { staffActorFromUser } from "@/lib/staff/actor";

export const dynamic = "force-dynamic";

export default async function ReviewWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { requireStaffAwarePage } = await import("@/lib/staff/guard");
  const user = await requireStaffAwarePage("/admin/operations/review-inbox");

  const { id } = await params;
  const requestId = Number.parseInt(id, 10);
  if (!Number.isFinite(requestId)) notFound();

  const review = await getReviewWorkspace(requestId);
  if (!review) return <ReviewWorkspaceGone />;

  const actor = staffActorFromUser(user);
  if (actor) {
    const allowed = await staffMayAccessClient(actor, review.clientId);
    if (!allowed) notFound();
  }

  return <ReviewWorkspaceScreen review={review} />;
}
