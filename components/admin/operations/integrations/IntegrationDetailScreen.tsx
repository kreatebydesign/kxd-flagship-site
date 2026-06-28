import Link from "next/link";
import {
  KxdBadge,
  KxdPage,
  KxdSection,
  type KxdBadgeVariant,
} from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { OpsCard, OpsListRow, OpsSectionHead } from "@/components/admin/operations/shared/OpsBriefing";
import {
  INTEGRATION_CATEGORY_LABELS,
  INTEGRATION_HEALTH_LABELS,
  INTEGRATION_STATUS_LABELS,
  healthBadgeVariant,
  statusBadgeVariant,
  type IntegrationDetailData,
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

export function IntegrationDetailScreen({ data }: { data: IntegrationDetailData }) {
  const { provider, syncHistoryPlaceholder, futureSyncNote } = data;
  const statusVariant = statusBadgeVariant(provider.status) as KxdBadgeVariant;
  const healthVariant = healthBadgeVariant(provider.health) as KxdBadgeVariant;
  const schema = provider.settingsSchema;

  return (
    <OperationsShell activeId="integrations">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Integration"
          title={provider.name}
          lead={provider.description}
        />

        <p className="kxd-os-meta" style={{ marginBottom: "1.5rem" }}>
          <Link href="/admin/operations/integrations" className="kxd-os-link-quiet">
            ← All integrations
          </Link>
        </p>

        <KxdSection>
          <OpsSectionHead label="Overview" />
          <OpsCard>
            <div className="kxd-integ-detail__overview">
              <div className="kxd-integ-card__logo kxd-integ-card__logo--lg" aria-hidden>
                {provider.icon}
              </div>
              <div>
                <p className="kxd-os-meta">{INTEGRATION_CATEGORY_LABELS[provider.category]}</p>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                  <KxdBadge variant={statusVariant}>
                    {INTEGRATION_STATUS_LABELS[provider.status]}
                  </KxdBadge>
                  <KxdBadge variant={healthVariant}>
                    {INTEGRATION_HEALTH_LABELS[provider.health]}
                  </KxdBadge>
                </div>
                <p className="kxd-os-body" style={{ marginTop: "0.75rem" }}>
                  Last sync · {fmtWhen(provider.lastSync)}
                </p>
                <p className="kxd-os-meta">Validation · {provider.validationState}</p>
              </div>
            </div>
          </OpsCard>
        </KxdSection>

        <KxdSection>
          <OpsSectionHead label="Capabilities" />
          <OpsCard>
            <p className="kxd-os-meta">Supported today</p>
            <ul className="kxd-integ-feature-list">
              {provider.supportedFeatures.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <p className="kxd-os-meta" style={{ marginTop: "1rem" }}>Future capabilities</p>
            <ul className="kxd-integ-feature-list kxd-integ-feature-list--muted">
              {provider.futureCapabilities.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </OpsCard>
        </KxdSection>

        <KxdSection>
          <OpsSectionHead label="Connected Modules" />
          <div className="kxd-os-list-stack">
            {provider.consumers.map((module) => (
              <OpsListRow key={module}>
                <p className="kxd-os-body">{module}</p>
                <p className="kxd-os-meta">Consumes {provider.name} signals</p>
              </OpsListRow>
            ))}
          </div>
        </KxdSection>

        <KxdSection>
          <OpsSectionHead label="Configuration" />
          <OpsCard>
            {schema.apiKeys?.length ? (
              <div className="kxd-integ-config-block">
                <p className="kxd-os-meta">API Key (placeholder)</p>
                {schema.apiKeys.map((k) => (
                  <p key={k.key} className="kxd-os-body">
                    {k.label} · <code className="kxd-integ-code">{k.placeholder ?? "—"}</code>
                  </p>
                ))}
              </div>
            ) : null}
            {schema.oauth ? (
              <div className="kxd-integ-config-block">
                <p className="kxd-os-meta">OAuth (placeholder)</p>
                <p className="kxd-os-body">{schema.oauth.label}</p>
                <p className="kxd-os-meta">Scopes · {schema.oauth.scopes.join(", ")}</p>
              </div>
            ) : null}
            {schema.webhooks?.length ? (
              <div className="kxd-integ-config-block">
                <p className="kxd-os-meta">Webhook (placeholder)</p>
                {schema.webhooks.map((w) => (
                  <p key={w.key} className="kxd-os-body">
                    {w.label} · <code className="kxd-integ-code">{w.placeholder}</code>
                  </p>
                ))}
              </div>
            ) : null}
            <div className="kxd-integ-config-block">
              <p className="kxd-os-meta">Environment variables</p>
              {schema.envVars.map((env) => (
                <p key={env.key} className="kxd-os-body">
                  <code className="kxd-integ-code">{env.key}</code>
                  {env.required ? " · required" : " · optional"}
                  {provider.configuredEnvVars.includes(env.key) ? " · configured" : ""}
                </p>
              ))}
            </div>
            <div className="kxd-integ-config-block">
              <p className="kxd-os-meta">Permissions required</p>
              <ul className="kxd-integ-feature-list">
                {schema.permissions.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
            {schema.documentationUrl ? (
              <p className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
                Documentation · {schema.documentationUrl}
              </p>
            ) : null}
            <div className="kxd-integ-card__actions" style={{ marginTop: "1rem" }}>
              <button type="button" className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm" disabled>
                Connect
              </button>
              <button type="button" className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm" disabled>
                Settings
              </button>
            </div>
          </OpsCard>
        </KxdSection>

        <KxdSection>
          <OpsSectionHead label="Sync History" />
          <OpsCard>
            <p className="kxd-os-meta">{futureSyncNote}</p>
            {syncHistoryPlaceholder.length ? (
              <div className="kxd-os-list-stack" style={{ marginTop: "0.75rem" }}>
                {syncHistoryPlaceholder.map((entry) => (
                  <div key={entry.at} className="kxd-os-ops-list-row">
                    <p className="kxd-os-body">{entry.message}</p>
                    <p className="kxd-os-meta">{fmtWhen(entry.at)} · {entry.status}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="kxd-os-body" style={{ marginTop: "0.5rem" }}>No sync history yet.</p>
            )}
          </OpsCard>
        </KxdSection>
      </KxdPage>
    </OperationsShell>
  );
}
