import Link from "next/link";
import { fmtWorkspaceDate } from "@/lib/executive-client-workspace/theme";
import type { ClientWorkspaceBundle } from "@/lib/client-command/workspace-types";
import { WorkspaceEmpty } from "@/components/admin/operations/client-workspace/WorkspacePrimitives";
import { CommercialStatusBadge, statusTone } from "./CommercialStatusBadge";

export function CommercialInvoices({ data }: { data: ClientWorkspaceBundle }) {
  const rows = data.commercial.invoices;

  return (
    <div className="kxd-os-commercial-section">
      {!rows.length ? (
        <WorkspaceEmpty message="No invoices linked for this client." />
      ) : (
        <div className="kxd-os-commercial-card-list">
          {rows.map((row) => (
            <article key={row.id} className="kxd-os-commercial-card">
              <div className="kxd-os-commercial-card__main">
                <div className="kxd-os-commercial-card__title-row">
                  <h3 className="kxd-os-commercial-card__title">{row.title}</h3>
                  <CommercialStatusBadge label={row.status} tone={statusTone(row.status)} />
                </div>
                <p className="kxd-os-commercial-card__meta">
                  {row.amountLabel}
                  {" · "}
                  {row.date ? fmtWorkspaceDate(row.date) : "—"}
                  {row.stripeInvoiceId ? ` · ${row.stripeInvoiceId}` : ""}
                </p>
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
