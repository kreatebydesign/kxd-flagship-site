import type {
  IntegrationConnectionStatus,
  IntegrationProviderId,
  IntegrationSyncLogEntry,
  IntegrationValidationState,
} from "@/lib/integrations/types";

/** Live health — extends hub health with error state */
export type LiveHealthState =
  | "healthy"
  | "warning"
  | "error"
  | "disconnected"
  | "configuration_required";

export type LiveDataFreshness = "fresh" | "stale" | "missing";

export type LiveRateLimitState = "ok" | "limited" | "unknown";

export type LiveAuthenticationState = IntegrationValidationState;

export interface LiveProviderConnection {
  providerId: IntegrationProviderId;
  connectionStatus: IntegrationConnectionStatus;
  authenticationState: LiveAuthenticationState;
  lastSync: string | null;
  nextSync: string | null;
  syncErrors: string[];
  health: LiveHealthState;
  rateLimitState: LiveRateLimitState;
  dataFreshness: LiveDataFreshness;
  validationMessage?: string;
  configuredEnvVars: string[];
  missingRequiredEnvVars: string[];
}

export interface LiveSyncResult {
  providerId: IntegrationProviderId;
  status: "success" | "partial" | "failed" | "skipped";
  startedAt: string;
  completedAt: string;
  recordsProcessed?: number;
  errorMessage?: string;
  hasNormalizedData: boolean;
}

export interface LiveCacheMeta {
  providerId: IntegrationProviderId;
  fetchedAt: string;
  expiresAt: string;
  ttlSeconds: number;
  isFresh: boolean;
}

export interface LiveProviderSnapshot<TNormalized = unknown> {
  providerId: IntegrationProviderId;
  connection: LiveProviderConnection;
  normalized: TNormalized | null;
  cache: LiveCacheMeta | null;
  lastSyncResult: LiveSyncResult | null;
}

/* ── Normalized provider models ───────────────────────────────────── */

export interface NormalizedGitHub {
  repository: string | null;
  latestCommit: string | null;
  deploymentBranch: string | null;
  openIssues: number | null;
  lastPush: string | null;
  contributors: number | null;
  authenticatedUser: string | null;
}

export interface NormalizedVercel {
  latestDeployment: string | null;
  deploymentStatus: string | null;
  productionUrl: string | null;
  previewUrl: string | null;
  buildDurationMs: number | null;
  buildErrors: string[];
  projectName: string | null;
}

export interface NormalizedGa4 {
  measurementId: string | null;
  propertyId: string | null;
  users: number | null;
  sessions: number | null;
  conversions: number | null;
  engagementRate: number | null;
  topPages: string[];
  trafficSources: string[];
  serverApiConfigured: boolean;
  note?: string;
}

export interface NormalizedSearchConsole {
  siteUrl: string | null;
  indexedPages: number | null;
  coverageErrors: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  averagePosition: number | null;
  serverApiConfigured: boolean;
  note?: string;
}

export interface NormalizedStripe {
  mrrCents: number | null;
  mrrUsd: number | null;
  activeSubscriptions: number | null;
  invoicesOpen: number | null;
  paymentsSucceeded: number | null;
  paymentsFailed: number | null;
  revenueCents: number | null;
  currency: string | null;
}

export interface NormalizedCloudflare {
  domain: string | null;
  sslStatus: string | null;
  sslExpiresAt: string | null;
  dnsRecordCount: number | null;
  domainStatus: string | null;
  cachingEnabled: boolean | null;
  securityAlerts: string[];
}

export interface NormalizedGoogleBusiness {
  averageRating: number | null;
  reviewCount: number | null;
  profileHealth: string | null;
  searchViews: number | null;
  calls: number | null;
  directionRequests: number | null;
  displayName: string | null;
}

export interface NormalizedWorkspace {
  domain: string | null;
  mailboxStatus: string | null;
  aliasHealth: string | null;
  storageUsedGb: number | null;
  deliveryIssues: string[];
  serverApiConfigured: boolean;
}

export interface NormalizedMicrosoft365 {
  tenantId: string | null;
  clientId: string | null;
  mailboxStatus: string | null;
  aliasHealth: string | null;
  storageUsedGb: number | null;
  deliveryIssues: string[];
  serverApiConfigured: boolean;
}

export interface NormalizedResend {
  fromEmail: string | null;
  domainCount: number | null;
  deliveryStatus: string | null;
  apiReachable: boolean;
}

export interface NormalizedPayload {
  collectionCount: number | null;
  failedJobs: number | null;
  databaseStatus: string | null;
  mediaStatus: string | null;
  cmsReachable: boolean;
}

export interface NormalizedNeon {
  host: string | null;
  databaseHealth: string | null;
  storageGb: number | null;
  connections: number | null;
  backupsConfigured: boolean | null;
  connectionUriPresent: boolean;
}

export type NormalizedProviderData =
  | NormalizedGitHub
  | NormalizedVercel
  | NormalizedGa4
  | NormalizedSearchConsole
  | NormalizedStripe
  | NormalizedCloudflare
  | NormalizedGoogleBusiness
  | NormalizedWorkspace
  | NormalizedMicrosoft365
  | NormalizedResend
  | NormalizedPayload
  | NormalizedNeon;

export interface LivePlatformSnapshot {
  providers: LiveProviderSnapshot[];
  generatedAt: string;
  healthyCount: number;
  warningCount: number;
  errorCount: number;
  disconnectedCount: number;
  configurationRequiredCount: number;
  readinessPercent: number;
}

export interface CommandCenterLiveSummary {
  healthy: number;
  warning: number;
  error: number;
  total: number;
  deploymentStatus: string | null;
  sslStatus: string | null;
  analyticsConfigured: boolean;
  searchConsoleConfigured: boolean;
  stripeMrrUsd: number | null;
  lastDeployment: string | null;
  alerts: string[];
}

export interface LaunchQaIntegrationHints {
  ga4: { configured: boolean; verified: boolean; message: string };
  searchConsole: { configured: boolean; verified: boolean; message: string };
  ssl: { configured: boolean; valid: boolean; message: string };
  productionDeployment: { configured: boolean; ready: boolean; message: string };
  domain: { configured: boolean; ready: boolean; message: string };
  analyticsInstallation: { configured: boolean; ready: boolean; message: string };
}

export interface WebsiteAuditorLiveContext {
  ga4MeasurementId: string | null;
  gscSiteUrl: string | null;
  sslStatus: string | null;
  deploymentStatus: string | null;
  hasLiveMetrics: boolean;
  note: string;
}

export interface LiveIntegrationAlert {
  id: string;
  providerId: IntegrationProviderId;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  href: string;
}

/* ── Future architecture interfaces (not implemented) ─────────────── */

export interface LiveOAuthBridge {
  providerId: IntegrationProviderId;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
}

export interface LiveWebhookBridge {
  providerId: IntegrationProviderId;
  endpointPath: string;
  events: string[];
}

export interface LiveBackgroundWorkerBridge {
  queueName: string;
  handler: string;
}

export interface LiveQueueBridge {
  name: string;
  maxRetries: number;
}

export interface LiveRealtimeBridge {
  channel: string;
  transport: "websocket" | "sse";
}

export interface LiveProviderPlugin {
  id: string;
  providerId: IntegrationProviderId;
  label: string;
}

export interface LiveMarketplaceIntegration {
  id: string;
  label: string;
  category: string;
}

export type LiveSyncLogEntry = IntegrationSyncLogEntry;
