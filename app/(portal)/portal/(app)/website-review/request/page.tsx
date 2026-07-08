import { redirect } from "next/navigation";
import { WebsiteReviewRequestFlow } from "@/components/ces/modules/website-review";
import { parseReviewContextFromSearchParams } from "@/lib/ces/modules/website-review/context";
import { requireCesModule, resolveExperienceProfile } from "@/lib/ces/server";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function WebsiteReviewRequestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const profile = await resolveExperienceProfile(session);
  requireCesModule(profile, "website-review");

  const params = await searchParams;
  const initialContext = parseReviewContextFromSearchParams(params);

  return <WebsiteReviewRequestFlow initialContext={initialContext} />;
}
