import { redirect } from "next/navigation";
import { DonYourSpaceScreen } from "@/components/portal/don-your-space/DonYourSpaceScreen";
import { KxdPage } from "@/components/os";
import { resolvePortalAccountContext } from "@/lib/portal/account-context";
import {
  canAccessDonYourSpace,
  isDonDeliverableReadyForClient,
} from "@/lib/portal/don-your-space";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function DonYourSpacePage() {
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
      <DonYourSpaceScreen
        downloadsEnabled={readiness.ok}
        missingDeliverables={readiness.missing}
        showStudioChecklist={session.isOperatorPreview === true}
      />
    </KxdPage>
  );
}