import Link from "next/link";
import {
  KxdBadge,
  KxdMetric,
  KxdPage,
  KxdSection,
  type KxdBadgeVariant,
} from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsEmpty,
  OpsKpiStrip,
  OpsSectionHead,
} from "@/components/admin/operations/shared/OpsBriefing";
import {
  INTEGRATION_CATEGORY_LABELS,
  INTEGRATION_HEALTH_LABELS,
  INTEGRATION_STATUS_LABELS,
  healthBadgeVariant,
  statusBadgeVariant,
  type IntegrationHubData,
  type IntegrationProviderView,
} from "@/lib/integrations";

function fmtWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function ProviderCard({ provider }: { provider: IntegrationProviderView }) {
  const statusVariant = statusBadgeVariant(provider.status) as KxdBadgeVariant;
  const healthVariant = healthBadgeVariant(provider.health) as KxdBadgeVariant;

  return (
    <OpsCard>
      <div className="kxd-integ-card">
        <div className="kxd-integ-card__head">
          <div className="kxd-integ-card__logo" aria-hidden>{provider.icon}</div>
          <div className="kxd-integ-card__title-block">
            <p className="kxd-os-card__title">{provider.name}</p>
            <p className="kxd-os-meta">
              {INTEGRATION_CATEGORY_LABELS[provider.category]}
            </p>
          </div>
          <div className="kxd-integ-card__badges">
            <KxdBadge variant={statusVariant}>
              {INTEGRATION_STATUS_LABELS[provider.status]}
            </KxdBadge>
            <KxdBadge variant={healthVariant}>
              {INTEGRATION_HEALTH_LABELS[provider.health]}
            </KxdBadge>
          </div>
        </div>

        <p className="kxd-os-body kxd-integ-card__desc">{provider.description}</p>

        <div className="kxd-integ-card__features">
          <p className="kxd-os-meta">Supported features</p>
          <ul className="kxd-integ-feature-list">
            {provider.supportedFeatures.slice(0, 4).map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>

        <div className="kxd-integ-card__meta">
          <span className="kxd-os-meta">Last sync · {fmtWhen(provider.lastSync)}</span>
          <span className="kxd-os-meta">
            Consumers · {provider.consumers.slice(0, 3).join(", ")}
            {provider.consumers.length > 3 ? "…" : ""}
          </span>
        </div>

        <div className="kxd-integ-card__actions">
          <button type="button" className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm" disabled>
            Connect
          </button>
          <button type="button" className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm" disabled>
            Settings
          </button>
          <Link
            href={`/admin/operations/integrations/${provider.id}`}
            className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
          >
            View details
          </Link>
        </div>
      </div>
    </OpsCard>
  );
}

function StatusSection({
  label,
  providers,
}: {
  label: string;
  providers: IntegrationProviderView[];
}) {
  if (!providers.length) return null;
  return (
    <section className="kxd-os-ops-section">
      <OpsSectionHead label={label} count={providers.length} />
      <div className="kxd-integ-grid">
        {providers.map((p) => <ProviderCard key={p.id} provider={p} />)}
      </div>
    </section>
  );
}

export function IntegrationsScreen({ data }: { data: IntegrationHubData }) {
  const { readiness, byStatus } = data;

  return (
    <OperationsShell activeId="integrations">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Integration Layer"
          title="Integrations"
          lead="Central registry for every external system KXD Core connects to. Architecture only — no live sync yet."
        />

        <KxdSection>
          <OpsSectionHead label="Integration Readiness" />
          <OpsKpiStrip
            items={[
              {
                label: "Configured",
                value: readiness.label,
                sub: `${readiness.percent}% readiness`,
                alert: readiness.percent < 60,
              },
              {
                label: "Connected",
                value: String(byStatus.connected.length),
                sub: "Active integrations",
                alert: false,
              },
              {
                label: "Needs Setup",
                value: String(
                  byStatus.not_connected.length + byStatus.configuration_required.length,
                ),
                sub: "Not connected or incomplete",
                alert:
                  byStatus.not_connected.length + byStatus.configuration_required.length > 0,
              },
              {
                label: "Next Priority",
                value: readiness.nextPriority?.name ?? "—",
                sub: readiness.nextPriority
                  ? "Highest priority to connect"
                  : "All configured",
                alert: Boolean(readiness.nextPriority),
              },
            ]}
          />
        </KxdSection>

        <KxdSection>
          <div className="kxd-os-metrics" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <KxdMetric label="Readiness Score" value={`${readiness.percent}%`} />
            <KxdMetric label="Total Providers" value={String(readiness.total)} />
          </div>
        </KxdSection>

        <StatusSection label="Connected" providers={byStatus.connected} />
        <StatusSection label="Configuration Required" providers={byStatus.configuration_required} />
        <StatusSection label="Not Connected" providers={byStatus.not_connected} />
        <StatusSection label="Error" providers={byStatus.error} />
        <StatusSection label="Disabled" providers={byStatus.disabled} />
        <StatusSection label="Unknown" providers={byStatus.unknown} />

        {data.providers.length === 0 ? (
          <OpsEmpty message="No integration providers registered." />
        ) : null}
      </KxdPage>
    </OperationsShell>
  );
}
