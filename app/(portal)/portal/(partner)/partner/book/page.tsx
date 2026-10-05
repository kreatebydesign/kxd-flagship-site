import { redirect } from "next/navigation";
import { PartnerSlotBookingForm } from "@/components/partner";
import {
  formatPartnerBookingReferralLabel,
  partnerDisplayBusinessName,
} from "@/components/partner/leadPresentation";
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
  const labeled = leads.map((l) => ({
    id: l.id,
    label: formatPartnerBookingReferralLabel({
      id: l.id,
      businessName: partnerDisplayBusinessName(l.businessName),
      contactName: l.contactName,
      submittedAt: l.submittedAt,
    }),
  }));
  const labelCounts = new Map<string, number>();
  for (const item of labeled) {
    labelCounts.set(item.label, (labelCounts.get(item.label) ?? 0) + 1);
  }
  const referralOptions = labeled.map((item) =>
    (labelCounts.get(item.label) ?? 0) > 1
      ? { id: item.id, label: `${item.label} · #${item.id}` }
      : item,
  );
  const selected =
    referralId && Number.isFinite(referralId) && referralId > 0
      ? referralOptions.find((l) => l.id === referralId)
      : undefined;

  return (
    <div className="kxd-partner-page kxd-partner-page--narrow">
      <p className="kxd-partner-network">KXD Network</p>
      <h1 className="kxd-partner-title">Book KXD in</h1>
      <p className="kxd-partner-lead">
        You open the door. KXD runs the call. Reserve discovery for one
        specific introduction.
      </p>
      {selected ? (
        <p className="kxd-partner-book-context">
          Booking for <strong>{selected.label}</strong>.
        </p>
      ) : null}

      <div className="kxd-partner-book-panel">
        <h2 className="kxd-partner-book-panel__title">Choose a time</h2>
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
