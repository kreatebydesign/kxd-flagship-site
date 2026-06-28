import "server-only";

import type {
  IntegrationHealthState,
  IntegrationProviderView,
} from "@/lib/integrations/types";
import { getIntegrationProviderIds } from "@/lib/integrations/registry";
import { ensureIntegrationProvidersRegistered } from "@/lib/integrations/providers";
import type { ConversionMetrics, SeoMetrics, TrafficMetrics } from "@/lib/reporting/types";
import type { BrainSignal } from "@/lib/brain/types";
import { getCacheMeta } from "./cache";
import { deriveLiveHealth } from "./health";
import {
  getAllLiveProviderHandlers,
  getRegisteredLiveProviderIds,
} from "./registry";
import {
  getLastSyncResult,
  getProviderConnection,
  getProviderNormalized,
  getSyncHistory,
  refreshStaleProviders,
} from "./sync";
import type {
  CommandCenterLiveSummary,
  LaunchQaIntegrationHints,
  LiveIntegrationAlert,
  LivePlatformSnapshot,
  LiveProviderSnapshot,
  NormalizedCloudflare,
  NormalizedGa4,
  NormalizedGitHub,
  NormalizedSearchConsole,
  NormalizedStripe,
  NormalizedVercel,
  WebsiteAuditorLiveContext,
} from "./types";

function mapLiveHealthToHubHealth(health: ReturnType<typeof deriveLiveHealth>): IntegrationHealthState {
  switch (health) {
    case "healthy":
      return "healthy";
    case "warning":
      return "warning";
    case "error":
      return "warning";
    case "configuration_required":
      return "pending_configuration";
    case "disconnected":
      return "disconnected";
    default:
      return "unknown";
  }
}

export function enrichProviderViewFromLive(view: IntegrationProviderView): IntegrationProviderView {
  const connection = getProviderConnection(view.id);
  const hubHealth = mapLiveHealthToHubHealth(connection.health);

  return {
    ...view,
    status: connection.connectionStatus,
    health: hubHealth,
    lastSync: connection.lastSync,
    validationState: connection.authenticationState,
    configuredEnvVars: connection.configuredEnvVars,
    missingRequiredEnvVars: connection.missingRequiredEnvVars,
  };
}

export function getLiveProviderSnapshot(providerId: string): LiveProviderSnapshot | null {
  ensureIntegrationProvidersRegistered();
  if (!getRegisteredLiveProviderIds().includes(providerId as never)) return null;

  const id = providerId as import("@/lib/integrations/types").IntegrationProviderId;
  const connection = getProviderConnection(id);
  const cache = getCacheMeta(id);
  const lastSyncResult = getLastSyncResult(id);

  return {
    providerId: id,
    connection,
    normalized: getProviderNormalized(id),
    cache,
    lastSyncResult,
  };
}

export function getAllLiveSnapshots(): LiveProviderSnapshot[] {
  ensureIntegrationProvidersRegistered();
  return getRegisteredLiveProviderIds()
    .map((id) => getLiveProviderSnapshot(id))
    .filter((s): s is LiveProviderSnapshot => s !== null);
}

export function getLivePlatformSnapshot(): LivePlatformSnapshot {
  const providers = getAllLiveSnapshots();
  const healthyCount = providers.filter((p) => p.connection.health === "healthy").length;
  const warningCount = providers.filter((p) => p.connection.health === "warning").length;
  const errorCount = providers.filter((p) => p.connection.health === "error").length;
  const disconnectedCount = providers.filter((p) => p.connection.health === "disconnected").length;
  const configurationRequiredCount = providers.filter(
    (p) => p.connection.health === "configuration_required",
  ).length;

  const configured = providers.filter((p) => p.connection.connectionStatus === "connected").length;
  const total = providers.length;
  const readinessPercent = total > 0 ? Math.round((configured / total) * 100) : 0;

  return {
    providers,
    generatedAt: new Date().toISOString(),
    healthyCount,
    warningCount,
    errorCount,
    disconnectedCount,
    configurationRequiredCount,
    readinessPercent,
  };
}

export function getCommandCenterLiveSummary(): CommandCenterLiveSummary {
  const ga4 = getProviderNormalized<NormalizedGa4>("google-analytics-4");
  const gsc = getProviderNormalized<NormalizedSearchConsole>("google-search-console");
  const stripe = getProviderNormalized<NormalizedStripe>("stripe");
  const vercel = getProviderNormalized<NormalizedVercel>("vercel");
  const cloudflare = getProviderNormalized<NormalizedCloudflare>("cloudflare");
  const platform = getLivePlatformSnapshot();

  const alerts: string[] = [];
  for (const p of platform.providers) {
    if (p.connection.health === "error") {
      alerts.push(`${p.providerId}: ${p.connection.syncErrors[0] ?? "Integration error"}`);
    }
    if (p.lastSyncResult?.status === "failed") {
      alerts.push(`${p.providerId} sync failed`);
    }
  }

  if (vercel?.buildErrors?.length) {
    alerts.push(`Vercel deployment: ${vercel.buildErrors[0]}`);
  }

  if (cloudflare?.securityAlerts?.length) {
    alerts.push(...cloudflare.securityAlerts);
  }

  if (stripe?.paymentsFailed && stripe.paymentsFailed > 0) {
    alerts.push(`${stripe.paymentsFailed} failed Stripe payment(s) this month`);
  }

  return {
    healthy: platform.healthyCount,
    warning: platform.warningCount,
    error: platform.errorCount,
    total: platform.providers.length,
    deploymentStatus: vercel?.deploymentStatus ?? null,
    sslStatus: cloudflare?.sslStatus ?? null,
    analyticsConfigured: Boolean(ga4?.measurementId || ga4?.propertyId),
    searchConsoleConfigured: Boolean(gsc?.siteUrl),
    stripeMrrUsd: stripe?.mrrUsd ?? null,
    lastDeployment: vercel?.latestDeployment ?? null,
    alerts: alerts.slice(0, 8),
  };
}

export function getLaunchQaIntegrationHints(): LaunchQaIntegrationHints {
  const ga4 = getProviderNormalized<NormalizedGa4>("google-analytics-4");
  const gsc = getProviderNormalized<NormalizedSearchConsole>("google-search-console");
  const vercel = getProviderNormalized<NormalizedVercel>("vercel");
  const cloudflare = getProviderNormalized<NormalizedCloudflare>("cloudflare");
  const github = getProviderNormalized<NormalizedGitHub>("github");

  const ga4Configured = Boolean(ga4?.measurementId || ga4?.propertyId);
  const gscConfigured = Boolean(gsc?.siteUrl || gsc?.serverApiConfigured);
  const sslConfigured = Boolean(cloudflare?.sslStatus);
  const sslValid =
    cloudflare?.sslStatus === "active" ||
    cloudflare?.sslStatus === "valid" ||
    (cloudflare?.sslStatus != null && !cloudflare.securityAlerts.length);

  const deployReady =
    vercel?.deploymentStatus === "READY" ||
    vercel?.deploymentStatus === "runtime-detected" ||
    Boolean(vercel?.productionUrl);

  return {
    ga4: {
      configured: ga4Configured,
      verified: ga4Configured && getProviderConnection("google-analytics-4").health !== "error",
      message: ga4Configured
        ? ga4?.note ?? "GA4 tag or property configured"
        : "Configure NEXT_PUBLIC_GA4_MEASUREMENT_ID or GA4_PROPERTY_ID",
    },
    searchConsole: {
      configured: gscConfigured,
      verified: gscConfigured && getProviderConnection("google-search-console").health !== "error",
      message: gscConfigured
        ? gsc?.note ?? "Search Console site configured"
        : "Configure GSC_SITE_URL or site verification",
    },
    ssl: {
      configured: Boolean(cloudflare),
      valid: sslValid,
      message: cloudflare?.sslStatus
        ? `SSL: ${cloudflare.sslStatus}`
        : "Configure Cloudflare API for SSL verification",
    },
    productionDeployment: {
      configured: Boolean(vercel || github),
      ready: deployReady,
      message: vercel?.deploymentStatus
        ? `Deployment: ${vercel.deploymentStatus}`
        : github?.authenticatedUser
          ? `GitHub connected (${github.authenticatedUser})`
          : "Connect Vercel or GitHub for deployment signals",
    },
    domain: {
      configured: Boolean(cloudflare?.domain || vercel?.productionUrl),
      ready: Boolean(cloudflare?.domainStatus === "active" || vercel?.productionUrl),
      message: cloudflare?.domain ?? vercel?.productionUrl ?? "No domain signal available",
    },
    analyticsInstallation: {
      configured: ga4Configured,
      ready: ga4Configured,
      message: ga4?.measurementId
        ? `Measurement ID ${ga4.measurementId}`
        : "Analytics installation not verified",
    },
  };
}

export function getWebsiteAuditorLiveContext(): WebsiteAuditorLiveContext {
  const ga4 = getProviderNormalized<NormalizedGa4>("google-analytics-4");
  const gsc = getProviderNormalized<NormalizedSearchConsole>("google-search-console");
  const cloudflare = getProviderNormalized<NormalizedCloudflare>("cloudflare");
  const vercel = getProviderNormalized<NormalizedVercel>("vercel");

  const hasLiveMetrics =
    ga4?.sessions != null ||
    gsc?.clicks != null ||
    cloudflare?.sslStatus != null ||
    vercel?.deploymentStatus != null;

  return {
    ga4MeasurementId: ga4?.measurementId ?? null,
    gscSiteUrl: gsc?.siteUrl ?? null,
    sslStatus: cloudflare?.sslStatus ?? null,
    deploymentStatus: vercel?.deploymentStatus ?? null,
    hasLiveMetrics,
    note: hasLiveMetrics
      ? "Live integration signals available for infrastructure checks."
      : "Configure integrations for live website infrastructure metrics.",
  };
}

export function getReportingLiveTraffic(): TrafficMetrics | null {
  const ga4 = getProviderNormalized<NormalizedGa4>("google-analytics-4");
  if (!ga4 || ga4.sessions == null && ga4.users == null) return null;
  return {
    sessions: ga4.sessions ?? undefined,
    users: ga4.users ?? undefined,
    pageviews: undefined,
    source: "ga4-live",
  };
}

export function getReportingLiveSeo(): SeoMetrics | null {
  const gsc = getProviderNormalized<NormalizedSearchConsole>("google-search-console");
  if (!gsc || gsc.clicks == null && gsc.impressions == null) return null;
  return {
    score: gsc.averagePosition != null ? Math.round(100 - gsc.averagePosition) : undefined,
    source: "search-console-live",
  };
}

export function getReportingLiveConversions(): ConversionMetrics | null {
  const ga4 = getProviderNormalized<NormalizedGa4>("google-analytics-4");
  const stripe = getProviderNormalized<NormalizedStripe>("stripe");

  if (ga4?.conversions != null) {
    return {
      conversions: ga4.conversions ?? undefined,
      conversionRate: ga4.engagementRate ?? undefined,
      source: "ga4-live",
    };
  }

  if (stripe?.paymentsSucceeded != null) {
    return {
      conversions: stripe.paymentsSucceeded ?? undefined,
      source: "stripe-live",
    };
  }

  return null;
}

export function getConnectorStatusesFromLive(): Array<{
  id: string;
  label: string;
  status: "not-configured" | "ready" | "connected";
  note: string;
}> {
  const labels: Record<string, string> = {
    ga4: "Google Analytics 4",
    gsc: "Search Console",
    stripe: "Stripe",
    clarity: "Microsoft Clarity",
    gbp: "Google Business Profile",
    callrail: "CallRail",
    "meta-ads": "Meta Ads",
    "google-ads": "Google Ads",
  };

  const ga4Conn = getProviderConnection("google-analytics-4");
  const gscConn = getProviderConnection("google-search-console");
  const stripeConn = getProviderConnection("stripe");
  const gbpConn = getProviderConnection("google-business-profile");

  const mapStatus = (conn: ReturnType<typeof getProviderConnection>): "not-configured" | "ready" | "connected" => {
    if (conn.connectionStatus === "connected") return "connected";
    if (conn.connectionStatus === "configuration_required") return "ready";
    return "not-configured";
  };

  return [
    {
      id: "ga4",
      label: labels.ga4,
      status: mapStatus(ga4Conn),
      note:
        ga4Conn.connectionStatus === "connected"
          ? "GA4 configured — live sync active"
          : "Configure GA4 measurement or property ID",
    },
    {
      id: "gsc",
      label: labels.gsc,
      status: mapStatus(gscConn),
      note:
        gscConn.connectionStatus === "connected"
          ? "Search Console configured"
          : "Configure GSC site URL or verification",
    },
    {
      id: "stripe",
      label: labels.stripe,
      status: mapStatus(stripeConn),
      note:
        stripeConn.connectionStatus === "connected"
          ? "Stripe connected — revenue sync active"
          : "Revenue metrics available when Stripe is configured",
    },
    {
      id: "clarity",
      label: labels.clarity,
      status: "not-configured",
      note: "Session replay connector planned",
    },
    {
      id: "gbp",
      label: labels.gbp,
      status: mapStatus(gbpConn),
      note:
        gbpConn.connectionStatus === "connected"
          ? "Google Business Profile connected"
          : "Local presence metrics when Places API configured",
    },
    {
      id: "callrail",
      label: labels.callrail,
      status: "not-configured",
      note: "Call tracking connector planned",
    },
    {
      id: "meta-ads",
      label: labels["meta-ads"],
      status: "not-configured",
      note: "Paid social connector planned",
    },
    {
      id: "google-ads",
      label: labels["google-ads"],
      status: "not-configured",
      note: "Paid search connector planned",
    },
  ];
}

export function buildIntegrationBrainSignals(): BrainSignal[] {
  const platform = getLivePlatformSnapshot();
  const signals: BrainSignal[] = [];
  const liveSummary = getCommandCenterLiveSummary();

  for (const provider of platform.providers) {
    if (provider.connection.health === "error") {
      signals.push({
        id: `sig-integration-error-${provider.providerId}`,
        kind: "integration-failure",
        title: `${provider.providerId} integration error`,
        reason: provider.connection.syncErrors[0] ?? "Live sync failed or credentials invalid",
        urgency: "high",
        confidence: "high",
        estimatedValue: null,
        suggestedAction: "Review Integration Hub credentials and sync history.",
        relatedModule: "Integrations",
        href: `/admin/operations/integrations/${provider.providerId}`,
      });
    } else if (
      provider.connection.health === "warning" &&
      provider.lastSyncResult?.status === "failed"
    ) {
      signals.push({
        id: `sig-sync-failed-${provider.providerId}`,
        kind: "sync-failure",
        title: `${provider.providerId} sync failed`,
        reason: provider.lastSyncResult.errorMessage ?? "Provider sync did not complete",
        urgency: "medium",
        confidence: "high",
        estimatedValue: null,
        suggestedAction: "Check provider API limits and credentials.",
        relatedModule: "Integrations",
        href: `/admin/operations/integrations/${provider.providerId}`,
      });
    }
  }

  for (const alert of liveSummary.alerts.slice(0, 4)) {
    if (/ssl/i.test(alert)) {
      signals.push({
        id: `sig-ssl-${alert}`,
        kind: "infrastructure-risk",
        title: "SSL attention required",
        reason: alert,
        urgency: "high",
        confidence: "medium",
        estimatedValue: null,
        suggestedAction: "Verify Cloudflare SSL certificate and renewal.",
        relatedModule: "Infrastructure",
        href: "/admin/operations/integrations/cloudflare",
      });
    }

    if (/deployment|vercel/i.test(alert)) {
      signals.push({
        id: `sig-deploy-${alert}`,
        kind: "infrastructure-risk",
        title: "Deployment issue detected",
        reason: alert,
        urgency: "high",
        confidence: "high",
        estimatedValue: null,
        suggestedAction: "Review Vercel deployment logs.",
        relatedModule: "Infrastructure",
        href: "/admin/operations/integrations/vercel",
      });
    }

    if (/stripe|payment/i.test(alert)) {
      signals.push({
        id: `sig-revenue-${alert}`,
        kind: "revenue-risk",
        title: "Revenue alert",
        reason: alert,
        urgency: "medium",
        confidence: "high",
        estimatedValue: null,
        suggestedAction: "Review Stripe dashboard for failed payments.",
        relatedModule: "Sales",
        href: "/admin/operations/integrations/stripe",
      });
    }
  }

  return signals;
}

export function getLiveIntegrationAlerts(): LiveIntegrationAlert[] {
  const alerts: LiveIntegrationAlert[] = [];
  const platform = getLivePlatformSnapshot();

  for (const provider of platform.providers) {
    if (provider.connection.health === "error") {
      alerts.push({
        id: `live-int-${provider.providerId}-error`,
        providerId: provider.providerId,
        title: `${provider.providerId} integration error`,
        message: provider.connection.syncErrors[0] ?? "Integration health is error",
        severity: "critical",
        href: `/admin/operations/integrations/${provider.providerId}`,
      });
    }

    if (provider.lastSyncResult?.status === "failed") {
      alerts.push({
        id: `live-sync-${provider.providerId}`,
        providerId: provider.providerId,
        title: `${provider.providerId} sync failed`,
        message: provider.lastSyncResult.errorMessage ?? "Sync failed",
        severity: "warning",
        href: `/admin/operations/integrations/${provider.providerId}`,
      });
    }
  }

  const cloudflare = getProviderNormalized<NormalizedCloudflare>("cloudflare");
  if (cloudflare?.sslExpiresAt) {
    const expires = new Date(cloudflare.sslExpiresAt);
    const days = Math.ceil((expires.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (days <= 30) {
      alerts.push({
        id: "live-ssl-expiry",
        providerId: "cloudflare",
        title: "SSL certificate expiring soon",
        message: `SSL expires in ${days} day(s)`,
        severity: days <= 7 ? "critical" : "warning",
        href: "/admin/operations/integrations/cloudflare",
      });
    }
  }

  return alerts;
}

export function getPlatformIntegrationHints(): {
  readinessPercent: number;
  missingStack: string[];
} {
  const platform = getLivePlatformSnapshot();
  const missingStack: string[] = [];

  for (const p of platform.providers) {
    if (p.connection.connectionStatus !== "connected" && p.connection.health !== "disconnected") {
      missingStack.push(`Configure ${p.providerId}`);
    }
    if (p.connection.health === "configuration_required") {
      missingStack.push(`${p.providerId} needs additional credentials`);
    }
  }

  return {
    readinessPercent: platform.readinessPercent,
    missingStack: missingStack.slice(0, 6),
  };
}

export async function prepareLiveIntegrations(): Promise<void> {
  await refreshStaleProviders();
}

export function getIntegrationDetailSyncHistory(providerId: string): Array<{
  at: string;
  status: string;
  message: string;
}> {
  const history = getSyncHistory(
    providerId as import("@/lib/integrations/types").IntegrationProviderId,
  );
  if (history.length === 0) return [];

  return history.slice(0, 10).map((entry) => ({
    at: entry.completedAt ?? entry.startedAt,
    status: entry.status,
    message:
      entry.errorMessage ??
      (entry.recordsProcessed != null
        ? `${entry.recordsProcessed} record(s) processed`
        : "Sync completed"),
  }));
}

export function getGenesisIntegrationMissingHints(): string[] {
  return getPlatformIntegrationHints().missingStack;
}
