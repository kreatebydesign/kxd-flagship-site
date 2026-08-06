import type { ReactNode } from "react";
import Link from "next/link";
import { fmtWorkspaceDate } from "@/lib/executive-client-workspace/theme";
import type { ClientWorkspaceBundle } from "@/lib/client-command/workspace-types";
import { commercialWorkspaceHref } from "@/lib/client-command/commercial/sections";
import {
  WorkspaceChapter,
  WorkspaceEmpty,
  WorkspaceMetaLine,
} from "@/components/admin/operations/client-workspace/WorkspacePrimitives";
import { CommercialStatusBadge, statusTone } from "./CommercialStatusBadge";

export function CommercialOverview({ data }: { data: ClientWorkspaceBundle }) {
  const o = data.commercial.overview;
  const clientId = data.clientId;

  return (
    <div className="kxd-os-commercial-overview">
      <div className="kxd-os-commercial-summary-grid">
        <SummaryCard label="Agreement" value={o.agreementTitle ?? "None"}>
          {o.agreementHref ? (
            <Link href={o.agreementHref} className="kxd-os-link-quiet">
              Open agreement →
            </Link>
          ) : null}
        </SummaryCard>
        <SummaryCard label="Status">
          <CommercialStatusBadge label={o.statusLabel} tone={statusTone(o.statusLabel)} />
        </SummaryCard>
        <SummaryCard label="Payment" value={o.paymentStatusLabel} />
        <SummaryCard label="Invoice" value={o.invoiceAmountLabel} />
        <SummaryCard
          label="Term"
          value={
            o.termStart
              ? `${fmtWorkspaceDate(o.termStart)}${o.termEnd ? ` → ${fmtWorkspaceDate(o.termEnd)}` : ""}`
              : "—"
          }
        />
        <SummaryCard label="Hours included" value={o.hoursIncludedLabel} />
        <SummaryCard label="Hours used" value={o.hoursUsedLabel} />
        <SummaryCard label="Remaining" value={o.hoursRemainingLabel} />
        <SummaryCard label="Payment method" value={o.paymentMethodLabel} />
        <SummaryCard label="Renewal" value={o.renewalLabel} />
      </div>

      <div className="kxd-os-workspace-dossier-columns">
        <WorkspaceChapter title="Documents" variant="compact">
          {o.documentKindsPresent.length ? (
            <ul className="kxd-os-commercial-chip-list">
              {o.documentKindsPresent.map((kind) => (
                <li key={kind}>{kind}</li>
              ))}
            </ul>
          ) : (
            <WorkspaceEmpty message="No commercial documents filed yet." />
          )}
          <Link
            href={commercialWorkspaceHref(clientId, "documents")}
            className="kxd-os-link-quiet kxd-os-workspace-inline-link"
          >
            All documents →
          </Link>
        </WorkspaceChapter>

        <WorkspaceChapter title="Activity" variant="compact">
          <p className="kxd-os-commercial-muted">
            {o.lastActivityLabel ?? "No commercial activity yet."}
          </p>
          <Link
            href={commercialWorkspaceHref(clientId, "timeline")}
            className="kxd-os-link-quiet kxd-os-workspace-inline-link"
          >
            Commercial timeline →
          </Link>
        </WorkspaceChapter>
      </div>

      <WorkspaceChapter title="Outstanding" variant="compact">
        {o.outstandingItems.length ? (
          <ul className="kxd-os-commercial-outstanding">
            {o.outstandingItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <WorkspaceEmpty message="Nothing outstanding." />
        )}
      </WorkspaceChapter>

      <WorkspaceChapter title="Quick links" variant="compact">
        <div className="kxd-os-command-quick-links">
          <Link
            href={commercialWorkspaceHref(clientId, "agreements")}
            className="kxd-os-command-quick-links__item"
          >
            Agreements
          </Link>
          <Link
            href={commercialWorkspaceHref(clientId, "payments")}
            className="kxd-os-command-quick-links__item"
          >
            Payments
          </Link>
          <Link
            href={commercialWorkspaceHref(clientId, "authorizations")}
            className="kxd-os-command-quick-links__item"
          >
            Authorizations
          </Link>
          <Link
            href={`/admin/operations/client-command/${clientId}/direct-agreement/new`}
            className="kxd-os-command-quick-links__item"
          >
            Create Direct Agreement
          </Link>
        </div>
      </WorkspaceChapter>

      {data.financial.billingProfile ? (
        <WorkspaceChapter title="Billing profile" variant="compact">
          <div className="kxd-os-commercial-meta-row">
            <WorkspaceMetaLine
              label="Contact"
              value={data.financial.billingProfile.billingContact || "—"}
            />
            <WorkspaceMetaLine
              label="Email"
              value={data.financial.billingProfile.billingEmail || "—"}
            />
            <WorkspaceMetaLine
              label="Status"
              value={data.financial.billingProfile.billingStatus}
            />
          </div>
        </WorkspaceChapter>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
}) {
  return (
    <div className="kxd-os-commercial-summary-card">
      <span className="kxd-os-commercial-summary-card__label">{label}</span>
      {value != null ? (
        <span className="kxd-os-commercial-summary-card__value">{value}</span>
      ) : null}
      {children}
    </div>
  );
}
