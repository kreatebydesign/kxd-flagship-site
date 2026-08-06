import Link from "next/link";
import type { ClientWorkspaceBundle } from "@/lib/client-command/workspace-types";
import { formatPaymentMethodLabel } from "@/lib/client-command/commercial/map-agreement";
import { WorkspaceEmpty } from "@/components/admin/operations/client-workspace/WorkspacePrimitives";
import { CommercialStatusBadge, statusTone } from "./CommercialStatusBadge";

export function CommercialPayments({ data }: { data: ClientWorkspaceBundle }) {
  const rows = data.commercial.payments;

  return (
    <div className="kxd-os-commercial-section">
      <p className="kxd-os-commercial-lead">
        Safe Stripe metadata only. Card numbers and CVC are never stored or shown. Live charging is
        not available from this workspace.
      </p>

      {!rows.length ? (
        <WorkspaceEmpty message="No payment records for this client." />
      ) : (
        <div className="kxd-os-commercial-card-list">
          {rows.map((row) => (
            <article key={row.id} className="kxd-os-commercial-card">
              <div className="kxd-os-commercial-card__main">
                <div className="kxd-os-commercial-card__title-row">
                  <h3 className="kxd-os-commercial-card__title">
                    {row.agreementTitle ?? "Payment"}
                  </h3>
                  <CommercialStatusBadge
                    label={row.paymentStatus}
                    tone={statusTone(row.paymentStatus)}
                  />
                </div>
                <p className="kxd-os-commercial-card__meta">
                  Amount {row.amountLabel}
                  {" · "}
                  {formatPaymentMethodLabel(row.cardBrand, row.cardLast4)}
                </p>
                <dl className="kxd-os-commercial-dl">
                  <div>
                    <dt>Customer</dt>
                    <dd>{row.stripeCustomerId ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Invoice</dt>
                    <dd>{row.stripeInvoiceId ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>PaymentIntent</dt>
                    <dd>{row.stripePaymentIntentId ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Charge</dt>
                    <dd>{row.stripeChargeId ?? "—"}</dd>
                  </div>
                </dl>
              </div>
              <div className="kxd-os-commercial-card__actions">
                {row.agreementId ? (
                  <Link
                    href={`/admin/operations/client-command/${data.clientId}/commercial/agreements/${row.agreementId}`}
                    className="kxd-os-link-quiet"
                  >
                    Agreement
                  </Link>
                ) : null}
                {row.receiptUrl ? (
                  <a href={row.receiptUrl} className="kxd-os-link-quiet" target="_blank" rel="noreferrer">
                    Receipt
                  </a>
                ) : null}
                {row.hostedInvoiceUrl ? (
                  <a
                    href={row.hostedInvoiceUrl}
                    className="kxd-os-link-quiet"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Invoice
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
