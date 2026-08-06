import Link from "next/link";
import { fmtWorkspaceDate } from "@/lib/executive-client-workspace/theme";
import { formatCents } from "@/lib/proposal-builder/money";
import { documentKindLabel, formatCommercialStatus, formatPaymentMethodLabel } from "@/lib/client-command/commercial/map-agreement";
import { commercialWorkspaceHref } from "@/lib/client-command/commercial/sections";
import type { DirectAgreementTerms } from "@/lib/direct-agreement/types";
import type { ContractLifecyclePackage } from "@/lib/proposal-lifecycle/types";
import { ContractLifecycleActions } from "@/components/admin/sales/ContractLifecycleActions";
import {
  WorkspaceChapter,
  WorkspaceEmpty,
  WorkspaceMetaLine,
} from "@/components/admin/operations/client-workspace/WorkspacePrimitives";
import { CommercialStatusBadge, statusTone } from "./CommercialStatusBadge";

export function CommercialAgreementDetail(props: {
  clientId: number;
  clientName: string;
  contractId: number;
  title: string;
  contractStatus: string;
  agreementSource: string | null;
  pkg: ContractLifecyclePackage;
  daTerms: DirectAgreementTerms | null;
  blockers: Array<{ code: string; message: string }>;
  defaultRecipientName: string;
  defaultRecipientEmail: string;
}) {
  const {
    clientId,
    clientName,
    contractId,
    title,
    contractStatus,
    agreementSource,
    pkg,
    daTerms,
    blockers,
    defaultRecipientName,
    defaultRecipientEmail,
  } = props;

  const status = pkg.commercialStatus || contractStatus;
  const statusLabel = formatCommercialStatus(status);
  const terms = pkg.structuredPaymentTerms;
  const docs = pkg.documentRefs ?? [];
  const primaryDoc =
    docs.find((d) => d.kind === "executed-contract") ??
    docs.find((d) => d.kind === "direct-agreement") ??
    docs[0];

  return (
    <div className="kxd-os-commercial-detail">
      <div className="kxd-os-commercial-detail__crumbs">
        <Link
          href={commercialWorkspaceHref(clientId, "agreements")}
          className="kxd-os-link-quiet"
        >
          ← Commercial · Agreements
        </Link>
      </div>

      <header className="kxd-os-commercial-detail__header">
        <div>
          <p className="kxd-os-eyebrow">Agreement</p>
          <h1 className="kxd-os-commercial-detail__title">{title}</h1>
          <p className="kxd-os-commercial-detail__sub">
            {clientName}
            {" · "}
            {agreementSource === "direct-agreement" ? "Direct Agreement" : "From proposal"}
          </p>
        </div>
        <CommercialStatusBadge label={statusLabel} tone={statusTone(statusLabel)} />
      </header>

      <div className="kxd-os-commercial-detail__grid">
        <div className="kxd-os-commercial-detail__main">
          <WorkspaceChapter title="Commercial summary" variant="compact">
            <div className="kxd-os-commercial-meta-row">
              <WorkspaceMetaLine
                label="One-time"
                value={
                  terms
                    ? formatCents(terms.oneTimeTotalCents, terms.currency)
                    : daTerms
                      ? formatCents(daTerms.oneTimeAmountCents as never)
                      : "—"
                }
              />
              <WorkspaceMetaLine
                label="Monthly"
                value={
                  terms
                    ? formatCents(terms.monthlyTotalCents, terms.currency)
                    : daTerms
                      ? formatCents(daTerms.monthlyAmountCents as never)
                      : "—"
                }
              />
              <WorkspaceMetaLine
                label="Start"
                value={
                  daTerms?.serviceStartDate
                    ? fmtWorkspaceDate(daTerms.serviceStartDate)
                    : "—"
                }
              />
              <WorkspaceMetaLine
                label="End"
                value={
                  daTerms?.serviceEndDate ? fmtWorkspaceDate(daTerms.serviceEndDate) : "—"
                }
              />
              <WorkspaceMetaLine
                label="Hours"
                value={
                  daTerms?.capacityHoursPerMonth != null
                    ? `${daTerms.capacityHoursPerMonth} / mo`
                    : "—"
                }
              />
              <WorkspaceMetaLine
                label="Payment method"
                value={formatPaymentMethodLabel(
                  pkg.paymentAuthorization?.cardBrand,
                  pkg.paymentAuthorization?.cardLast4,
                )}
              />
            </div>
          </WorkspaceChapter>

          {daTerms ? (
            <>
              <WorkspaceChapter title="Scope" variant="compact">
                <p className="kxd-os-commercial-prose">{daTerms.scope || "—"}</p>
              </WorkspaceChapter>
              <WorkspaceChapter title="Included services" variant="compact">
                <p className="kxd-os-commercial-prose">{daTerms.includedServices || "—"}</p>
              </WorkspaceChapter>
              <WorkspaceChapter title="Limits & exclusions" variant="compact">
                <p className="kxd-os-commercial-prose">{daTerms.exclusions || "—"}</p>
                <p className="kxd-os-commercial-muted">
                  Rollover: {daTerms.rolloverPolicy === "none" ? "No automatic rollover" : "Manual approval"}
                  {daTerms.revisionAllowance ? ` · Revisions: ${daTerms.revisionAllowance}` : ""}
                </p>
              </WorkspaceChapter>
              <WorkspaceChapter title="Payment terms" variant="compact">
                <p className="kxd-os-commercial-prose">{daTerms.paymentTerms || "—"}</p>
              </WorkspaceChapter>
            </>
          ) : (
            <WorkspaceChapter title="Agreement terms" variant="compact">
              <WorkspaceEmpty message="Structured Direct Agreement terms are not on this record. Proposal-linked agreements use the proposal lifecycle package." />
            </WorkspaceChapter>
          )}

          <WorkspaceChapter title="Documents" variant="compact">
            <div id="documents" />
            {!docs.length ? (
              <WorkspaceEmpty message="No filed documents yet." />
            ) : (
              <ul className="kxd-os-commercial-doc-list">
                {docs.map((d) => (
                  <li key={`${d.kind}-${d.id}`}>
                    <div>
                      <strong>{documentKindLabel(d.kind)}</strong>
                      <span className="kxd-os-commercial-muted">
                        {" "}
                        · v{d.version} · {d.generatedAt ? fmtWorkspaceDate(d.generatedAt) : "—"}
                      </span>
                    </div>
                    <a
                      href={`/api/admin/commercial-documents/${d.id}/download`}
                      className="kxd-os-link-quiet"
                    >
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </WorkspaceChapter>

          {pkg.externalAcceptance ? (
            <WorkspaceChapter title="External acceptance" variant="compact">
              <p className="kxd-os-commercial-prose">
                Accepted by {pkg.externalAcceptance.acceptedBy} via{" "}
                {pkg.externalAcceptance.method} on {pkg.externalAcceptance.acceptedAt}.{" "}
                <strong>Not an electronic signature.</strong>
              </p>
              {pkg.externalAcceptance.evidenceNotes ? (
                <p className="kxd-os-commercial-notes">{pkg.externalAcceptance.evidenceNotes}</p>
              ) : null}
            </WorkspaceChapter>
          ) : null}
        </div>

        <aside className="kxd-os-commercial-detail__aside">
          <WorkspaceChapter title="Quick actions" variant="compact">
            <div className="kxd-os-commercial-quick-actions">
              {primaryDoc ? (
                <>
                  <a
                    href={`/api/admin/commercial-documents/${primaryDoc.id}/download?disposition=inline`}
                    className="kxd-os-btn kxd-os-btn--ghost"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View PDF
                  </a>
                  <a
                    href={`/api/admin/commercial-documents/${primaryDoc.id}/download`}
                    className="kxd-os-btn kxd-os-btn--ghost"
                  >
                    Download PDF
                  </a>
                </>
              ) : null}
              <Link
                href={commercialWorkspaceHref(clientId, "timeline")}
                className="kxd-os-btn kxd-os-btn--ghost"
              >
                Timeline
              </Link>
              <Link
                href={commercialWorkspaceHref(clientId, "payments")}
                className="kxd-os-btn kxd-os-btn--ghost"
              >
                Payments
              </Link>
            </div>
          </WorkspaceChapter>

          <WorkspaceChapter title="Operator workflow" variant="compact">
            <p className="kxd-os-commercial-muted" style={{ marginBottom: "0.75rem" }}>
              Finalize, acceptance, authorization, and activation — progressive controls below.
            </p>
            <div className="kxd-os-commercial-actions-shell">
              <ContractLifecycleActions
                contractId={contractId}
                contractStatus={contractStatus}
                agreementSource={agreementSource}
                commercialStatus={pkg.commercialStatus ?? null}
                hasOperatorSignature={Boolean(pkg.operatorSignature)}
                hasClientSignature={Boolean(pkg.clientSignature)}
                hasExternalAcceptance={Boolean(pkg.externalAcceptance)}
                onboardingEligible={Boolean(pkg.onboardingEligible)}
                blockers={blockers}
                defaultRecipientName={defaultRecipientName}
                defaultRecipientEmail={defaultRecipientEmail}
                documentRefs={docs.map((d) => ({ id: d.id, kind: d.kind }))}
                externalAcceptanceSummary={
                  pkg.externalAcceptance
                    ? `Externally recorded: ${pkg.externalAcceptance.acceptedBy} via ${pkg.externalAcceptance.method} on ${pkg.externalAcceptance.acceptedAt}. Not an electronic signature.`
                    : null
                }
              />
            </div>
          </WorkspaceChapter>
        </aside>
      </div>
    </div>
  );
}
