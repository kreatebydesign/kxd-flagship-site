"use client";

import Link from "next/link";
import { fmtExecutiveMoney } from "@/lib/executive-client-profile";
import { fmtWorkspaceDate } from "@/lib/executive-client-workspace/theme";
import {
  displayConversionStatus,
  displayLaunchStatus,
  formatConversionMode,
} from "@/lib/proposal-conversion/client";
import { displayContractStatus } from "@/lib/contracts/client";
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

export function ClientContractsPanel({ data }: { data: ClientWorkspaceBundle }) {
  const snapshot = data.contracts;
  const current = snapshot.current;

  return (
    <div className="kxd-os-contracts">
      <header className="kxd-os-contracts__hero">
        <div>
          <p className="kxd-os-eyebrow">Executive legal</p>
          <h2 className="kxd-os-contracts__title">Contracts & conversion</h2>
          <p className="kxd-os-contracts__lead">
            Service agreements, signature status, proposal conversion history, and launch queue.
          </p>
        </div>
      </header>

      <WorkspaceKpiGrid
        items={[
          { label: "Active contracts", value: String(snapshot.contracts.length) },
          { label: "Awaiting signature", value: String(snapshot.unsignedCount) },
          { label: "Signed", value: String(snapshot.signedCount) },
          { label: "Conversions", value: String(snapshot.conversions.length) },
        ]}
      />

      {current ? (
        <WorkspaceChapter title="Current contract" variant="compact">
          <div className="kxd-os-contracts__current">
            <div className="kxd-os-contracts__current-head">
              <span className="kxd-os-contracts__current-title">{current.title}</span>
              <span className="kxd-os-workspace-badge">{current.displayStatus}</span>
            </div>
            {current.contractType ? (
              <WorkspaceMetaLine label="Type" value={current.contractType.replace(/-/g, " ")} />
            ) : null}
            <div className="kxd-os-contracts__current-amounts">
              <span>Project {fmtMoney(current.projectAmount)}</span>
              <span>Monthly {fmtMoney(current.monthlyAmount)}</span>
            </div>
            <WorkspaceMetaLine label="Sent" value={current.sentAt ? fmtWorkspaceDate(current.sentAt) : "—"} />
            <WorkspaceMetaLine label="Viewed" value={current.viewedAt ? fmtWorkspaceDate(current.viewedAt) : "—"} />
            <WorkspaceMetaLine label="Signed" value={current.signedAt ? fmtWorkspaceDate(current.signedAt) : "—"} />
            <WorkspaceMetaLine label="Signer" value={current.signerName ?? "—"} />
            {current.proposalTitle ? (
              <WorkspaceMetaLine label="Source proposal" value={current.proposalTitle} />
            ) : null}
          </div>
        </WorkspaceChapter>
      ) : (
        <WorkspaceChapter title="Current contract" variant="compact">
          <WorkspaceEmpty message="No contract on file — convert an approved proposal to generate one." />
        </WorkspaceChapter>
      )}

      {data.conversionIntelligence.signals.length > 0 ? (
        <WorkspaceChapter title="Conversion intelligence" variant="compact">
          <ul className="kxd-os-contracts-intel">
            {data.conversionIntelligence.signals.map((signal) => (
              <li key={signal.id} className="kxd-os-contracts-intel__item">
                <div>
                  <strong>{signal.label}</strong>
                  <p className="kxd-os-contracts-intel__reason">{signal.reason}</p>
                </div>
                {signal.href ? (
                  <Link href={signal.href} className="kxd-os-link-quiet">Review →</Link>
                ) : null}
              </li>
            ))}
          </ul>
        </WorkspaceChapter>
      ) : null}

      <WorkspaceChapter title="Conversion history" variant="compact">
        {snapshot.conversions.length === 0 ? (
          <WorkspaceEmpty message="No proposal conversions recorded for this client." />
        ) : (
          <ul className="kxd-os-contracts-conversions">
            {snapshot.conversions.map((row) => (
              <li key={row.id} className="kxd-os-contracts-conversions__item">
                <strong>{row.proposalTitle}</strong>
                <div className="kxd-os-contracts-conversions__meta">
                  <span className="kxd-os-workspace-badge">{displayConversionStatus(row.status)}</span>
                  <span>{formatConversionMode(row.conversionMode)}</span>
                  <span>Launch {displayLaunchStatus(row.launchStatus)}</span>
                  {row.convertedAt ? <span>{fmtWorkspaceDate(row.convertedAt)}</span> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </WorkspaceChapter>

      <WorkspaceChapter title="Contract history" variant="compact">
        {snapshot.contracts.length === 0 ? (
          <WorkspaceEmpty message="No contracts on file." />
        ) : (
          <ul className="kxd-os-contracts-list">
            {snapshot.contracts.map((row) => (
              <li key={row.id} className="kxd-os-contracts-list__item">
                <span className="kxd-os-contracts-list__title">{row.title}</span>
                <div className="kxd-os-contracts-list__meta">
                  <span className="kxd-os-workspace-badge">{displayContractStatus(row.status)}</span>
                  <span>{fmtMoney(row.projectAmount)}</span>
                  {row.monthlyAmount != null ? <span>{fmtMoney(row.monthlyAmount)}/mo</span> : null}
                  {row.proposalTitle ? <span>From {row.proposalTitle}</span> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </WorkspaceChapter>
    </div>
  );
}
