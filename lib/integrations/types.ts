/** Phase 7D — Integration Hub types */

export type IntegrationProviderId =
  | "github"
  | "vercel"
  | "google-analytics-4"
  | "google-search-console"
  | "stripe"
  | "cloudflare"
  | "google-business-profile"
  | "google-workspace"
  | "microsoft-365"
  | "resend"
  | "payload"
  | "neon-postgresql";

export type IntegrationCategory =
  | "developer"
  | "analytics"
  | "infrastructure"
  | "commerce"
  | "communication"
  | "platform"
  | "database";

export type IntegrationConnectionStatus =
  | "connected"
  | "not_connected"
  | "configuration_required"
  | "disabled"
  | "error"
  | "unknown";

export type IntegrationHealthState =
  | "healthy"
  | "warning"
  | "disconnected"
  | "pending_configuration"
  | "unknown";

export type IntegrationValidationState = "valid" | "invalid" | "pending" | "unknown";

/** KXD modules that consume integration data */
export type KxdConsumerModule =
  | "Infrastructure"
  | "Command Center"
  | "Brain"
  | "Projects"
  | "Timeline"
  | "Reporting"
  | "Client HQ"
  | "Founder Intelligence"
  | "Website Health"
  | "Sales"
  | "Revenue"
  | "Automation"
  | "Notifications"
  | "Strategy Vault"
  | "Creative"
  | "Portal";

export interface IntegrationSettingsField {
  key: string;
  label: string;
  type: "api_key" | "oauth" | "webhook" | "env" | "text";
  placeholder?: string;
  required?: boolean;
  envVar?: string;
}

export interface IntegrationOAuthPlaceholder {
  label: string;
  scopes: string[];
  placeholder: string;
}

export interface IntegrationWebhookPlaceholder {
  key: string;
  label: string;
  placeholder: string;
  events?: string[];
}

export interface IntegrationEnvRequirement {
  key: string;
  label: string;
  required: boolean;
  description?: string;
}

export interface IntegrationSettingsSchema {
  apiKeys?: IntegrationSettingsField[];
  oauth?: IntegrationOAuthPlaceholder;
  webhooks?: IntegrationWebhookPlaceholder[];
  envVars: IntegrationEnvRequirement[];
  permissions: string[];
  scopes?: string[];
  documentationUrl?: string;
}

export interface IntegrationProviderDefinition {
  id: IntegrationProviderId;
  name: string;
  category: IntegrationCategory;
  icon: string;
  description: string;
  supportedFeatures: string[];
  futureCapabilities: string[];
  consumers: KxdConsumerModule[];
  settingsSchema: IntegrationSettingsSchema;
  /** Lower = higher priority for readiness recommendations */
  connectPriority: number;
  /** When true, provider is part of core stack and counts toward readiness baseline */
  coreStack?: boolean;
}

export interface IntegrationConnectionSnapshot {
  providerId: IntegrationProviderId;
  status: IntegrationConnectionStatus;
  health: IntegrationHealthState;
  lastSync: string | null;
  validationState: IntegrationValidationState;
  configuredEnvVars: string[];
  missingRequiredEnvVars: string[];
}

export interface IntegrationProviderView extends IntegrationProviderDefinition {
  status: IntegrationConnectionStatus;
  health: IntegrationHealthState;
  lastSync: string | null;
  validationState: IntegrationValidationState;
  configuredEnvVars: string[];
  missingRequiredEnvVars: string[];
}

export interface IntegrationReadinessScore {
  configured: number;
  total: number;
  percent: number;
  label: string;
  nextPriority: IntegrationProviderView | null;
}

export interface IntegrationHubData {
  providers: IntegrationProviderView[];
  byStatus: Record<IntegrationConnectionStatus, IntegrationProviderView[]>;
  readiness: IntegrationReadinessScore;
  categories: IntegrationCategory[];
  generatedAt: string;
}

export interface IntegrationDetailData {
  provider: IntegrationProviderView;
  syncHistoryPlaceholder: Array<{ at: string; status: string; message: string }>;
  futureSyncNote: string;
}

/* ── Future architecture interfaces (not implemented) ───────────────── */

export interface IntegrationOAuthConfig {
  clientId: string;
  clientSecretRef: string;
  redirectUri: string;
  scopes: string[];
  authorizationUrl?: string;
  tokenUrl?: string;
}

export interface IntegrationApiKeyConfig {
  keyRef: string;
  headerName?: string;
  prefix?: string;
}

export interface IntegrationServiceAccountConfig {
  credentialsRef: string;
  projectId?: string;
  scopes: string[];
}

export interface IntegrationWebhookConfig {
  endpointPath: string;
  secretRef: string;
  events: string[];
  signingAlgorithm?: string;
}

export interface IntegrationSyncSchedule {
  providerId: IntegrationProviderId;
  intervalMinutes: number;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
}

export interface IntegrationBackgroundJob {
  id: string;
  providerId: IntegrationProviderId;
  jobType: "sync" | "health_check" | "webhook_delivery" | "retry";
  status: "queued" | "running" | "completed" | "failed";
  createdAt: string;
}

export interface IntegrationRateLimitPolicy {
  providerId: IntegrationProviderId;
  requestsPerMinute: number;
  burstLimit?: number;
}

export interface IntegrationSyncLogEntry {
  id: string;
  providerId: IntegrationProviderId;
  startedAt: string;
  completedAt?: string;
  status: "success" | "partial" | "failed";
  recordsProcessed?: number;
  errorMessage?: string;
}

export interface IntegrationErrorRecord {
  id: string;
  providerId: IntegrationProviderId;
  code: string;
  message: string;
  occurredAt: string;
  retryable: boolean;
}

export interface IntegrationRetryQueueItem {
  id: string;
  providerId: IntegrationProviderId;
  operation: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string;
  payloadRef?: string;
}

export interface IntegrationProviderRuntime {
  definition: IntegrationProviderDefinition;
  resolveConnection: () => IntegrationConnectionSnapshot;
  /** Future: execute sync */
  sync?: () => Promise<IntegrationSyncLogEntry>;
  /** Future: validate credentials */
  validate?: () => Promise<IntegrationValidationState>;
}

export const INTEGRATION_STATUS_LABELS: Record<IntegrationConnectionStatus, string> = {
  connected: "Connected",
  not_connected: "Not Connected",
  configuration_required: "Configuration Required",
  disabled: "Disabled",
  error: "Error",
  unknown: "Unknown",
};

export const INTEGRATION_HEALTH_LABELS: Record<IntegrationHealthState, string> = {
  healthy: "Healthy",
  warning: "Warning",
  disconnected: "Disconnected",
  pending_configuration: "Pending Configuration",
  unknown: "Unknown",
};

export const INTEGRATION_CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  developer: "Developer",
  analytics: "Analytics",
  infrastructure: "Infrastructure",
  commerce: "Commerce",
  communication: "Communication",
  platform: "Platform",
  database: "Database",
};
