import { redirect } from "next/navigation";
import { PartnerLeadForm } from "@/components/partner";
import { getPartnerSession } from "@/lib/portal/partner/access";

export const dynamic = "force-dynamic";

export default async function PartnerSubmitLeadPage() {
  const session = await getPartnerSession();
  if (!session) redirect("/portal/login");

  return (
    <div className="kxd-partner-page kxd-partner-page--narrow">
      <p className="kxd-partner-eyebrow">Handoff</p>
      <h1 className="kxd-partner-title">Submit a lead</h1>
      <span className="kxd-partner-hairline" aria-hidden="true" />
      <p className="kxd-partner-lead">
        Give KXD a clean introduction — business, opportunity, and how to reach
        the decision maker. Quality beats volume.
      </p>
      <PartnerLeadForm />
    </div>
  );
}
