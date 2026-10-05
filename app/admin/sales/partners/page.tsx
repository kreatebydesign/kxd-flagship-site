import Link from "next/link";
import {
  operatorGetPolicy,
  operatorListBookings,
  operatorListEarnings,
  operatorListPartnerReferrals,
} from "@/lib/portal/partner/operator";
import { getGoogleCalendarConnectionStatus } from "@/lib/google/calendar";
import { PartnerOperatorDesk } from "@/components/admin/sales/PartnerOperatorDesk";

export const dynamic = "force-dynamic";

export default async function PartnerOperatorPage() {
  const [referrals, bookings, earnings, policy] = await Promise.all([
    operatorListPartnerReferrals(75),
    operatorListBookings(40),
    operatorListEarnings(40),
    operatorGetPolicy(),
  ]);
  const calendar = getGoogleCalendarConnectionStatus();

  return (
    <div className="kxd-os-app" style={{ padding: "1.5rem" }}>
      <p style={{ margin: 0, opacity: 0.7, fontSize: "0.8rem" }}>
        <Link href="/admin/sales">Sales</Link> / Partners
      </p>
      <h1 style={{ margin: "0.5rem 0 0.35rem", fontSize: "1.75rem" }}>
        Partner desk
      </h1>
      <p style={{ margin: "0 0 1.25rem", maxWidth: "40rem", opacity: 0.75 }}>
        Review partner referrals, update partner-safe status, manage earnings
        ledger entries, and inspect bookings. Partners never see this surface.
      </p>
      <PartnerOperatorDesk
        referrals={referrals.map((r) => ({
          id: Number(r.id),
          businessName: String(r.businessName ?? ""),
          contactName: String(r.contactName ?? ""),
          partnerVisibilityState: String(r.partnerVisibilityState ?? "submitted"),
          sourcedByPartnerName: String(r.sourcedByPartnerName ?? ""),
          partnerId:
            typeof r.sourcedByPartner === "number"
              ? r.sourcedByPartner
              : r.sourcedByPartner?.id
                ? Number(r.sourcedByPartner.id)
                : null,
          promotedSalesLeadId:
            typeof r.promotedSalesLead === "number"
              ? r.promotedSalesLead
              : r.promotedSalesLead?.id
                ? Number(r.promotedSalesLead.id)
                : null,
          internalNotes: r.internalNotes ? String(r.internalNotes) : null,
          createdAt: String(r.createdAt ?? ""),
        }))}
        bookings={bookings.map((b) => ({
          id: Number(b.id),
          status: String(b.status ?? ""),
          bookingMode: String(b.bookingMode ?? "request"),
          partnerName: String(b.sourcedByPartnerName ?? ""),
          preferredTimes: b.preferredTimes ? String(b.preferredTimes) : null,
          slotStart: b.slotStart ? String(b.slotStart) : null,
          hasGoogleEvent: Boolean(b.googleEventId),
          createdAt: String(b.createdAt ?? ""),
        }))}
        earnings={earnings.map((e) => ({
          id: Number(e.id),
          relatedBusinessName: String(e.relatedBusinessName ?? ""),
          earningType: String(e.earningType ?? ""),
          amountCents: Number(e.amountCents ?? 0),
          paymentStatus: String(e.paymentStatus ?? "pending_approval"),
          partnerId:
            typeof e.partner === "number"
              ? e.partner
              : e.partner?.id
                ? Number(e.partner.id)
                : null,
        }))}
        policy={{
          projectRateBps: policy.projectRateBps,
          monthlyRateBps: policy.monthlyRateBps,
          monthlyBonusMonths: policy.monthlyBonusMonths,
          retentionKickerEnabled: policy.retentionKickerEnabled,
          retentionKickerRateBps: policy.retentionKickerRateBps,
          retentionKickerMonth: policy.retentionKickerMonth,
          performanceBonusAmountCents: policy.performanceBonusAmountCents,
          performanceBonusProjectCount: policy.performanceBonusProjectCount,
          performanceBonusWindowDays: policy.performanceBonusWindowDays,
          eligibleRecurringServices: policy.eligibleRecurringServices.join("\n"),
        }}
        calendar={{
          configured: calendar.configured,
          connected: calendar.connected,
          writeEnabled: calendar.writeEnabled,
          missingEnv: calendar.missingEnv,
        }}
      />
    </div>
  );
}
