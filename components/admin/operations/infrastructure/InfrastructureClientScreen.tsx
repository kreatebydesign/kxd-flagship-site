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
import {
  formatInfraCurrency,
  formatInfraDate,
  infraStatusLabel,
} from "@/lib/infrastructure/data";
import type { ClientInfrastructureDetail, InfraDoc } from "@/lib/infrastructure/types";

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

function field(record: InfraDoc | null, key: string): string {
  if (!record || record[key] == null || record[key] === "") return "—";
  if (typeof record[key] === "boolean") return record[key] ? "Yes" : "No";
  return String(record[key]);
}

export function InfrastructureClientScreen({
  clientId,
  detail,
}: {
  clientId: number;
  detail: ClientInfrastructureDetail;
}) {
  const { record, client, costs, events, healthSignals, score, monthlyCost, annualCost } =
    detail;
  const clientName = String(client.name ?? "Client");

  return (
    <OperationsShell activeId="infrastructure">
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
                    { label: "Staging URL", value: field(record, "stagingUrl") },
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
                <KxdSection label="AI recommendations" />
                <div className="kxd-os-card">
                  <KxdEmptyState
                    title="KXD Intelligence coming soon"
                    description="Proactive infrastructure recommendations, renewal alerts, and optimization insights will appear here."
                  />
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
