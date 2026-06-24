/**
 * /admin/operations/junior-creators
 * KXD OS — Junior Creator shift review (admin only)
 */

import { JuniorCreatorAdminReview } from "@/components/admin/JuniorCreatorAdminReview";
import { getJuniorCreatorAdminReviewData } from "@/lib/junior-creators/admin-review";

export const dynamic = "force-dynamic";

export default async function JuniorCreatorsAdminPage() {
  const data = await getJuniorCreatorAdminReviewData();
  return <JuniorCreatorAdminReview data={data} />;
}
