import { notFound, redirect } from "next/navigation";
import { DonYourSpaceBusinessScreen } from "@/components/portal/don-your-space/DonYourSpaceBusinessScreen";
import { KxdPage } from "@/components/os";
import { resolvePortalAccountContext } from "@/lib/portal/account-context";
import {
  canAccessDonYourSpace,
  getDonYourSpaceBusinessBySlug,
  isDonDeliverableReadyForClient,
} from "@/lib/portal/don-your-space";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function DonYourSpaceBusinessPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = getDonYourSpaceBusinessBySlug(slug);
  if (!business) notFound();

  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const accountContext = session.isOperatorPreview
    ? null
    : await resolvePortalAccountContext(session);

  if (!canAccessDonYourSpace({ session, accountContext })) {
    redirect("/portal");
  }

  const readiness = await isDonDeliverableReadyForClient();

  return (
    <KxdPage className="kxd-os-page--ops kxd-os-page--don-your-space">
      <DonYourSpaceBusinessScreen
        business={business}
        downloadsEnabled={readiness.ok}
      />
    </KxdPage>
  );
}