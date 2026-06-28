import type {
  IntegrationConnectionSnapshot,
  IntegrationProviderDefinition,
  IntegrationProviderId,
} from "./types";
import {
  deriveHealthFromStatus,
  deriveValidationState,
  placeholderLastSync,
} from "./health";

function envPresent(key: string): boolean {
  const v = process.env[key];
  return typeof v === "string" && v.trim().length > 0;
}

function resolveEnvVars(definition: IntegrationProviderDefinition): {
  configured: string[];
  missingRequired: string[];
} {
  const configured: string[] = [];
  const missingRequired: string[] = [];

  for (const req of definition.settingsSchema.envVars) {
    if (envPresent(req.key)) {
      configured.push(req.key);
    } else if (req.required) {
      missingRequired.push(req.key);
    }
  }

  return { configured, missingRequired };
}

function resolveStatus(
  definition: IntegrationProviderDefinition,
  configured: string[],
  missingRequired: string[],
): IntegrationConnectionSnapshot["status"] {
  if (definition.id === "payload") return "connected";

  if (missingRequired.length === 0 && configured.length > 0) return "connected";
  if (configured.length > 0 && missingRequired.length > 0) return "configuration_required";
  if (configured.length === 0) return "not_connected";
  return "unknown";
}

export function resolveConnectionSnapshot(
  definition: IntegrationProviderDefinition,
): IntegrationConnectionSnapshot {
  const { configured, missingRequired } = resolveEnvVars(definition);
  const status = resolveStatus(definition, configured, missingRequired);
  const validationState = deriveValidationState(configured, missingRequired);

  return {
    providerId: definition.id,
    status,
    health: deriveHealthFromStatus(status),
    lastSync: placeholderLastSync(definition.id, status),
    validationState,
    configuredEnvVars: configured,
    missingRequiredEnvVars: missingRequired,
  };
}

export function isProviderId(value: string): value is IntegrationProviderId {
  return [
    "github",
    "vercel",
    "google-analytics-4",
    "google-search-console",
    "stripe",
    "cloudflare",
    "google-business-profile",
    "google-workspace",
    "microsoft-365",
    "resend",
    "payload",
    "neon-postgresql",
  ].includes(value);
}
