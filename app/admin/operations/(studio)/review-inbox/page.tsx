import { Suspense } from "react";
import { ReviewInboxScreen } from "@/components/admin/operations/review-inbox/ReviewInboxScreen";
import { reviewInboxClientScopeForUser } from "@/lib/staff/page-data-scope";
import { getReviewInbox } from "@/lib/website-review-inbox/data";

export const dynamic = "force-dynamic";

export default async function ReviewInboxPage() {
  const { requireStaffAwarePage } = await import("@/lib/staff/guard");
  const user = await requireStaffAwarePage("/admin/operations/review-inbox");
  const clientIds = await reviewInboxClientScopeForUser(user);
  const data = await getReviewInbox(
    clientIds !== undefined ? { clientIds } : undefined,
  );

  return (
    <Suspense fallback={null}>
      <ReviewInboxScreen data={data} />
    </Suspense>
  );
}
