import { KxdBadge, KxdEmptyState, KxdPage } from "@/components/os";
import type { PortalBillingView } from "@/lib/portal/billing";
import { ClientHqPageHero } from "./ClientHqPageHero";

function ExternalBillingLink({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="kxd-os-billing-link"
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/**
 * Phase 5 Batch 5C — Client Billing visibility.
 * Read-only Stripe invoice list from Batch 5B projection. No local payment forms.
 */
export function InvoicesScreen({ view }: { view: PortalBillingView }) {
  return (
    <KxdPage className="kxd-os-page--ops kxd-os-page--billing">
      <ClientHqPageHero
        eyebrow="Account"
        title="Billing"
        lead={
          view.kind === "ready"
            ? "Invoices for your active account. Pay open invoices securely through Stripe."
            : view.kind === "empty"
              ? "Invoices for your active account will appear here when issued."
              : "A calm account view for invoices and Stripe-hosted payment."
        }
      />

      {view.kind === "unavailable" ? (
        <KxdEmptyState title={view.title} description={view.description} />
      ) : null}

      {view.kind === "empty" ? (
        <KxdEmptyState title={view.title} description={view.description} />
      ) : null}

      {view.kind === "ready" ? (
        <div className="kxd-os-billing">
          <p className="kxd-os-meta kxd-os-billing__account">
            Showing invoices for {view.clientLabel}
          </p>

          <ul className="kxd-os-billing-list">
            {view.invoices.map((invoice) => (
              <li key={invoice.key} className="kxd-os-billing-card">
                <div className="kxd-os-billing-card__main">
                  <div className="kxd-os-billing-card__identity">
                    <p className="kxd-os-card__title">{invoice.displayNumber}</p>
                    <KxdBadge
                      variant={invoice.badgeVariant}
                      className="kxd-os-billing-card__status"
                    >
                      <span aria-label={invoice.statusAriaLabel}>
                        {invoice.statusLabel}
                      </span>
                    </KxdBadge>
                  </div>

                  <p className="kxd-os-billing-card__amount" aria-label={`Amount due ${invoice.amountDueLabel}`}>
                    {invoice.amountDueLabel}
                  </p>
                </div>

                <dl className="kxd-os-billing-card__meta">
                  {invoice.createdLabel ? (
                    <div>
                      <dt>Created</dt>
                      <dd>{invoice.createdLabel}</dd>
                    </div>
                  ) : null}
                  {invoice.dueLabel ? (
                    <div>
                      <dt>Due</dt>
                      <dd>{invoice.dueLabel}</dd>
                    </div>
                  ) : null}
                  {invoice.paidLabel ? (
                    <div>
                      <dt>Paid</dt>
                      <dd>{invoice.paidLabel}</dd>
                    </div>
                  ) : null}
                  {invoice.amountPaidLabel ? (
                    <div>
                      <dt>Amount paid</dt>
                      <dd>{invoice.amountPaidLabel}</dd>
                    </div>
                  ) : null}
                  {invoice.amountRemainingLabel ? (
                    <div>
                      <dt>Remaining</dt>
                      <dd>{invoice.amountRemainingLabel}</dd>
                    </div>
                  ) : null}
                </dl>

                {(invoice.viewInvoiceUrl || invoice.payUrl) && (
                  <div className="kxd-os-billing-card__actions">
                    {invoice.viewInvoiceUrl ? (
                      <ExternalBillingLink href={invoice.viewInvoiceUrl}>
                        View invoice
                      </ExternalBillingLink>
                    ) : null}
                    {invoice.payUrl ? (
                      <ExternalBillingLink href={invoice.payUrl}>
                        Pay securely through Stripe
                      </ExternalBillingLink>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {view.paginationNote ? (
            <p className="kxd-os-meta kxd-os-billing__note">{view.paginationNote}</p>
          ) : null}

          <p className="kxd-os-meta kxd-os-billing__footnote">
            Payments are completed on Stripe’s secure hosted pages. KXD OS does not
            collect card or bank details in this workspace.
          </p>
        </div>
      ) : null}
    </KxdPage>
  );
}
