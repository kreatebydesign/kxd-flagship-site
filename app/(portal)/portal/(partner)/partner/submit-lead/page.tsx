import { redirect } from "next/navigation";
import { PartnerLeadForm } from "@/components/partner";
import { getPartnerSession } from "@/lib/portal/partner/access";

export const dynamic = "force-dynamic";

export default async function PartnerSubmitLeadPage() {
  const session = await getPartnerSession();
  if (!session) redirect("/portal/login");

  return (
    <div className="kxd-partner-page kxd-partner-page--narrow">
      <p className="kxd-partner-network">KXD Network · Private access</p>
      <h1 className="kxd-partner-title">Bring an introduction</h1>
      <p className="kxd-partner-lead">
        One clean handoff: the business, the opportunity, and how to reach the
        person who can decide.
      </p>
      <PartnerLeadForm partnerId={session.partnerId} />
    </div>
  );
}
