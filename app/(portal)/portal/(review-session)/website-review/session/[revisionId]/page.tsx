import { redirect } from "next/navigation";
import { ReviewSessionScreen } from "@/components/ces/review";
import { requireCesModule, resolveExperienceProfile } from "@/lib/ces/server";
import { getReviewSessionBootstrap } from "@/lib/ces/modules/website-review/session-data";
import { getPortalSession } from "@/lib/portal/session";
import Link from "next/link";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";

export const dynamic = "force-dynamic";

interface ReviewSessionPageProps {
  params: Promise<{ revisionId: string }>;
}

export default async function ReviewSessionPage({ params }: ReviewSessionPageProps) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const profile = await resolveExperienceProfile(session);
  requireCesModule(profile, "website-review");

  const { revisionId } = await params;
  const bootstrap = await getReviewSessionBootstrap(session, profile, revisionId);

  if (!bootstrap) {
    return (
      <div className="kxd-review-session-empty">
        <h1 className="kxd-review-session-empty__title">
          {PORTAL_CLIENT_LANGUAGE.reviewSessionUnavailableTitle}
        </h1>
        <p className="kxd-review-session-empty__lead">
          {PORTAL_CLIENT_LANGUAGE.reviewSessionUnavailableLead}
        </p>
        <Link href="/portal/website-review" className="kxd-ces-btn kxd-ces-btn--primary">
          {PORTAL_CLIENT_LANGUAGE.reviewSessionBack}
        </Link>
      </div>
    );
  }

  return <ReviewSessionScreen bootstrap={bootstrap} />;
}
