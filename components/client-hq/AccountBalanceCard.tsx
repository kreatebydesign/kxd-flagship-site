import Link from "next/link";
import type { PortalBillingOverviewCardModel } from "@/lib/portal/billing";

/**
 * Compact Account / Billing overview card.
 * Read-only — no payment-collection action in V1.
 * Presentation-only: never shows lifetime paid-to-date totals.
 */
export function AccountBalanceCard({
  model,
}: {
  model: PortalBillingOverviewCardModel;
}) {
  return (
    <section
      className="kxd-os-card kxd-os-billing-overview-card"
      aria-label="Account billing"
    >
      <div className="kxd-os-billing-overview-card__main">
        <p className="kxd-os-metric__label">Account balance</p>
        <p className="kxd-os-billing-overview-card__headline">{model.amountLabel}</p>
        <p className="kxd-os-billing-overview-card__sub">{model.statusLine}</p>
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
