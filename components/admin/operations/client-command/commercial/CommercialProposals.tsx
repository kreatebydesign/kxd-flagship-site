import Link from "next/link";
import { fmtExecutiveMoney } from "@/lib/executive-client-profile";
import { fmtWorkspaceDate } from "@/lib/executive-client-workspace/theme";
import type { ClientWorkspaceBundle } from "@/lib/client-command/workspace-types";
import {
  WorkspaceEmpty,
  WorkspaceKpiGrid,
} from "@/components/admin/operations/client-workspace/WorkspacePrimitives";
import { CommercialStatusBadge, statusTone } from "./CommercialStatusBadge";

export function CommercialProposals({ data }: { data: ClientWorkspaceBundle }) {
  const snapshot = data.proposals;

  return (
    <div className="kxd-os-commercial-section">
      <WorkspaceKpiGrid
        items={[
          { label: "Open", value: String(snapshot.openCount) },
          { label: "Needs follow-up", value: String(snapshot.pendingFollowUpCount) },
          { label: "Total", value: String(snapshot.proposals.length) },
          {
            label: "Revisions",
            value: String(snapshot.approvals.length),
          },
        ]}
      />

      <div className="kxd-os-commercial-section__toolbar">
        <Link href="/admin/sales/proposals" className="kxd-os-btn kxd-os-btn--ghost">
          Proposal workspace
        </Link>
      </div>

      {!snapshot.proposals.length ? (
        <WorkspaceEmpty message="No proposals for this client." />
      ) : (
        <div className="kxd-os-commercial-card-list">
          {snapshot.proposals.map((row) => (
            <article key={row.id} className="kxd-os-commercial-card">
              <div className="kxd-os-commercial-card__main">
                <div className="kxd-os-commercial-card__title-row">
                  <h3 className="kxd-os-commercial-card__title">{row.title}</h3>
                  <CommercialStatusBadge
                    label={row.displayStatus}
                    tone={statusTone(row.displayStatus)}
                  />
                </div>
                <p className="kxd-os-commercial-card__meta">
                  {row.proposalNumber}
                  {row.oneTimeTotal != null ? ` · ${fmtExecutiveMoney(row.oneTimeTotal)}` : ""}
                  {row.recurringTotal != null
                    ? ` · ${fmtExecutiveMoney(row.recurringTotal)}/mo`
                    : ""}
                </p>
                <p className="kxd-os-commercial-card__meta">
                  Sent {row.sentAt ? fmtWorkspaceDate(row.sentAt) : "—"}
                  {" · "}
                  Expires {row.expiresAt ? fmtWorkspaceDate(row.expiresAt) : "—"}
                </p>
              </div>
              <div className="kxd-os-commercial-card__actions">
                <Link href={row.href} className="kxd-os-link-quiet">
                  Open
                </Link>
                <Link href={row.builderHref} className="kxd-os-link-quiet">
                  Builder
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
