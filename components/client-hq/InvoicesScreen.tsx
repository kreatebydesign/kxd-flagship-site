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

function StatusMark({
  label,
  tone,
}: {
  label: string;
  tone: PortalLedgerBalanceRow["statusTone"];
}) {
  return (
    <span className={`kxd-os-billing-status kxd-os-billing-status--${tone}`}>
      {label}
    </span>
  );
}

function CurrentlyDueRow({ row }: { row: PortalLedgerBalanceRow }) {
  return (
    <li className="kxd-os-billing-card kxd-os-billing-card--due">
      <div className="kxd-os-billing-card__main">
        <div className="kxd-os-billing-card__identity">
          <p className="kxd-os-billing-card__title">{row.description}</p>
          {row.statusLabel === "Partially Paid" ||
          row.statusLabel === "Past Due" ? (
            <StatusMark label={row.statusLabel} tone={row.statusTone} />
          ) : null}
        </div>
        <p
          className="kxd-os-billing-card__amount"
          aria-label={`${row.remainingLabel} due`}
        >
          <span className="kxd-os-billing-card__amount-value">
            {row.remainingLabel}
          </span>
          <span className="kxd-os-billing-card__amount-suffix">due</span>
        </p>
      </div>
      <p className="kxd-os-billing-card__detail">
        {row.showPaidDetail ? (
          <>
            <span>Original {row.originalLabel}</span>
            <span aria-hidden="true"> · </span>
            <span>Paid {row.paidLabel}</span>
          </>
        ) : null}
        {row.showPaidDetail && row.dueLabel ? (
          <span aria-hidden="true"> · </span>
        ) : null}
        {row.dueLabel ? <span>{row.dueLabel}</span> : null}
      </p>
    </li>
  );
}

function UpcomingRow({ row }: { row: PortalLedgerBalanceRow }) {
  return (
    <li className="kxd-os-billing-card kxd-os-billing-card--upcoming">
      <div className="kxd-os-billing-card__main">
        <div className="kxd-os-billing-card__identity">
          <p className="kxd-os-billing-card__title">{row.description}</p>
          <StatusMark label="Upcoming" tone="upcoming" />
        </div>
        <p
          className="kxd-os-billing-card__amount kxd-os-billing-card__amount--quiet"
          aria-label={row.remainingLabel}
        >
          {row.remainingLabel}
        </p>
      </div>
      {row.dueLabel ? (
        <p className="kxd-os-billing-card__detail">{row.dueLabel}</p>
      ) : null}
    </li>
  );
}

function LedgerReady({
  ledger,
}: {
  ledger: Extract<PortalLedgerBillingView, { kind: "ready" }>;
}) {
  return (
    <div className="kxd-os-billing kxd-os-billing--ledger">
      <p className="kxd-os-meta kxd-os-billing__account">
        {ledger.clientLabel} · as of {ledger.statementDateLabel}
      </p>

      <section className="kxd-os-billing-summary" aria-label="Account overview">
        <p className="kxd-os-eyebrow">Account overview</p>

        <div className="kxd-os-billing-summary__balance">
          <p className="kxd-os-metric__label">{ledger.summary.currentBalance.label}</p>
          <p className="kxd-os-billing-summary__value">
            {ledger.summary.currentBalance.value}
          </p>
          <p className="kxd-os-billing-summary__status">
            {ledger.accountStatus === "current"
              ? "You're current"
              : "Amount currently due"}
          </p>
        </div>

        <div className="kxd-os-billing-summary__secondary">
          <div className="kxd-os-billing-summary__upcoming">
            <p className="kxd-os-metric__label">{ledger.summary.upcoming.label}</p>
            <p className="kxd-os-billing-summary__upcoming-value">
              {ledger.summary.upcoming.value}
            </p>
          </div>
          <div className="kxd-os-billing-summary__actions">
            <a className="kxd-os-btn" href={ledger.statementPdfHref}>
              Download Statement
            </a>
          </div>
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
              <CurrentlyDueRow key={row.key} row={row} />
            ))}
          </ul>
        )}
      </KxdSection>

      {ledger.upcomingItems.length > 0 ? (
        <KxdSection label="Upcoming">
          <p className="kxd-os-meta kxd-os-billing__section-note">
            These charges are not currently due.
          </p>
          <ul className="kxd-os-billing-list">
            {ledger.upcomingItems.map((row) => (
              <UpcomingRow key={row.key} row={row} />
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
                <p className="kxd-os-billing-card__title">{invoice.displayNumber}</p>
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
        : "See what is currently due, what is coming next, and download your statement."
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
