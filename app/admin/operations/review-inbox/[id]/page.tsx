import { notFound } from "next/navigation";
import { ReviewWorkspaceGone } from "@/components/admin/operations/review-inbox/ReviewWorkspaceGone";
import { ReviewWorkspaceScreen } from "@/components/admin/operations/review-inbox/ReviewWorkspaceScreen";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { getReviewWorkspace } from "@/lib/website-review-inbox/detail";

export const dynamic = "force-dynamic";

export default async function ReviewWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePayloadAdminPage("/admin/operations/review-inbox");

  const { id } = await params;
  const requestId = Number.parseInt(id, 10);
  if (!Number.isFinite(requestId)) notFound();

  const review = await getReviewWorkspace(requestId);
  if (!review) return <ReviewWorkspaceGone />;

  return <ReviewWorkspaceScreen review={review} />;
}
