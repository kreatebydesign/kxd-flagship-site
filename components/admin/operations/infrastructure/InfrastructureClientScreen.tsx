import Link from "next/link";
import {
  KxdBadge,
  KxdEmptyState,
  KxdMetric,
  KxdPage,
  KxdSection,
  type KxdBadgeVariant,
} from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { ClientOpsNav } from "@/components/admin/operations/client-command/ClientOpsNav";
import { PreviewDomainManager } from "@/components/admin/operations/infrastructure/PreviewDomainManager";
import {
  formatInfraCurrency,
  formatInfraDate,
  infraStatusLabel,
} from "@/lib/infrastructure/data";
import type { ClientInfrastructureDetail, InfraDoc } from "@/lib/infrastructure/types";
import {
  formatDaysRemainingLabel,
  providerClassLabel,
  responsibilityHintLabel,
  urgencyBadgeLabel,
  type HostingRenewalUrgency,
} from "@/lib/infrastructure/hosting-renewal-readiness";
import {
  resourceEntryStateLabel,
  softAccessStateLabel,
  type ResourceEntry,
  type SoftAccessSignal,
} from "@/lib/infrastructure/client-resource-directory";

function DetailGrid({ rows }: { rows: Array<{ label: string; value: string }> }) {
  return (
    <dl
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(12rem, 1fr))",
        gap: "1rem 1.5rem",
      }}
    >
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="kxd-os-metric__label">{row.label}</dt>
          <dd className="kxd-os-body" style={{ marginTop: "0.25rem" }}>
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function signalVariant(status: string): KxdBadgeVariant {
  if (status === "ok") return "success";
  if (status === "warning") return "warning";
  if (status === "critical") return "critical";
  return "default";
}

function renewalUrgencyVariant(urgency: HostingRenewalUrgency): KxdBadgeVariant {
  switch (urgency) {
    case "critical":
      return "critical";
    case "attention":
    case "watch":
      return "warning";
    case "ok":
      return "success";
    default:
      return "default";
  }
}

function resourceStateVariant(state: ResourceEntry["state"]): KxdBadgeVariant {
  switch (state) {
    case "recorded":
      return "success";
    case "invalid":
    case "withheld":
      return "warning";
    case "missing":
    case "unknown":
    default:
      return "default";
  }
}

function softAccessVariant(state: SoftAccessSignal["state"]): KxdBadgeVariant {
  switch (state) {
    case "reported_yes":
      return "success";
    case "reported_no":
      return "warning";
    default:
      return "default";
  }
}

function ResourceEntryValue({ entry }: { entry: ResourceEntry }) {
  if (entry.href && entry.state === "recorded") {
    return (
      <a href={entry.href} target="_blank" rel="noopener noreferrer" className="kxd-os-link-quiet">
        {entry.displayValue ?? entry.href}
      </a>
    );
  }
  if (entry.displayValue) {
    return <span className="kxd-os-body">{entry.displayValue}</span>;
  }
  return <span className="kxd-os-meta">{entry.note ?? "—"}</span>;
}

function field(record: InfraDoc | null, key: string): string {
  if (!record || record[key] == null || record[key] === "") return "—";
  if (typeof record[key] === "boolean") return record[key] ? "Yes" : "No";
  return String(record[key]);
}

function resolveProductionWebsite(record: InfraDoc, client: InfraDoc): string | null {
  const fromInfra = String(record.productionUrl ?? "").trim();
  if (fromInfra) return fromInfra.replace(/\/$/, "");
  const fromClient = String(client.companyWebsite ?? "").trim();
  if (fromClient) return fromClient.replace(/\/$/, "");
  return null;
}

function resolvePreviewWebsite(record: InfraDoc): string | null {
  const value = String(record.stagingUrl ?? "").trim();
  return value ? value.replace(/\/$/, "") : null;
}

export function InfrastructureClientScreen({
  clientId,
  detail,
}: {
  clientId: number;
  detail: ClientInfrastructureDetail;
}) {
  const { record, client, costs, events, healthSignals, hostingRenewalReadiness, clientResourceDirectory, score, monthlyCost, annualCost } =
    detail;
  const clientName = String(client.name ?? "Client");
  const readiness = hostingRenewalReadiness;
  const directory = clientResourceDirectory;

  return (
    <OperationsShell activeId="infrastructure" clientId={clientId}>
      <KxdPage className="kxd-os-page--ops">
        <div className="kxd-os-ops-section-head">
          <OperationsPageHero
            eyebrow="Infrastructure Manager"
            title={clientName}
            lead={record?.primaryDomain ? String(record.primaryDomain) : "Infrastructure command"}
            presence
          />
          <Link href="/admin/operations/infrastructure" className="kxd-os-link-quiet">
            ← All clients
          </Link>
        </div>

        <ClientOpsNav clientId={clientId} active="infrastructure" />

        {!record ? (
          <KxdEmptyState
            title="No infrastructure record"
            description="Create a record in Payload or run the dashboard backfill helper."
            action={
              <Link
                href={`/admin/collections/client-infrastructure/create?client=${clientId}`}
                className="kxd-os-link-quiet"
              >
                Create in Payload →
              </Link>
            }
          />
        ) : (
          <>
            <div className="kxd-os-ops-kpi-grid">
              <KxdMetric
                label="Infrastructure score"
                value={score != null ? String(score) : "—"}
                sub={infraStatusLabel(String(record.status ?? "unknown"))}
              />
              <KxdMetric
                label="Monthly stack cost"
                value={formatInfraCurrency(monthlyCost || record.monthlyStackCost)}
              />
              <KxdMetric
                label="Annual renewal cost"
                value={formatInfraCurrency(annualCost || record.annualRenewalCost)}
              />
              <KxdMetric
                label="Next renewal"
                value={formatInfraDate(record.nextRenewalDate as string)}
              />
            </div>

            <PreviewDomainManager
              clientId={clientId}
              productionUrl={resolveProductionWebsite(record, client)}
              previewUrl={resolvePreviewWebsite(record)}
              editHref={`/admin/collections/client-infrastructure/${record.id}`}
            />

            <KxdSection label="Health signals" />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
                gap: "0.75rem",
                marginBottom: "2rem",
              }}
            >
              {healthSignals.map((signal) => (
                <div key={signal.id} className="kxd-os-card">
                  <p className="kxd-os-metric__label">{signal.label}</p>
                  <p className="kxd-os-card__title" style={{ marginTop: "0.35rem" }}>
                    {signal.value}
                  </p>
                  <KxdBadge variant={signalVariant(signal.status)}>{signal.status}</KxdBadge>
                </div>
              ))}
            </div>

            <div className="kxd-os-operations-split">
              <section className="kxd-os-card">
                <p className="kxd-os-section__label">Domain + DNS</p>
                <DetailGrid
                  rows={[
                    { label: "Primary domain", value: field(record, "primaryDomain") },
                    { label: "Registrar", value: field(record, "domainRegistrar") },
                    {
                      label: "Domain expiration",
                      value: formatInfraDate(record.domainExpirationDate as string),
                    },
                    { label: "Auto-renew", value: field(record, "domainAutoRenew") },
                    { label: "DNS provider", value: field(record, "dnsProvider") },
                    { label: "Nameservers", value: field(record, "nameservers") },
                    { label: "SSL status", value: field(record, "sslStatus") },
                    {
                      label: "SSL expiration",
                      value: formatInfraDate(record.sslExpirationDate as string),
                    },
                  ]}
                />
              </section>

              <section className="kxd-os-card">
                <p className="kxd-os-section__label">Hosting + Deployment</p>
                <DetailGrid
                  rows={[
                    { label: "Hosting", value: field(record, "hostingProvider") },
                    { label: "Production URL", value: field(record, "productionUrl") },
                    { label: "Preview Website", value: field(record, "stagingUrl") },
                    {
                      label: "Last deployment",
                      value: formatInfraDate(record.lastDeploymentDate as string),
                    },
                    { label: "Deployment status", value: field(record, "deploymentStatus") },
                  ]}
                />
              </section>
            </div>

            <div className="kxd-os-operations-split" style={{ marginTop: "1.5rem" }}>
              <section className="kxd-os-card">
                <p className="kxd-os-section__label">GitHub + Vercel</p>
                <DetailGrid
                  rows={[
                    { label: "GitHub repo", value: field(record, "githubRepo") },
                    { label: "Vercel project", value: field(record, "vercelProject") },
                    { label: "Vercel team", value: field(record, "vercelTeam") },
                  ]}
                />
              </section>

              <section className="kxd-os-card">
                <p className="kxd-os-section__label">Analytics + Search Console</p>
                <DetailGrid
                  rows={[
                    { label: "Analytics provider", value: field(record, "analyticsProvider") },
                    { label: "GA4 property", value: field(record, "ga4PropertyId") },
                    {
                      label: "Search Console",
                      value: field(record, "searchConsoleStatus"),
                    },
                  ]}
                />
              </section>
            </div>

            <div className="kxd-os-operations-split" style={{ marginTop: "1.5rem" }}>
              <section className="kxd-os-card">
                <p className="kxd-os-section__label">Email + Workspace</p>
                <DetailGrid
                  rows={[
                    { label: "Email provider", value: field(record, "emailProvider") },
                    { label: "Workspace", value: field(record, "workspaceProvider") },
                    { label: "Email domain", value: field(record, "emailDomain") },
                    { label: "SPF", value: field(record, "spfStatus") },
                    { label: "DKIM", value: field(record, "dkimStatus") },
                    { label: "DMARC", value: field(record, "dmarcStatus") },
                  ]}
                />
              </section>

              <section className="kxd-os-card">
                <p className="kxd-os-section__label">Payments + Forms</p>
                <DetailGrid
                  rows={[
                    { label: "Stripe", value: field(record, "stripeStatus") },
                    { label: "Resend", value: field(record, "resendStatus") },
                    {
                      label: "Forms monitoring",
                      value: "Coming soon — no live integration yet",
                    },
                  ]}
                />
              </section>
            </div>

            <KxdSection label="Client resource directory" />
            <div className="kxd-os-card" style={{ marginBottom: "1rem" }}>
              <p className="kxd-os-body">{directory.disclosure}</p>
              <p className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
                Soft onboarding access signals do not confirm ownership, working login, or KXD
                control.
              </p>
              {!directory.hasAnyRecordedValue ? (
                <p className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
                  No allowlisted system values are recorded yet for this client.
                </p>
              ) : null}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(16rem, 1fr))",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              {directory.categories.map((category) => (
                <section key={category.id} className="kxd-os-card">
                  <p className="kxd-os-section__label">{category.label}</p>
                  <div className="kxd-os-ops-list" style={{ marginTop: "0.75rem" }}>
                    {category.entries.map((entry) => (
                      <div key={entry.id} style={{ marginBottom: "0.85rem" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "0.5rem",
                            alignItems: "flex-start",
                          }}
                        >
                          <p className="kxd-os-metric__label">{entry.label}</p>
                          <KxdBadge variant={resourceStateVariant(entry.state)}>
                            {resourceEntryStateLabel(entry.state)}
                          </KxdBadge>
                        </div>
                        <div style={{ marginTop: "0.25rem" }}>
                          <ResourceEntryValue entry={entry} />
                        </div>
                        {entry.note && entry.displayValue ? (
                          <p className="kxd-os-meta" style={{ marginTop: "0.25rem" }}>
                            {entry.note}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="kxd-os-card" style={{ marginBottom: "2rem" }}>
              <p className="kxd-os-section__label">Onboarding access signals</p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(12rem, 1fr))",
                  gap: "0.75rem",
                  marginTop: "0.75rem",
                }}
              >
                {directory.softAccessSignals.map((signal) => (
                  <div key={signal.id}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                        alignItems: "flex-start",
                      }}
                    >
                      <p className="kxd-os-metric__label">{signal.label}</p>
                      <KxdBadge variant={softAccessVariant(signal.state)}>
                        {softAccessStateLabel(signal.state)}
                      </KxdBadge>
                    </div>
                    <p className="kxd-os-meta" style={{ marginTop: "0.25rem" }}>
                      {signal.detail}
                    </p>
                  </div>
                ))}
              </div>
              <p className="kxd-os-meta" style={{ marginTop: "1rem" }}>
                Directory last reviewed context:{" "}
                {formatInfraDate(directory.lastReviewedAt)}
                {directory.reviewedBy ? ` · ${directory.reviewedBy}` : ""}
              </p>
            </div>

            <KxdSection label="Costs + Renewals" />
            {costs.length === 0 ? (
              <p className="kxd-os-meta" style={{ marginBottom: "2rem" }}>
                No cost line items yet.
              </p>
            ) : (
              <div className="kxd-os-ops-list" style={{ marginBottom: "2rem" }}>
                {costs.map((cost) => (
                  <div key={cost.id as number} className="kxd-os-card">
                    <div className="kxd-os-ops-list__head">
                      <p className="kxd-os-card__title">{String(cost.name)}</p>
                      <KxdBadge variant="tier">{infraStatusLabel(String(cost.category))}</KxdBadge>
                    </div>
                    <p className="kxd-os-meta">
                      {formatInfraCurrency(cost.amount as number)} ·{" "}
                      {infraStatusLabel(String(cost.billingCycle))} · Paid by{" "}
                      {String(cost.paidBy ?? "unknown")}
                    </p>
                    {cost.vendor ? (
                      <p className="kxd-os-meta">{String(cost.vendor)}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            <div className="kxd-os-operations-split">
              <KxdSection label="Infrastructure events">
                {events.length === 0 ? (
                  <p className="kxd-os-meta">No events logged for this client.</p>
                ) : (
                  <div className="kxd-os-ops-list">
                    {events.map((event) => (
                      <div key={event.id as number} className="kxd-os-card">
                        <p className="kxd-os-card__title">{String(event.title)}</p>
                        <p className="kxd-os-meta">
                          {infraStatusLabel(String(event.eventType))} ·{" "}
                          {formatInfraDate(event.occurredAt as string)}
                        </p>
                        {event.description ? (
                          <p className="kxd-os-body" style={{ marginTop: "0.5rem" }}>
                            {String(event.description)}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </KxdSection>

              <div>
                <KxdSection label="Hosting renewal readiness" />
                <div className="kxd-os-card" style={{ marginBottom: "1rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      alignItems: "flex-start",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div>
                      <p className="kxd-os-card__title">
                        {providerClassLabel(readiness.providerClass)}
                        {readiness.providerRaw ? ` · ${readiness.providerRaw}` : ""}
                      </p>
                      <p className="kxd-os-meta">
                        {responsibilityHintLabel(readiness.responsibilityHint)}
                      </p>
                    </div>
                    <KxdBadge variant={renewalUrgencyVariant(readiness.overallUrgency)}>
                      {urgencyBadgeLabel(readiness.overallUrgency)}
                    </KxdBadge>
                  </div>
                  <p className="kxd-os-body">{readiness.overallRecommendedAction}</p>
                  <p className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
                    Operator guidance only — no automated reminders or emails are sent from this
                    view.
                  </p>
                </div>

                <div className="kxd-os-ops-list" style={{ marginBottom: "1.5rem" }}>
                  {[readiness.hosting, readiness.domain, readiness.ssl].map((signal) => (
                    <div key={signal.kind} className="kxd-os-ops-list__row">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "0.75rem",
                          alignItems: "flex-start",
                        }}
                      >
                        <div>
                          <p className="kxd-os-card__title">{signal.label}</p>
                          <p className="kxd-os-meta">
                            {formatInfraDate(signal.iso)} ·{" "}
                            {formatDaysRemainingLabel(signal.daysRemaining)}
                          </p>
                          <p className="kxd-os-body" style={{ marginTop: "0.5rem" }}>
                            {signal.recommendedAction}
                          </p>
                        </div>
                        <KxdBadge variant={renewalUrgencyVariant(signal.urgency)}>
                          {urgencyBadgeLabel(signal.urgency)}
                        </KxdBadge>
                      </div>
                    </div>
                  ))}
                </div>

                <KxdSection label="Internal notes" />
                <div className="kxd-os-card">
                  <p className="kxd-os-body">
                    {record.internalNotes
                      ? String(record.internalNotes)
                      : "No internal notes on file."}
                  </p>
                  <p className="kxd-os-meta" style={{ marginTop: "1rem" }}>
                    Last reviewed {formatInfraDate(record.lastReviewedAt as string)}
                    {record.reviewedBy ? ` · ${String(record.reviewedBy)}` : ""}
                  </p>
                  <Link
                    href={`/admin/collections/client-infrastructure/${record.id}`}
                    className="kxd-os-link-quiet"
                    style={{ display: "inline-block", marginTop: "1rem" }}
                  >
                    Edit in Payload →
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </KxdPage>
    </OperationsShell>
  );
}
