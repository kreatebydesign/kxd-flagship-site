import { notFound, redirect } from "next/navigation";
import { CesExecutiveReview } from "@/components/ces/executive-review";
import {
  composeExecutiveReview,
  isExecutiveReviewAvailable,
} from "@/lib/ces/executive-review";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalExecutiveReviewPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const profile = await resolveExperienceProfile(session);

  if (!isExecutiveReviewAvailable(profile)) {
    notFound();
  }

  const result = composeExecutiveReview(profile);
  if (!result.available) {
    notFound();
  }

  return <CesExecutiveReview pack={result.pack} />;
}
