import "server-only";

import type { IntegrationProviderId } from "@/lib/integrations/types";
import { getIntegrationProviderIds } from "@/lib/integrations/registry";
import { ensureIntegrationProvidersRegistered } from "@/lib/integrations/providers";
import { syncGa4 } from "./ga4";
import { syncGitHub } from "./github";
import { syncGoogleBusiness } from "./google-business";
import { syncCloudflare } from "./cloudflare";
import { syncMicrosoft365 } from "./microsoft365";
import { syncNeon } from "./neon";
import { syncPayload } from "./payload";
import { syncResend } from "./resend";
import { syncSearchConsole } from "./search-console";
import { syncStripe } from "./stripe";
import { syncVercel } from "./vercel";
import { syncWorkspace } from "./workspace";

export interface ProviderSyncHandler {
  providerId: IntegrationProviderId;
  sync: () => Promise<{
    normalized: unknown | null;
    recordsProcessed: number;
    error?: string;
  }>;
}

const HANDLERS: ProviderSyncHandler[] = [
  { providerId: "github", sync: syncGitHub },
  { providerId: "vercel", sync: syncVercel },
  { providerId: "google-analytics-4", sync: syncGa4 },
  { providerId: "google-search-console", sync: syncSearchConsole },
  { providerId: "stripe", sync: syncStripe },
  { providerId: "cloudflare", sync: syncCloudflare },
  { providerId: "google-business-profile", sync: syncGoogleBusiness },
  { providerId: "google-workspace", sync: syncWorkspace },
  { providerId: "microsoft-365", sync: syncMicrosoft365 },
  { providerId: "resend", sync: syncResend },
  { providerId: "payload", sync: syncPayload },
  { providerId: "neon-postgresql", sync: syncNeon },
];

export function getLiveProviderHandler(providerId: IntegrationProviderId): ProviderSyncHandler | null {
  ensureIntegrationProvidersRegistered();
  return HANDLERS.find((h) => h.providerId === providerId) ?? null;
}

export function getAllLiveProviderHandlers(): ProviderSyncHandler[] {
  ensureIntegrationProvidersRegistered();
  return HANDLERS;
}

export function getRegisteredLiveProviderIds(): IntegrationProviderId[] {
  ensureIntegrationProvidersRegistered();
  return getIntegrationProviderIds().filter((id) =>
    HANDLERS.some((h) => h.providerId === id),
  );
}
