import Link from "next/link";
import { fmtWorkspaceDate } from "@/lib/executive-client-workspace/theme";
import type { ClientWorkspaceBundle } from "@/lib/client-command/workspace-types";
import { formatPaymentMethodLabel } from "@/lib/client-command/commercial/map-agreement";
import { WorkspaceEmpty } from "@/components/admin/operations/client-workspace/WorkspacePrimitives";

export function CommercialAuthorizations({ data }: { data: ClientWorkspaceBundle }) {
  const rows = data.commercial.authorizations;

  return (
    <div className="kxd-os-commercial-section">
      <p className="kxd-os-commercial-lead">
        Operator-friendly authorization history. Methods may include email, phone, signed agreement,
        or manual authorization. Never shows raw card data.
      </p>

      {!rows.length ? (
        <WorkspaceEmpty message="No authorizations recorded." />
      ) : (
        <div className="kxd-os-commercial-card-list">
          {rows.map((row) => (
            <article key={row.id} className="kxd-os-commercial-card">
              <div className="kxd-os-commercial-card__main">
                <h3 className="kxd-os-commercial-card__title">{row.authorizedBy}</h3>
                <p className="kxd-os-commercial-card__meta">
                  {row.method.replace(/-/g, " ")}
                  {" · "}
                  {row.authorizedAt ? fmtWorkspaceDate(row.authorizedAt) : "—"}
                  {" · "}
                  {row.amountLabel}
                </p>
                <p className="kxd-os-commercial-card__meta">
                  {row.agreementTitle}
                  {row.relatedPaymentStatus ? ` · Payment ${row.relatedPaymentStatus}` : ""}
                  {" · "}
                  {formatPaymentMethodLabel(row.cardBrand, row.cardLast4)}
                </p>
                {row.notes ? <p className="kxd-os-commercial-notes">{row.notes}</p> : null}
              </div>
              <div className="kxd-os-commercial-card__actions">
                <Link
                  href={`/admin/operations/client-command/${data.clientId}/commercial/agreements/${row.agreementId}`}
                  className="kxd-os-link-quiet"
                >
                  Related agreement
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
