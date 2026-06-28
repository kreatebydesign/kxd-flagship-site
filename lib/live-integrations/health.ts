import type { IntegrationConnectionStatus } from "@/lib/integrations/types";
import type { LiveDataFreshness, LiveHealthState, LiveSyncResult } from "./types";

export function deriveLiveHealth(input: {
  connectionStatus: IntegrationConnectionStatus;
  authenticationState: "valid" | "invalid" | "pending" | "unknown";
  syncErrors: string[];
  dataFreshness: LiveDataFreshness;
  lastSyncResult: LiveSyncResult | null;
}): LiveHealthState {
  if (input.connectionStatus === "not_connected" || input.connectionStatus === "disabled") {
    return "disconnected";
  }

  if (input.connectionStatus === "configuration_required") {
    return "configuration_required";
  }

  if (input.lastSyncResult?.status === "failed") {
    return "error";
  }

  if (input.authenticationState === "invalid") {
    return "error";
  }

  if (input.connectionStatus === "error" || input.syncErrors.length > 0) {
    return "warning";
  }

  if (input.dataFreshness === "stale" || input.authenticationState === "pending") {
    return "warning";
  }

  if (input.connectionStatus === "connected" && input.authenticationState === "valid") {
    return "healthy";
  }

  return "disconnected";
}

export function deriveDataFreshness(
  isFresh: boolean,
  hasData: boolean,
): LiveDataFreshness {
  if (!hasData) return "missing";
  return isFresh ? "fresh" : "stale";
}

export const LIVE_HEALTH_LABELS: Record<LiveHealthState, string> = {
  healthy: "Healthy",
  warning: "Warning",
  error: "Error",
  disconnected: "Disconnected",
  configuration_required: "Configuration Required",
};
