import "server-only";

import type { IntegrationProviderId, IntegrationSyncSchedule } from "@/lib/integrations/types";
import { DEFAULT_PROVIDER_TTL_SECONDS } from "./cache";

/** Architecture-only sync schedules — no cron or polling implementation */
export const LIVE_SYNC_SCHEDULES: IntegrationSyncSchedule[] = [
  { providerId: "payload", intervalMinutes: 2, enabled: true },
  { providerId: "neon-postgresql", intervalMinutes: 5, enabled: true },
  { providerId: "stripe", intervalMinutes: 10, enabled: true },
  { providerId: "github", intervalMinutes: 5, enabled: true },
  { providerId: "vercel", intervalMinutes: 3, enabled: true },
  { providerId: "cloudflare", intervalMinutes: 10, enabled: true },
  { providerId: "resend", intervalMinutes: 15, enabled: true },
  { providerId: "google-analytics-4", intervalMinutes: 60, enabled: true },
  { providerId: "google-search-console", intervalMinutes: 60, enabled: true },
  { providerId: "google-business-profile", intervalMinutes: 60, enabled: true },
  { providerId: "google-workspace", intervalMinutes: 30, enabled: false },
  { providerId: "microsoft-365", intervalMinutes: 30, enabled: false },
];

export function getScheduleForProvider(providerId: IntegrationProviderId): IntegrationSyncSchedule {
  const found = LIVE_SYNC_SCHEDULES.find((s) => s.providerId === providerId);
  const ttlSeconds = DEFAULT_PROVIDER_TTL_SECONDS[providerId] ?? 600;
  return found ?? {
    providerId,
    intervalMinutes: Math.ceil(ttlSeconds / 60),
    enabled: true,
  };
}

export function computeNextSyncAt(providerId: IntegrationProviderId, fromIso?: string): string {
  const schedule = getScheduleForProvider(providerId);
  const base = fromIso ? new Date(fromIso) : new Date();
  base.setMinutes(base.getMinutes() + schedule.intervalMinutes);
  return base.toISOString();
}

/** Future: enqueue background worker job */
export interface ScheduledSyncJobPlaceholder {
  providerId: IntegrationProviderId;
  scheduledAt: string;
  status: "queued" | "deferred";
}

export function planScheduledSyncJobs(): ScheduledSyncJobPlaceholder[] {
  return LIVE_SYNC_SCHEDULES
    .filter((s) => s.enabled)
    .map((s) => ({
      providerId: s.providerId,
      scheduledAt: computeNextSyncAt(s.providerId),
      status: "deferred" as const,
    }));
}
