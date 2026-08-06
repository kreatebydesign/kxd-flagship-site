import Link from "next/link";
import { fmtWorkspaceDate } from "@/lib/executive-client-workspace/theme";
import type { ClientWorkspaceBundle } from "@/lib/client-command/workspace-types";
import { commercialWorkspaceHref } from "@/lib/client-command/commercial/sections";
import { WorkspaceEmpty } from "@/components/admin/operations/client-workspace/WorkspacePrimitives";
import { CommercialStatusBadge, statusTone } from "./CommercialStatusBadge";

export function CommercialAgreements({ data }: { data: ClientWorkspaceBundle }) {
  const rows = data.commercial.agreements;
  const clientId = data.clientId;

  return (
    <div className="kxd-os-commercial-section">
      <div className="kxd-os-commercial-section__toolbar">
        <Link
          href={`/admin/operations/client-command/${clientId}/direct-agreement/new`}
          className="kxd-os-btn"
        >
          Create Direct Agreement
        </Link>
        <Link
          href={commercialWorkspaceHref(clientId, "proposals")}
          className="kxd-os-btn kxd-os-btn--ghost"
        >
          Create From Proposal
        </Link>
      </div>

      {!rows.length ? (
        <WorkspaceEmpty message="No agreements yet. Create a Direct Agreement or convert an accepted proposal." />
      ) : (
        <div className="kxd-os-commercial-card-list">
          {rows.map((row) => (
            <article key={row.id} className="kxd-os-commercial-card">
              <div className="kxd-os-commercial-card__main">
                <div className="kxd-os-commercial-card__title-row">
                  <h3 className="kxd-os-commercial-card__title">{row.title}</h3>
                  <CommercialStatusBadge
                    label={row.statusLabel}
                    tone={statusTone(row.statusLabel)}
                  />
                </div>
                <p className="kxd-os-commercial-card__meta">
                  {row.sourceLabel} · {row.typeLabel} · {row.valueLabel}
                </p>
                <p className="kxd-os-commercial-card__meta">
                  Start {row.serviceStartDate ? fmtWorkspaceDate(row.serviceStartDate) : "—"}
                  {" · "}
                  End {row.serviceEndDate ? fmtWorkspaceDate(row.serviceEndDate) : "—"}
                  {" · "}
                  Created {row.createdAt ? fmtWorkspaceDate(row.createdAt) : "—"}
                  {" · "}
                  Accepted {row.acceptedAt ? fmtWorkspaceDate(row.acceptedAt) : "—"}
                </p>
              </div>
              <div className="kxd-os-commercial-card__actions">
                <Link href={row.href} className="kxd-os-link-quiet">
                  Open
                </Link>
                <Link
                  href={`${row.href}#documents`}
                  className="kxd-os-link-quiet"
                >
                  Versions
                </Link>
                <Link
                  href={commercialWorkspaceHref(clientId, "timeline")}
                  className="kxd-os-link-quiet"
                >
                  Timeline
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
