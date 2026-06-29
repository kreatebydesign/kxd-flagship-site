"use client";

import Link from "next/link";
import { fmtExecutiveMoney } from "@/lib/executive-client-profile";
import { fmtWorkspaceDate } from "@/lib/executive-client-workspace/theme";
import { formatProposalActionLabel, formatProposalTypeLabel } from "@/lib/executive-proposals/client";
import type { ClientWorkspaceBundle } from "@/lib/client-command/workspace-types";
import {
  WorkspaceChapter,
  WorkspaceEmpty,
  WorkspaceKpiGrid,
  WorkspaceMetaLine,
} from "@/components/admin/operations/client-workspace/WorkspacePrimitives";

function fmtMoney(n: number | null): string {
  if (n == null) return "—";
  return fmtExecutiveMoney(n);
}

export function ClientProposalsPanel({ data }: { data: ClientWorkspaceBundle }) {
  const snapshot = data.proposals;
  const current = snapshot.current;

  return (
    <div className="kxd-os-proposals">
      <header className="kxd-os-proposals__hero">
        <div>
          <p className="kxd-os-eyebrow">Executive sales</p>
          <h2 className="kxd-os-proposals__title">Proposals & estimates</h2>
          <p className="kxd-os-proposals__lead">
            Live pipeline for this client — status, investment, approvals, and revision history.
          </p>
        </div>
        <Link
          href={`/admin/sales/proposals/new?client=${data.clientId}`}
          className="kxd-os-command-timeline-actions__btn kxd-os-command-timeline-actions__btn--primary"
        >
          New proposal
        </Link>
      </header>

      <WorkspaceKpiGrid
        items={[
          { label: "Open", value: String(snapshot.openCount) },
          { label: "Needs follow-up", value: String(snapshot.pendingFollowUpCount) },
          { label: "Total proposals", value: String(snapshot.proposals.length) },
          { label: "Revisions logged", value: String(snapshot.approvals.length) },
        ]}
      />

      {current ? (
        <WorkspaceChapter title="Current proposal" variant="compact">
          <div className="kxd-os-proposals__current">
            <div className="kxd-os-proposals__current-head">
              <Link href={current.href} className="kxd-os-proposals__current-title">
                {current.title}
              </Link>
              <span className="kxd-os-workspace-badge">{current.displayStatus}</span>
            </div>
            <div className="kxd-os-proposals__current-meta">
              <span>{current.proposalNumber}</span>
              {current.proposalType ? <span>{formatProposalTypeLabel(current.proposalType)}</span> : null}
              <span>Rev {current.revisionNumber}</span>
            </div>
            <div className="kxd-os-proposals__current-amounts">
              <span>One-time {fmtMoney(current.oneTimeTotal)}</span>
              <span>Monthly {fmtMoney(current.recurringTotal)}</span>
              {current.projectedAnnualValue != null ? (
                <span>Annual {fmtMoney(current.projectedAnnualValue)}</span>
              ) : null}
            </div>
            <WorkspaceMetaLine
              label="Last viewed"
              value={current.lastViewedAt ? fmtWorkspaceDate(current.lastViewedAt) : "—"}
            />
            <WorkspaceMetaLine label="Sent" value={current.sentAt ? fmtWorkspaceDate(current.sentAt) : "—"} />
            <WorkspaceMetaLine
              label="Expires"
              value={current.expiresAt ? fmtWorkspaceDate(current.expiresAt) : "—"}
            />
            <WorkspaceMetaLine label="Approval" value={current.approvalStatus ?? "—"} />
            <Link href={current.builderHref} className="kxd-os-link-quiet kxd-os-workspace-inline-link">
              Open builder →
            </Link>
          </div>
        </WorkspaceChapter>
      ) : (
        <WorkspaceChapter title="Current proposal" variant="compact">
          <WorkspaceEmpty message="No open proposal — create one from the sales builder." />
        </WorkspaceChapter>
      )}

      {data.proposalIntelligence.signals.length > 0 ? (
        <WorkspaceChapter title="Proposal intelligence" variant="compact">
          <ul className="kxd-os-proposals-intel">
            {data.proposalIntelligence.signals.map((signal) => (
              <li key={signal.id} className="kxd-os-proposals-intel__item">
                <div>
                  <strong>{signal.label}</strong>
                  <p className="kxd-os-proposals-intel__reason">{signal.reason}</p>
                </div>
                {signal.href ? (
                  <Link href={signal.href} className="kxd-os-link-quiet">Review →</Link>
                ) : null}
              </li>
            ))}
          </ul>
        </WorkspaceChapter>
      ) : null}

      <WorkspaceChapter title="Proposal history" variant="compact">
        {snapshot.proposals.length === 0 ? (
          <WorkspaceEmpty message="No proposals on file for this client." />
        ) : (
          <ul className="kxd-os-proposals-list">
            {snapshot.proposals.map((row) => (
              <li key={row.id} className="kxd-os-proposals-list__item">
                <Link href={row.href} className="kxd-os-proposals-list__title">
                  {row.title}
                </Link>
                <div className="kxd-os-proposals-list__meta">
                  <span className="kxd-os-workspace-badge">{row.displayStatus}</span>
                  <span>{fmtMoney(row.oneTimeTotal)}</span>
                  {row.recurringTotal != null ? <span>{fmtMoney(row.recurringTotal)}/mo</span> : null}
                  {row.lastViewedAt ? <span>Viewed {fmtWorkspaceDate(row.lastViewedAt)}</span> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </WorkspaceChapter>

      <WorkspaceChapter title="Revision history" variant="compact">
        {snapshot.approvals.length === 0 ? (
          <WorkspaceEmpty message="No approval or revision events yet." />
        ) : (
          <ul className="kxd-os-proposals-approvals">
            {snapshot.approvals.map((row) => (
              <li key={row.id} className="kxd-os-proposals-approvals__item">
                <span className="kxd-os-workspace-badge">{formatProposalActionLabel(row.action)}</span>
                <span>Rev {row.revisionNumber}</span>
                {row.actorName ? <span>{row.actorName}</span> : null}
                <span>{fmtWorkspaceDate(row.occurredAt)}</span>
                {row.notes ? <p className="kxd-os-proposals-approvals__notes">{row.notes}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </WorkspaceChapter>
    </div>
  );
}
