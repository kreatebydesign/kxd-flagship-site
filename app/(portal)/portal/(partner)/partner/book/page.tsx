import { redirect } from "next/navigation";
import { PartnerSlotBookingForm } from "@/components/partner";
import { partnerDisplayBusinessName } from "@/components/partner/leadPresentation";
import { getPartnerSession } from "@/lib/portal/partner/access";
import { listPartnerReferrals } from "@/lib/portal/partner/referrals";

export const dynamic = "force-dynamic";

export default async function PartnerBookPage({
  searchParams,
}: {
  searchParams: Promise<{ referral?: string | string[] }>;
}) {
  const session = await getPartnerSession();
  if (!session) redirect("/portal/login");

  const params = await searchParams;
  const raw = Array.isArray(params.referral) ? params.referral[0] : params.referral;
  const referralId = raw ? Number(raw) : undefined;
  const leads = await listPartnerReferrals(session.partnerId);
  const referralOptions = leads.map((l) => ({
    id: l.id,
    businessName: partnerDisplayBusinessName(l.businessName),
  }));
  const selected =
    referralId && Number.isFinite(referralId) && referralId > 0
      ? leads.find((l) => l.id === referralId)
      : undefined;

  return (
    <div className="kxd-partner-page kxd-partner-page--narrow">
      <p className="kxd-partner-eyebrow">Private discovery</p>
      <h1 className="kxd-partner-title">Book KXD in</h1>
      <span className="kxd-partner-hairline" aria-hidden="true" />
      <p className="kxd-partner-lead">
        Reserve a 30-minute discovery session with Matt / KXD for a specific
        introduction. You open the door — we run the call.
      </p>
      {selected ? (
        <p className="kxd-partner-note" style={{ marginTop: "1rem" }}>
          Booking for{" "}
          <strong style={{ color: "var(--kxd-partner-ivory)" }}>
            {partnerDisplayBusinessName(selected.businessName)}
          </strong>
          .
        </p>
      ) : null}

      <div className="kxd-partner-book-panel">
        <h2 className="kxd-partner-book-panel__title">Request the session</h2>
        <PartnerSlotBookingForm
          referralId={
            referralId && Number.isFinite(referralId) && referralId > 0
              ? referralId
              : undefined
          }
          referralOptions={referralOptions}
        />
      </div>

      <div className="kxd-partner-book-after">
        <h2 className="kxd-partner-section__title">What happens next</h2>
        <ol>
          <li>You choose the referral and preferred window.</li>
          <li>KXD confirms the discovery on the studio calendar.</li>
          <li>You stay attributed — the close stays with KXD.</li>
        </ol>
      </div>
    </div>
  );
}
