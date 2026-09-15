import { fmtWorkspaceDate } from "@/lib/executive-client-workspace/theme";
import type { ClientWorkspaceBundle } from "@/lib/client-command/workspace-types";
import { WorkspaceEmpty } from "@/components/admin/operations/client-workspace/WorkspacePrimitives";
import { CommercialStatusBadge, statusTone } from "./CommercialStatusBadge";

export function CommercialStatements({ data }: { data: ClientWorkspaceBundle }) {
  const statement = data.commercial.statement;

  if (!statement) {
    return (
      <div className="kxd-os-commercial-section">
        <WorkspaceEmpty message="No commercial ledger is available for a statement yet." />
      </div>
    );
  }

  return (
    <div className="kxd-os-commercial-section">
      <div className="kxd-os-commercial-section__toolbar">
        <div>
          <p className="kxd-os-eyebrow">Account statement</p>
          <p className="kxd-os-commercial-lead">
            Live current account status from the commercial ledger. Download PDF for
            a formal client-facing statement. Generating a statement does not change
            payments, obligations, invoices, or Stripe.
          </p>
        </div>
        <a className="kxd-os-btn" href={statement.pdfHref}>
          Download PDF
        </a>
      </div>

      <header className="kxd-os-commercial-summary-grid kxd-os-commercial-summary-grid--compact">
        <div className="kxd-os-commercial-summary-card">
          <p className="kxd-os-commercial-summary-card__label">Client</p>
          <p className="kxd-os-commercial-summary-card__value">{statement.clientName}</p>
        </div>
        <div className="kxd-os-commercial-summary-card">
          <p className="kxd-os-commercial-summary-card__label">Contact</p>
          <p className="kxd-os-commercial-summary-card__value">
            {statement.contactName || "—"}
          </p>
        </div>
        <div className="kxd-os-commercial-summary-card">
          <p className="kxd-os-commercial-summary-card__label">Statement date</p>
          <p className="kxd-os-commercial-summary-card__value">
            {fmtWorkspaceDate(statement.statementDate)}
          </p>
        </div>
        <div className="kxd-os-commercial-summary-card">
          <p className="kxd-os-commercial-summary-card__label">Agreement</p>
          <p className="kxd-os-commercial-summary-card__value">
            {statement.agreementTitle || "—"}
          </p>
        </div>
      </header>

      <div className="kxd-os-commercial-kpi-grid">
        <div className="kxd-os-commercial-kpi">
          <p className="kxd-os-commercial-kpi__label">
            {statement.summary.originalProjectLabel}
          </p>
          <p className="kxd-os-commercial-kpi__value">
            {statement.summary.originalProjectValue}
          </p>
        </div>
        <div className="kxd-os-commercial-kpi">
          <p className="kxd-os-commercial-kpi__label">
            {statement.summary.accountPaymentsReceivedLabel}
          </p>
          <p className="kxd-os-commercial-kpi__value">
            {statement.summary.accountPaymentsReceivedValue}
          </p>
        </div>
        <div className="kxd-os-commercial-kpi kxd-os-commercial-kpi--emphasize">
          <p className="kxd-os-commercial-kpi__label">
            {statement.summary.totalOutstandingLabel}
          </p>
          <p className="kxd-os-commercial-kpi__value">
            {statement.summary.totalOutstandingValue}
          </p>
        </div>
      </div>

      <section className="kxd-os-commercial-card-list" aria-label="Open balances">
        <h3 className="kxd-os-commercial-card__title">Open balances</h3>
        {!statement.openBalances.length ? (
          <WorkspaceEmpty message="No open balances. Account is current." />
        ) : (
          statement.openBalances.map((row) => (
            <article key={row.id} className="kxd-os-commercial-card">
              <div className="kxd-os-commercial-card__main">
                <div className="kxd-os-commercial-card__title-row">
                  <h4 className="kxd-os-commercial-card__title">{row.description}</h4>
                  <CommercialStatusBadge
                    label={row.statusLabel}
                    tone={statusTone(row.statusLabel)}
                  />
                </div>
                <dl className="kxd-os-commercial-dl kxd-os-commercial-dl--balances">
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
                </dl>
                <p className="kxd-os-commercial-card__meta">
                  {row.dueDate ? `Due ${fmtWorkspaceDate(row.dueDate)}` : "No due date"}
                </p>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="kxd-os-commercial-card-list" aria-label="Payment history">
        <h3 className="kxd-os-commercial-card__title">Payment history</h3>
        {!statement.payments.length ? (
          <WorkspaceEmpty message="No recorded payments on this account yet." />
        ) : (
          statement.payments.map((payment) => (
            <article key={payment.id} className="kxd-os-commercial-card">
              <div className="kxd-os-commercial-card__main">
                <div className="kxd-os-commercial-card__title-row">
                  <h4 className="kxd-os-commercial-card__title">{payment.label}</h4>
                  <p className="kxd-os-commercial-kpi__value">{payment.amountLabel}</p>
                </div>
                <p className="kxd-os-commercial-card__meta">
                  {fmtWorkspaceDate(payment.paidOn)}
                  {payment.detail ? ` · ${payment.detail}` : ""}
                </p>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
