import Link from "next/link";
import { fmtWorkspaceDate } from "@/lib/executive-client-workspace/theme";
import type { ClientWorkspaceBundle } from "@/lib/client-command/workspace-types";
import { WorkspaceEmpty } from "@/components/admin/operations/client-workspace/WorkspacePrimitives";

export function CommercialReceipts({ data }: { data: ClientWorkspaceBundle }) {
  const rows = data.commercial.receipts;

  return (
    <div className="kxd-os-commercial-section">
      {!rows.length ? (
        <WorkspaceEmpty message="No receipts on file." />
      ) : (
        <div className="kxd-os-commercial-card-list">
          {rows.map((row) => (
            <article key={row.id} className="kxd-os-commercial-card">
              <div className="kxd-os-commercial-card__main">
                <h3 className="kxd-os-commercial-card__title">{row.title}</h3>
                <p className="kxd-os-commercial-card__meta">
                  {row.amountLabel}
                  {" · "}
                  {row.date ? fmtWorkspaceDate(row.date) : "—"}
                  {row.stripeChargeId ? ` · ${row.stripeChargeId}` : ""}
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
                {row.receiptUrl ? (
                  <a href={row.receiptUrl} className="kxd-os-link-quiet" target="_blank" rel="noreferrer">
                    Open receipt
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
