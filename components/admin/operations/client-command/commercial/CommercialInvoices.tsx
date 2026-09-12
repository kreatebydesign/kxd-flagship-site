"use client";

import { useState } from "react";
import Link from "next/link";
import { fmtWorkspaceDate } from "@/lib/executive-client-workspace/theme";
import type { ClientWorkspaceBundle } from "@/lib/client-command/workspace-types";
import { WorkspaceEmpty } from "@/components/admin/operations/client-workspace/WorkspacePrimitives";
import { CommercialStatusBadge, statusTone } from "./CommercialStatusBadge";
import { RecordObligationPaymentForm } from "./RecordObligationPaymentForm";
import { RegisterRecurringDueForm } from "./RegisterRecurringDueForm";
import { EnsureRecurringThroughDateForm } from "./EnsureRecurringThroughDateForm";

export function CommercialInvoices({ data }: { data: ClientWorkspaceBundle }) {
  const rows = data.commercial.invoices;
  const targets = data.commercial.obligationPaymentTargets ?? [];
  const recurringTargets = data.commercial.recurringServiceTargets ?? [];
  const [recordFor, setRecordFor] = useState<{
    obligationId: string;
    agreementId: number;
  } | null>(null);

  return (
    <div className="kxd-os-commercial-section">
      <p className="kxd-os-commercial-lead">
        Billing obligations with original amount, paid, and remaining balance. Record external
        payments here — including partial Cash App payments — without creating Stripe charges.
        Register recurring due periods without creating Stripe subscriptions.
      </p>

      <RecordObligationPaymentForm
        key={recordFor ? `row-${recordFor.obligationId}` : "section"}
        clientId={data.clientId}
        targets={targets}
        invoices={rows}
        initialObligationId={recordFor?.obligationId}
        initialAgreementId={recordFor?.agreementId}
        onClose={recordFor ? () => setRecordFor(null) : undefined}
      />

      <RegisterRecurringDueForm clientId={data.clientId} targets={recurringTargets} />
      <EnsureRecurringThroughDateForm
        clientId={data.clientId}
        targets={recurringTargets}
      />

      {!rows.length ? (
        <WorkspaceEmpty message="No invoices linked for this client." />
      ) : (
        <div className="kxd-os-commercial-card-list">
          {rows.map((row) => (
            <article key={row.id} className="kxd-os-commercial-card">
              <div className="kxd-os-commercial-card__main">
                <div className="kxd-os-commercial-card__title-row">
                  <h3 className="kxd-os-commercial-card__title">{row.title}</h3>
                  <CommercialStatusBadge
                    label={row.statusLabel ?? row.status}
                    tone={statusTone(row.statusLabel ?? row.status)}
                  />
                </div>
                <dl className="kxd-os-commercial-dl kxd-os-commercial-dl--balances">
                  <div>
                    <dt>Original</dt>
                    <dd>{row.amountLabel}</dd>
                  </div>
                  <div>
                    <dt>Paid</dt>
                    <dd>{row.amountPaidLabel ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Remaining</dt>
                    <dd>{row.remainingLabel ?? "—"}</dd>
                  </div>
                </dl>
                <p className="kxd-os-commercial-card__meta">
                  {row.triggerLabel ? `${row.triggerLabel} · ` : ""}
                  {row.dueDate
                    ? `Due ${fmtWorkspaceDate(row.dueDate)}`
                    : row.date
                      ? fmtWorkspaceDate(row.date)
                      : "—"}
                  {row.stripeInvoiceId ? ` · ${row.stripeInvoiceId}` : ""}
                </p>
                {row.serviceDescription ? (
                  <p className="kxd-os-commercial-card__description">
                    <span className="kxd-os-commercial-card__description-label">
                      Service description
                    </span>
                    {row.serviceDescription}
                  </p>
                ) : null}
                {row.internalNotes ? (
                  <p className="kxd-os-commercial-card__internal-notes">
                    <span className="kxd-os-commercial-card__description-label">
                      Internal notes
                    </span>
                    {row.internalNotes}
                  </p>
                ) : null}
                {row.paymentHistory?.length ? (
                  <div className="kxd-os-commercial-payment-history">
                    <p className="kxd-os-commercial-payment-history__label">Payment history</p>
                    <ul>
                      {row.paymentHistory.map((event) => (
                        <li key={event.id}>
                          {event.paidAt.slice(0, 10)} · {event.method} · {event.amountLabel}
                          {event.externalReference ? ` · ${event.externalReference}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
              <div className="kxd-os-commercial-card__actions">
                {row.canRecordPayment && row.obligationId && row.agreementId ? (
                  <button
                    type="button"
                    className="kxd-os-link-quiet"
                    onClick={() =>
                      setRecordFor({
                        obligationId: row.obligationId!,
                        agreementId: row.agreementId!,
                      })
                    }
                  >
                    Record Payment
                  </button>
                ) : null}
                {row.agreementId ? (
                  <Link
                    href={`/admin/operations/client-command/${data.clientId}/commercial/agreements/${row.agreementId}`}
                    className="kxd-os-link-quiet"
                  >
                    Agreement
                  </Link>
                ) : null}
                {row.hostedInvoiceUrl ? (
                  <a
                    href={row.hostedInvoiceUrl}
                    className="kxd-os-link-quiet"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open invoice
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
