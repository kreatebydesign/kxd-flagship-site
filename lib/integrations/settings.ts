import type { IntegrationSettingsSchema } from "./types";

export function buildSettingsSchema(
  partial: Omit<IntegrationSettingsSchema, "envVars" | "permissions"> &
    Partial<Pick<IntegrationSettingsSchema, "envVars" | "permissions">>,
): IntegrationSettingsSchema {
  return {
    envVars: partial.envVars ?? [],
    permissions: partial.permissions ?? [],
    apiKeys: partial.apiKeys,
    oauth: partial.oauth,
    webhooks: partial.webhooks,
    scopes: partial.scopes,
    documentationUrl: partial.documentationUrl,
  };
}

export function summarizeSettings(schema: IntegrationSettingsSchema): {
  hasApiKey: boolean;
  hasOAuth: boolean;
  hasWebhook: boolean;
  envCount: number;
  permissionCount: number;
} {
  return {
    hasApiKey: Boolean(schema.apiKeys?.length),
    hasOAuth: Boolean(schema.oauth),
    hasWebhook: Boolean(schema.webhooks?.length),
    envCount: schema.envVars.length,
    permissionCount: schema.permissions.length,
  };
}
