import { ReviewInboxScreen } from "@/components/admin/operations/review-inbox/ReviewInboxScreen";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { getReviewInbox } from "@/lib/website-review-inbox/data";

export const dynamic = "force-dynamic";

export default async function ReviewInboxPage() {
  await requirePayloadAdminPage("/admin/operations/review-inbox");
  const data = await getReviewInbox();

  return <ReviewInboxScreen data={data} />;
}
