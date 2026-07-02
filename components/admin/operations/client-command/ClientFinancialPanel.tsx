"use client";

import Link from "next/link";
import { fmtWorkspaceDate } from "@/lib/executive-client-workspace/theme";
import {
  displayBillingStatus,
  displayRevenueEventType,
  fmtFinancialMoney,
} from "@/lib/financial-command/client";
import type { ClientWorkspaceBundle } from "@/lib/client-command/workspace-types";
import {
  WorkspaceChapter,
  WorkspaceEmpty,
  WorkspaceKpiGrid,
  WorkspaceMetaLine,
} from "@/components/admin/operations/client-workspace/WorkspacePrimitives";

export function ClientFinancialPanel({ data }: { data: ClientWorkspaceBundle }) {
  const snapshot = data.financial;
  const billing = snapshot.billingProfile;

  return (
    <div className="kxd-os-financial">
      <header className="kxd-os-financial__hero">
        <div>
          <p className="kxd-os-eyebrow">Executive finance</p>
          <h2 className="kxd-os-financial__title">Financial command</h2>
          <p className="kxd-os-financial__lead">
            Revenue profile, billing setup, contracted value, pipeline, and risk flags for this client.
          </p>
        </div>
      </header>

      <WorkspaceKpiGrid
        items={[
          { label: "MRR", value: fmtFinancialMoney(snapshot.mrr) },
          { label: "Lifetime value", value: fmtFinancialMoney(snapshot.lifetimeValue) },
          { label: "Contracted", value: fmtFinancialMoney(snapshot.contractedValue) },
          { label: "Pipeline", value: fmtFinancialMoney(snapshot.pipelineValue) },
          { label: "Project value", value: fmtFinancialMoney(snapshot.projectValue) },
          { label: "At risk", value: fmtFinancialMoney(snapshot.atRiskAmount) },
        ]}
      />

      <WorkspaceChapter title="Billing profile" variant="compact">
        <div className="kxd-os-financial__billing">
          <WorkspaceMetaLine
            label="Status"
            value={displayBillingStatus(billing.billingStatus)}
          />
          <WorkspaceMetaLine label="Contact" value={billing.billingContact ?? "—"} />
          <WorkspaceMetaLine label="Email" value={billing.billingEmail ?? "—"} />
          <WorkspaceMetaLine
            label="Payment preference"
            value={billing.paymentPreference?.replace(/-/g, " ") ?? "—"}
          />
          <WorkspaceMetaLine
            label="Invoice cadence"
            value={billing.invoiceCadence?.replace(/-/g, " ") ?? "—"}
          />
          <WorkspaceMetaLine
            label="Payment terms"
            value={billing.paymentTerms?.replace(/-/g, " ") ?? "—"}
          />
          <WorkspaceMetaLine
            label="Renewal"
            value={snapshot.renewalStatus.replace(/-/g, " ")}
          />
          {billing.missingSetupFlags.length > 0 ? (
            <p className="kxd-os-financial__flags">
              Setup gaps: {billing.missingSetupFlags.join(", ").replace(/-/g, " ")}
            </p>
          ) : null}
        </div>
      </WorkspaceChapter>

      {data.financialIntelligence.signals.length > 0 ? (
        <WorkspaceChapter title="Financial intelligence" variant="compact">
          <ul className="kxd-os-financial-intel">
            {data.financialIntelligence.signals.map((signal) => (
              <li key={signal.id} className="kxd-os-financial-intel__item">
                <div>
                  <strong>{signal.label}</strong>
                  <p className="kxd-os-financial-intel__reason">{signal.reason}</p>
                </div>
                {signal.href ? (
                  <Link href={signal.href} className="kxd-os-link-quiet">Review →</Link>
                ) : null}
              </li>
            ))}
          </ul>
        </WorkspaceChapter>
      ) : null}

      <WorkspaceChapter title="Revenue by service" variant="compact">
        {snapshot.revenueByServiceType.length === 0 ? (
          <WorkspaceEmpty message="No service-type revenue breakdown yet." />
        ) : (
          <ul className="kxd-os-financial-services">
            {snapshot.revenueByServiceType.map((row) => (
              <li key={row.serviceType} className="kxd-os-financial-services__item">
                <span>{row.serviceType.replace(/-/g, " ")}</span>
                <span>{fmtFinancialMoney(row.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </WorkspaceChapter>

      <WorkspaceChapter title="Revenue events" variant="compact">
        {snapshot.revenueEvents.length === 0 ? (
          <WorkspaceEmpty message="No revenue events logged for this client yet." />
        ) : (
          <ul className="kxd-os-financial-events">
            {snapshot.revenueEvents.map((event) => (
              <li key={event.id} className="kxd-os-financial-events__item">
                <div className="kxd-os-financial-events__head">
                  <span className="kxd-os-workspace-badge">{event.displayType}</span>
                  <strong>{event.title}</strong>
                </div>
                <div className="kxd-os-financial-events__meta">
                  {event.amount != null ? <span>{fmtFinancialMoney(event.amount)}</span> : null}
                  <span>{fmtWorkspaceDate(event.occurredAt)}</span>
                  <span className="kxd-os-meta">{displayRevenueEventType(event.eventType)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </WorkspaceChapter>

      <WorkspaceChapter title="Linked records" variant="compact">
        <div className="kxd-os-financial__links">
          <Link href={`/admin/operations/client-command/${data.clientId}?tab=retainers`} className="kxd-os-link-quiet">
            Retainers ({snapshot.activeRetainers} active) →
          </Link>
          <Link href={`/admin/operations/client-command/${data.clientId}?tab=proposals`} className="kxd-os-link-quiet">
            Proposals →
          </Link>
          <Link href={`/admin/operations/client-command/${data.clientId}?tab=contracts`} className="kxd-os-link-quiet">
            Contracts →
          </Link>
          <Link href={`/admin/operations/client-command/${data.clientId}?tab=invoices`} className="kxd-os-link-quiet">
            Invoices →
          </Link>
        </div>
      </WorkspaceChapter>
    </div>
  );
}
