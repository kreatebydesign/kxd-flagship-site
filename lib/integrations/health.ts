import type {
  IntegrationConnectionStatus,
  IntegrationHealthState,
  IntegrationProviderId,
  IntegrationValidationState,
} from "./types";

export function deriveHealthFromStatus(
  status: IntegrationConnectionStatus,
): IntegrationHealthState {
  switch (status) {
    case "connected":
      return "healthy";
    case "configuration_required":
      return "pending_configuration";
    case "not_connected":
    case "disabled":
      return "disconnected";
    case "error":
      return "warning";
    default:
      return "unknown";
  }
}

export function deriveValidationState(
  configured: string[],
  missingRequired: string[],
): IntegrationValidationState {
  if (missingRequired.length === 0 && configured.length > 0) return "valid";
  if (configured.length > 0 && missingRequired.length > 0) return "pending";
  if (configured.length === 0) return "unknown";
  return "invalid";
}

export function statusBadgeVariant(status: IntegrationConnectionStatus): "success" | "critical" | "warning" | "default" | "status" | "pending" {
  switch (status) {
    case "connected":
      return "success";
    case "error":
      return "critical";
    case "configuration_required":
      return "warning";
    case "disabled":
      return "default";
    case "not_connected":
      return "pending";
    default:
      return "status";
  }
}

export function healthBadgeVariant(health: IntegrationHealthState): "success" | "critical" | "warning" | "default" | "status" | "pending" {
  switch (health) {
    case "healthy":
      return "success";
    case "warning":
      return "warning";
    case "disconnected":
      return "pending";
    case "pending_configuration":
      return "warning";
    default:
      return "status";
  }
}

/** Deterministic last-sync placeholder — no live sync yet */
export function placeholderLastSync(
  providerId: IntegrationProviderId,
  status: IntegrationConnectionStatus,
): string | null {
  if (status !== "connected") return null;
  const offsets: Record<string, number> = {
    payload: 0,
    "neon-postgresql": 1,
    stripe: 2,
    resend: 3,
    vercel: 4,
  };
  const hours = offsets[providerId] ?? 6;
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}
