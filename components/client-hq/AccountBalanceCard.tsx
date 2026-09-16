import Link from "next/link";
import type { PortalBillingOverviewCardModel } from "@/lib/portal/billing";

/**
 * Compact Account / Billing overview card.
 * Read-only — no payment-collection action in V1.
 */
export function AccountBalanceCard({
  model,
}: {
  model: PortalBillingOverviewCardModel;
}) {
  const isCurrent = model.accountStatus === "current";

  return (
    <section
      className={`kxd-os-card kxd-os-billing-overview-card${
        isCurrent
          ? " kxd-os-billing-overview-card--current"
          : " kxd-os-billing-overview-card--due"
      }`}
      aria-label="Account billing"
    >
      <div className="kxd-os-billing-overview-card__main">
        <p className="kxd-os-metric__label">
          {isCurrent ? "Account" : "Account balance"}
        </p>
        <p className="kxd-os-billing-overview-card__headline">
          {isCurrent ? model.headline : model.amountLabel}
        </p>
        {!isCurrent ? (
          <p className="kxd-os-billing-overview-card__sub">currently due</p>
        ) : null}
        <p className="kxd-os-meta kxd-os-billing-overview-card__support">
          {model.supportingLabel}
        </p>
        {model.upcomingNote ? (
          <p className="kxd-os-meta kxd-os-billing-overview-card__upcoming">
            {model.upcomingNote}
          </p>
        ) : null}
      </div>

      <div className="kxd-os-billing-overview-card__actions">
        <Link href={model.billingHref} className="kxd-os-btn kxd-os-btn--ghost">
          View Billing
        </Link>
      </div>
    </section>
  );
}
