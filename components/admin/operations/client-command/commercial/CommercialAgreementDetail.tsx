import type { ReactNode } from "react";
import Link from "next/link";
import { fmtWorkspaceDate } from "@/lib/executive-client-workspace/theme";
import { formatCents } from "@/lib/proposal-builder/money";
import {
  documentKindLabel,
  formatCommercialStatus,
  formatPaymentMethodLabel,
} from "@/lib/client-command/commercial/map-agreement";
import { commercialWorkspaceHref } from "@/lib/client-command/commercial/sections";
import type { DirectAgreementTerms } from "@/lib/direct-agreement/types";
import type { ContractLifecyclePackage } from "@/lib/proposal-lifecycle/types";
import { WorkspaceEmpty } from "@/components/admin/operations/client-workspace/WorkspacePrimitives";
import { CommercialStatusBadge, statusTone } from "./CommercialStatusBadge";
import { CommercialLifecyclePanel } from "./CommercialLifecyclePanel";
import {
  formatPaymentStatusLabel,
  splitChecklistItems,
} from "./presentation";

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

  const invoiceAmount =
    terms != null
      ? formatCents(terms.oneTimeTotalCents, terms.currency)
      : daTerms
        ? formatCents(daTerms.oneTimeAmountCents as never)
        : "—";

  const paymentStatusLabel = formatPaymentStatusLabel(
    pkg.paymentReferences?.paymentStatus ||
      (status === "paid" || status === "active"
        ? "paid"
        : status === "payment-pending"
          ? "payment-pending"
          : "pending"),
  );

  const termLabel =
    daTerms?.serviceStartDate != null
      ? `${fmtWorkspaceDate(daTerms.serviceStartDate)}${
          daTerms.serviceEndDate ? ` → ${fmtWorkspaceDate(daTerms.serviceEndDate)}` : ""
        }`
      : "—";

  const hoursLabel =
    daTerms?.capacityHoursPerMonth != null
      ? `${daTerms.capacityHoursPerMonth} / month`
      : "—";

  const serviceItems = splitChecklistItems(daTerms?.includedServices);
  const exclusionItems = splitChecklistItems(daTerms?.exclusions);
  const auth = pkg.paymentAuthorization;

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

      <div className="kxd-os-commercial-kpi-grid">
        <Kpi label="Agreement" value={title} />
        <Kpi
          label="Status"
          valueNode={<CommercialStatusBadge label={statusLabel} tone={statusTone(statusLabel)} />}
        />
        <Kpi label="Invoice amount" value={invoiceAmount} emphasize />
        <Kpi label="Payment status" value={paymentStatusLabel} />
        <Kpi label="Service term" value={termLabel} />
        <Kpi label="Included hours" value={hoursLabel} />
      </div>

      <div className="kxd-os-commercial-detail__grid">
        <div className="kxd-os-commercial-detail__main">
          {daTerms ? (
            <div className="kxd-os-commercial-stack">
              <section className="kxd-os-commercial-panel-card">
                <h3>Scope</h3>
                <p className="kxd-os-commercial-prose">{daTerms.scope || "—"}</p>
              </section>

              <section className="kxd-os-commercial-panel-card">
                <h3>Included services</h3>
                {serviceItems.length ? (
                  <ul className="kxd-os-commercial-checklist">
                    {serviceItems.map((item) => (
                      <li key={item}>
                        <span className="kxd-os-commercial-checklist__mark" aria-hidden>
                          ✓
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <WorkspaceEmpty message="No included services listed." />
                )}
              </section>

              <section className="kxd-os-commercial-panel-card">
                <h3>Limits & exclusions</h3>
                {exclusionItems.length ? (
                  <ul className="kxd-os-commercial-checklist kxd-os-commercial-checklist--muted">
                    {exclusionItems.map((item) => (
                      <li key={item}>
                        <span className="kxd-os-commercial-checklist__mark" aria-hidden>
                          —
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="kxd-os-commercial-prose">{daTerms.exclusions || "—"}</p>
                )}
                <p className="kxd-os-commercial-muted">
                  Rollover:{" "}
                  {daTerms.rolloverPolicy === "none"
                    ? "No automatic rollover"
                    : "Manual approval"}
                  {daTerms.revisionAllowance
                    ? ` · Revisions: ${daTerms.revisionAllowance}`
                    : ""}
                </p>
              </section>

              <section className="kxd-os-commercial-panel-card">
                <h3>Payment terms</h3>
                <p className="kxd-os-commercial-prose">{daTerms.paymentTerms || "—"}</p>
                <p className="kxd-os-commercial-muted">
                  Method:{" "}
                  {formatPaymentMethodLabel(auth?.cardBrand, auth?.cardLast4)}
                </p>
              </section>
            </div>
          ) : (
            <section className="kxd-os-commercial-panel-card">
              <h3>Agreement terms</h3>
              <WorkspaceEmpty message="Structured Direct Agreement terms are not on this record. Proposal-linked agreements use the proposal lifecycle package." />
            </section>
          )}

          <section className="kxd-os-commercial-panel-card" id="documents">
            <h3>Documents</h3>
            {!docs.length ? (
              <WorkspaceEmpty message="No filed documents yet." />
            ) : (
              <div className="kxd-os-commercial-doc-grid">
                {docs.map((d) => (
                  <article key={`${d.kind}-${d.id}`} className="kxd-os-commercial-doc-card">
                    <div className="kxd-os-commercial-doc-card__top">
                      <span className="kxd-os-commercial-doc-card__type">
                        {documentKindLabel(d.kind)}
                      </span>
                      <span className="kxd-os-commercial-doc-card__ver">v{d.version}</span>
                    </div>
                    <p className="kxd-os-commercial-doc-card__date">
                      {d.generatedAt ? fmtWorkspaceDate(d.generatedAt) : "—"}
                    </p>
                    <div className="kxd-os-commercial-doc-card__actions">
                      <a
                        href={`/api/admin/commercial-documents/${d.id}/download?disposition=inline`}
                        className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Preview
                      </a>
                      <a
                        href={`/api/admin/commercial-documents/${d.id}/download`}
                        className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
                      >
                        Download
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {docs.length > 1 ? (
              <p className="kxd-os-commercial-muted" style={{ marginTop: "0.75rem" }}>
                Version history is preserved as separate immutable documents.
              </p>
            ) : null}
          </section>
        </div>

        <aside className="kxd-os-commercial-detail__aside">
          <section className="kxd-os-commercial-panel-card">
            <h3>Quick actions</h3>
            <div className="kxd-os-commercial-action-grid">
              {primaryDoc ? (
                <>
                  <a
                    href={`/api/admin/commercial-documents/${primaryDoc.id}/download?disposition=inline`}
                    className="kxd-os-btn"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Preview agreement
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
              <a href="#lifecycle" className="kxd-os-btn kxd-os-btn--ghost">
                Record acceptance
              </a>
              <a href="#lifecycle" className="kxd-os-btn kxd-os-btn--ghost">
                Authorization
              </a>
              <a href="#lifecycle" className="kxd-os-btn kxd-os-btn--ghost">
                Activate service
              </a>
            </div>
          </section>

          <section className="kxd-os-commercial-panel-card">
            <h3>Commercial status</h3>
            <div className="kxd-os-commercial-status-stack">
              <div>
                <span className="kxd-os-commercial-summary-card__label">Agreement</span>
                <div>
                  <CommercialStatusBadge label={statusLabel} tone={statusTone(statusLabel)} />
                </div>
              </div>
              <div>
                <span className="kxd-os-commercial-summary-card__label">Payment</span>
                <p className="kxd-os-commercial-status-stack__value">{paymentStatusLabel}</p>
              </div>
              <div>
                <span className="kxd-os-commercial-summary-card__label">Service</span>
                <p className="kxd-os-commercial-status-stack__value">
                  {status === "active" ? "Active" : "Not activated"}
                </p>
              </div>
            </div>
          </section>

          {pkg.externalAcceptance ? (
            <section className="kxd-os-commercial-panel-card kxd-os-commercial-panel-card--accent">
              <h3>Acceptance</h3>
              <p className="kxd-os-commercial-callout">
                Externally recorded — not an electronic signature
              </p>
              <dl className="kxd-os-commercial-kv">
                <div>
                  <dt>Accepted by</dt>
                  <dd>{pkg.externalAcceptance.acceptedBy}</dd>
                </div>
                <div>
                  <dt>Method</dt>
                  <dd>{pkg.externalAcceptance.method}</dd>
                </div>
                <div>
                  <dt>Date</dt>
                  <dd>{fmtWorkspaceDate(pkg.externalAcceptance.acceptedAt)}</dd>
                </div>
              </dl>
              {pkg.externalAcceptance.evidenceNotes ? (
                <p className="kxd-os-commercial-notes">
                  <strong>Evidence</strong>
                  <br />
                  {pkg.externalAcceptance.evidenceNotes}
                </p>
              ) : null}
            </section>
          ) : (
            <section className="kxd-os-commercial-panel-card">
              <h3>Acceptance</h3>
              <p className="kxd-os-commercial-muted">
                No acceptance recorded yet. Use Lifecycle controls to record external acceptance.
              </p>
            </section>
          )}

          <div id="lifecycle">
            <CommercialLifecyclePanel
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
              authorizationSummary={
                auth
                  ? {
                      authorizedBy: auth.authorizedBy,
                      method: auth.authorizationMethod,
                      authorizedAt: auth.authorizedAt,
                      amountCents: auth.amountAuthorizedCents,
                      notes: auth.evidenceNotes,
                      cardBrand: auth.cardBrand ?? null,
                      cardLast4: auth.cardLast4 ?? null,
                    }
                  : null
              }
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  valueNode,
  emphasize,
}: {
  label: string;
  value?: string;
  valueNode?: ReactNode;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`kxd-os-commercial-kpi${emphasize ? " kxd-os-commercial-kpi--emphasize" : ""}`}
    >
      <span className="kxd-os-commercial-kpi__label">{label}</span>
      {valueNode ?? (
        <span className="kxd-os-commercial-kpi__value" title={value}>
          {value}
        </span>
      )}
    </div>
  );
}
