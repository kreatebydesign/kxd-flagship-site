import { notFound } from "next/navigation";
import { OperatorPinReplayScreen } from "@/components/admin/operations/review-inbox/OperatorPinReplayScreen";
import { ReviewWorkspaceGone } from "@/components/admin/operations/review-inbox/ReviewWorkspaceGone";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { getReviewPinReplay } from "@/lib/website-review-inbox/pin-replay";
import "@/design-system/ces/styles/kxd-ces.css";

export const dynamic = "force-dynamic";

export default async function ReviewPinReplayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePayloadAdminPage("/admin/operations/review-inbox");

  const { id } = await params;
  const requestId = Number.parseInt(id, 10);
  if (!Number.isFinite(requestId)) notFound();

  const replay = await getReviewPinReplay(requestId);
  if (!replay) return <ReviewWorkspaceGone />;

  return (
    <OperatorPinReplayScreen
      workspaceUrl={replay.workspaceUrl}
      clientName={replay.clientName}
      title={replay.title}
      pageUrl={replay.pageUrl}
      pin={replay.pin}
      scrollX={replay.scrollX}
      scrollY={replay.scrollY}
    />
  );
}
