import { KxdBadge, KxdEmptyState, KxdPage, KxdSection } from "@/components/os";
import type {
  PortalBillingCenterView,
  PortalBillingView,
  PortalLedgerBalanceRow,
  PortalLedgerBillingView,
} from "@/lib/portal/billing";
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

function BalanceRow({ row }: { row: PortalLedgerBalanceRow }) {
  return (
    <li className="kxd-os-billing-card">
      <div className="kxd-os-billing-card__main">
        <div className="kxd-os-billing-card__identity">
          <p className="kxd-os-card__title">{row.description}</p>
          <KxdBadge
            variant={row.statusBadgeVariant}
            className="kxd-os-billing-card__status"
          >
            {row.statusLabel}
          </KxdBadge>
        </div>
        <p
          className="kxd-os-billing-card__amount"
          aria-label={`Remaining ${row.remainingLabel}`}
        >
          {row.remainingLabel}
        </p>
      </div>
      <dl className="kxd-os-billing-card__meta">
        <div>
          <dt>Original</dt>
          <dd>{row.originalLabel}</dd>
        </div>
        <div>
          <dt>Paid</dt>
          <dd>{row.paidLabel}</dd>
        </div>
        <div>
          <dt>Remaining</dt>
          <dd>{row.remainingLabel}</dd>
        </div>
        {row.dueLabel ? (
          <div>
            <dt>Timing</dt>
            <dd>{row.dueLabel}</dd>
          </div>
        ) : null}
      </dl>
    </li>
  );
}

function LedgerReady({ ledger }: { ledger: Extract<PortalLedgerBillingView, { kind: "ready" }> }) {
  return (
    <div className="kxd-os-billing kxd-os-billing--ledger">
      <p className="kxd-os-meta kxd-os-billing__account">
        Account billing for {ledger.clientLabel} · as of {ledger.statementDateLabel}
      </p>

      <section className="kxd-os-billing-summary" aria-label="Billing overview">
        <div className="kxd-os-billing-summary__grid">
          <div className="kxd-os-billing-summary__metric kxd-os-billing-summary__metric--primary">
            <p className="kxd-os-metric__label">{ledger.summary.currentlyDue.label}</p>
            <p className="kxd-os-billing-summary__value">{ledger.summary.currentlyDue.value}</p>
            <p className="kxd-os-meta">{ledger.accountStatusLabel}</p>
          </div>
          <div className="kxd-os-billing-summary__metric">
            <p className="kxd-os-metric__label">{ledger.summary.paidToDate.label}</p>
            <p className="kxd-os-billing-summary__value">{ledger.summary.paidToDate.value}</p>
          </div>
          <div className="kxd-os-billing-summary__metric">
            <p className="kxd-os-metric__label">{ledger.summary.upcoming.label}</p>
            <p className="kxd-os-billing-summary__value kxd-os-billing-summary__value--text">
              {ledger.summary.upcoming.value}
            </p>
          </div>
        </div>

        <div className="kxd-os-billing-summary__actions">
          <a className="kxd-os-btn" href={ledger.statementPdfHref}>
            Download Statement
          </a>
        </div>
      </section>

      <KxdSection label="Currently due">
        {ledger.currentlyDue.length === 0 ? (
          <KxdEmptyState
            title="You're current"
            description="Nothing is currently due on this account."
          />
        ) : (
          <ul className="kxd-os-billing-list">
            {ledger.currentlyDue.map((row) => (
              <BalanceRow key={row.key} row={row} />
            ))}
          </ul>
        )}
      </KxdSection>

      {ledger.upcomingItems.length > 0 ? (
        <KxdSection label="Upcoming">
          <ul className="kxd-os-billing-list">
            {ledger.upcomingItems.map((row) => (
              <BalanceRow key={row.key} row={row} />
            ))}
          </ul>
        </KxdSection>
      ) : null}

      <KxdSection label="Payment history">
        {ledger.paymentHistory.length === 0 ? (
          <KxdEmptyState
            title="No payments recorded yet"
            description="Payments applied to your account will appear here."
          />
        ) : (
          <div className="kxd-os-billing-history">
            <table className="kxd-os-billing-history__table">
              <caption className="sr-only">Payment history</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Description</th>
                  <th scope="col">Method</th>
                  <th scope="col">Amount</th>
                </tr>
              </thead>
              <tbody>
                {ledger.paymentHistory.map((payment) => (
                  <tr key={payment.key}>
                    <td>{payment.paidOnLabel}</td>
                    <td>
                      <span className="kxd-os-billing-history__label">
                        {payment.label}
                      </span>
                      {payment.detail ? (
                        <span className="kxd-os-meta kxd-os-billing-history__detail">
                          {payment.detail}
                        </span>
                      ) : null}
                    </td>
                    <td>{payment.methodLabel || "—"}</td>
                    <td className="kxd-os-billing-history__amount">
                      {payment.amountLabel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </KxdSection>

      <KxdSection label="Statements">
        <div className="kxd-os-billing-statements">
          <p className="kxd-os-body">
            Download your current Account Statement. This uses the same official
            KXD statement format as your commercial records.
          </p>
          <a className="kxd-os-btn kxd-os-btn--ghost" href={ledger.statementPdfHref}>
            Download Current Statement
          </a>
        </div>
      </KxdSection>
    </div>
  );
}

function IssuedInvoicesSection({ invoices }: { invoices: PortalBillingView }) {
  if (invoices.kind !== "ready" || invoices.invoices.length === 0) {
    return null;
  }

  return (
    <KxdSection label="Issued invoices">
      <p className="kxd-os-meta kxd-os-billing__note">
        Stripe-issued invoices for reference. Your account balance above is the
        authoritative KXD ledger.
      </p>
      <ul className="kxd-os-billing-list">
        {invoices.invoices.map((invoice) => (
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
              <p
                className="kxd-os-billing-card__amount"
                aria-label={`Amount due ${invoice.amountDueLabel}`}
              >
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
            </dl>
            {invoice.viewInvoiceUrl ? (
              <div className="kxd-os-billing-card__actions">
                <ExternalBillingLink href={invoice.viewInvoiceUrl}>
                  View invoice
                </ExternalBillingLink>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {invoices.paginationNote ? (
        <p className="kxd-os-meta kxd-os-billing__note">{invoices.paginationNote}</p>
      ) : null}
    </KxdSection>
  );
}

/**
 * Client Billing Center — ledger-first, read-only.
 * Online payment collection is intentionally omitted until multi-obligation
 * Stripe allocation is ready.
 */
export function InvoicesScreen({ view }: { view: PortalBillingCenterView }) {
  const { ledger, invoices } = view;

  const lead =
    ledger.kind === "ready"
      ? ledger.accountStatus === "current"
        ? "Your account is current. Review payment history and download your statement anytime."
        : "A clear view of what is currently due, upcoming, and paid — from your KXD account ledger."
      : ledger.kind === "empty"
        ? "Account balances and payment history will appear here when your commercial agreements are active."
        : "Account billing for your active workspace.";

  return (
    <KxdPage className="kxd-os-page--ops kxd-os-page--billing">
      <ClientHqPageHero eyebrow="Account" title="Billing" lead={lead} />

      {ledger.kind === "unavailable" ? (
        <KxdEmptyState title={ledger.title} description={ledger.description} />
      ) : null}

      {ledger.kind === "empty" ? (
        <>
          <KxdEmptyState title={ledger.title} description={ledger.description} />
          <IssuedInvoicesSection invoices={invoices} />
        </>
      ) : null}

      {ledger.kind === "ready" ? (
        <>
          <LedgerReady ledger={ledger} />
          <IssuedInvoicesSection invoices={invoices} />
          <p className="kxd-os-meta kxd-os-billing__footnote">
            Balances and payment history come from your KXD commercial ledger.
            Online payment collection will appear here when enabled for your account.
          </p>
        </>
      ) : null}
    </KxdPage>
  );
}
