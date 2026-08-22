import Link from "next/link";
import type { ReactNode } from "react";
import { KxdBadge, KxdPage } from "@/components/os";
import type { PortalCommercialReady } from "@/lib/portal/commercial";
import { ClientHqPageHero } from "@/components/client-hq/ClientHqPageHero";

function CommercialDocumentLink({
  document: doc,
  children,
}: {
  document: { downloadHref: string; title: string };
  children: string;
}) {
  return (
    <a href={doc.downloadHref} className="kxd-os-billing-link" download>
      {children}
      <span className="sr-only"> — download {doc.title}</span>
    </a>
  );
}

function ReceiptLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="kxd-os-billing-link"
    >
      {label}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function FactGrid({
  facts,
}: {
  facts: Array<{ label: string; value: string }>;
}) {
  if (!facts.length) return null;
  return (
    <dl className="kxd-portal-commercial__facts">
      {facts.map((fact) => (
        <div key={fact.label} className="kxd-portal-commercial__fact">
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function CommercialSection({
  eyebrow,
  title,
  children,
  id,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  id: string;
}) {
  return (
    <section className="kxd-portal-commercial__section" aria-labelledby={id}>
      <p className="kxd-portal-commercial__eyebrow">{eyebrow}</p>
      <h2 id={id} className="kxd-portal-commercial__title">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Client-safe Agreement & commercial workspace — authoritative billingPlan projection.
 */
export function PortalAgreementScreen({ view }: { view: PortalCommercialReady }) {
  const executedDoc =
    view.documents.find((d) => d.kindLabel === "Agreement") ?? null;
  const certificateDoc =
    view.documents.find((d) => d.kindLabel === "Execution certificate") ?? null;

  return (
    <KxdPage className="kxd-os-page--ops kxd-portal-commercial">
      <ClientHqPageHero
        eyebrow="Engagement"
        title="Agreement & billing"
        lead="Your signed agreement, purchased scope, and payment schedule — drawn from the records Kreate by Design maintains for your account."
      />

      <CommercialSection eyebrow="Active engagement" title={view.engagement.title} id="portal-commercial-engagement">
        <FactGrid
          facts={[
            { label: "Status", value: view.engagement.statusLabel },
            ...(view.engagement.totalLabel
              ? [{ label: "Total engagement", value: view.engagement.totalLabel }]
              : []),
          ]}
        />
      </CommercialSection>

      <CommercialSection eyebrow="Agreement" title="Signed agreement" id="portal-commercial-agreement">
        <FactGrid
          facts={[
            { label: "Status", value: view.agreement.statusLabel },
            ...(view.agreement.executedDateLabel
              ? [{ label: "Executed", value: view.agreement.executedDateLabel }]
              : []),
            ...(view.agreement.clientSignerName
              ? [{ label: "Client signer", value: view.agreement.clientSignerName }]
              : []),
            ...(view.agreement.kxdSignerName
              ? [{ label: "KXD signer", value: view.agreement.kxdSignerName }]
              : []),
          ]}
        />
        <div className="kxd-portal-commercial__actions">
          {executedDoc ? (
            <CommercialDocumentLink document={executedDoc}>
              View executed agreement
            </CommercialDocumentLink>
          ) : null}
          {certificateDoc ? (
            <CommercialDocumentLink document={certificateDoc}>
              Execution certificate
            </CommercialDocumentLink>
          ) : null}
        </div>
      </CommercialSection>

      <CommercialSection eyebrow="Scope" title="Purchased scope" id="portal-commercial-scope">
        {view.scope.proposalReference ? (
          <p className="kxd-portal-commercial__meta">{view.scope.proposalReference}</p>
        ) : null}
        {view.scope.summary ? (
          <p className="kxd-portal-commercial__lead">{view.scope.summary}</p>
        ) : null}
        {view.scope.deliverables.length > 0 ? (
          <ul className="kxd-portal-commercial__list">
            {view.scope.deliverables.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        {view.scope.proposalDocument ? (
          <p className="kxd-portal-commercial__actions">
            <CommercialDocumentLink document={view.scope.proposalDocument}>
              Accepted scope document
            </CommercialDocumentLink>
          </p>
        ) : null}
      </CommercialSection>

      <CommercialSection eyebrow="Payments" title="Payment schedule" id="portal-commercial-payments">
        <FactGrid
          facts={[
            { label: "Total", value: view.payments.totalLabel },
            { label: "Paid", value: view.payments.paidLabel },
            { label: "Remaining", value: view.payments.remainingLabel },
          ]}
        />
        <ul className="kxd-os-billing-list">
          {view.payments.schedule.map((row) => (
            <li key={row.id} className="kxd-os-billing-card">
              <div className="kxd-os-billing-card__main">
                <div className="kxd-os-billing-card__identity">
                  <p className="kxd-os-card__title">{row.label}</p>
                  <KxdBadge
                    variant={row.statusLabel === "Paid" ? "success" : "default"}
                    className="kxd-os-billing-card__status"
                  >
                    {row.statusLabel}
                  </KxdBadge>
                </div>
                <p className="kxd-os-billing-card__amount">{row.amountLabel}</p>
              </div>
              {row.dueDateLabel || row.receiptHref ? (
                <dl className="kxd-os-billing-card__meta">
                  {row.dueDateLabel ? (
                    <div>
                      <dt>Due date</dt>
                      <dd>{row.dueDateLabel}</dd>
                    </div>
                  ) : null}
                  {row.receiptHref ? (
                    <div>
                      <dt>Receipt</dt>
                      <dd>
                        <ReceiptLink href={row.receiptHref} label="View receipt" />
                      </dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
            </li>
          ))}
        </ul>
      </CommercialSection>

      {view.collaboration ? (
        <CommercialSection
          eyebrow="Collaboration"
          title="Where your project work happens"
          id="portal-commercial-collaboration"
        >
          <p className="kxd-portal-commercial__lead">{view.collaboration.detail}</p>
          <p className="kxd-portal-commercial__actions">
            <Link href={view.collaboration.href} className="kxd-ces-btn kxd-ces-btn--ghost">
              Open {view.collaboration.label}
            </Link>
          </p>
        </CommercialSection>
      ) : null}
    </KxdPage>
  );
}
