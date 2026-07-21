/**
 * Pure validation helpers for Client Plans admin API and updates.
 * Kept free of server-only so verification scripts can import them.
 */

import { isClientPlanKey } from "./catalog";
import {
  isInternalOnlyEntitlement,
  rejectUnknownModules,
} from "./modules";
import type { ClientPlanAssignment, ClientPlanStatus } from "./types";

export function parseRouteClientId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

/**
 * Body must never supply a different client identity than the route.
 * Returns an error message when a conflicting clientId is present.
 */
export function rejectBodyClientIdMismatch(
  routeClientId: number,
  body: unknown,
): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (!("clientId" in record) && !("client" in record)) return null;

  const raw = record.clientId ?? record.client;
  if (raw == null || raw === "") return null;

  const bodyId =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && /^\d+$/.test(raw)
        ? Number(raw)
        : NaN;

  if (!Number.isInteger(bodyId) || bodyId <= 0) {
    return "Invalid client identity in request body.";
  }
  if (bodyId !== routeClientId) {
    return "Client identity mismatch.";
  }
  return null;
}

export function isClientPlanStatus(value: unknown): value is ClientPlanStatus {
  return (
    value === "active" ||
    value === "trial" ||
    value === "paused" ||
    value === "legacy"
  );
}

/**
 * Reject unknown keys and internal-only keys for client-facing overrides.
 */
export function rejectInvalidOverrideModules(
  values: readonly string[],
): { unknown: string[]; internalOnly: string[] } {
  const unknown = rejectUnknownModules(values);
  const knownOrAlias = values.filter((v) => !unknown.includes(v));
  const internalOnly = knownOrAlias.filter((v) => isInternalOnlyEntitlement(v));
  return { unknown, internalOnly };
}

export function shouldSyncCesEnabledModules(input: {
  isLegacy: boolean;
  isPaused: boolean;
}): boolean {
  // Paused must not wipe CES history — portal gate denies access instead.
  // Legacy must preserve historical enabledModules without overwrite.
  return !input.isLegacy && !input.isPaused;
}

export function buildPlanAccessActivityChanges(
  previous: Pick<
    ClientPlanAssignment,
    "planKey" | "planStatus" | "addOnModules" | "removedModules"
  >,
  next: Pick<
    ClientPlanAssignment,
    "planKey" | "planStatus" | "addOnModules" | "removedModules"
  >,
): string[] {
  const changes: string[] = [];
  if (previous.planKey !== next.planKey) {
    changes.push(
      `Plan ${previous.planKey ?? "none"} → ${next.planKey ?? "none"}`,
    );
  }
  if (previous.planStatus !== next.planStatus) {
    changes.push(`Status ${previous.planStatus} → ${next.planStatus}`);
  }

  const added = next.addOnModules.filter(
    (m) => !previous.addOnModules.includes(m),
  );
  const droppedAddOns = previous.addOnModules.filter(
    (m) => !next.addOnModules.includes(m),
  );
  const newlyRemoved = next.removedModules.filter(
    (m) => !previous.removedModules.includes(m),
  );
  const restored = previous.removedModules.filter(
    (m) => !next.removedModules.includes(m),
  );

  if (added.length) changes.push(`Add-ons enabled: ${added.join(", ")}`);
  if (droppedAddOns.length) {
    changes.push(`Add-ons disabled: ${droppedAddOns.join(", ")}`);
  }
  if (newlyRemoved.length) {
    changes.push(`Modules removed: ${newlyRemoved.join(", ")}`);
  }
  if (restored.length) {
    changes.push(`Modules restored: ${restored.join(", ")}`);
  }

  return changes;
}

/** Safe operator-facing messages; never return raw DB errors. */
export function planUpdateErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Unable to update plan.";
  const message = err.message;
  if (
    message.startsWith("Unknown plan key:") ||
    message.startsWith("Unknown entitlement module") ||
    message.startsWith("Internal-only module") ||
    message === "Client not found."
  ) {
    return message;
  }
  return "Unable to update plan.";
}

export function assertPlanKeyOrNull(
  value: string | null | undefined,
): asserts value is string | null | undefined {
  if (value == null || value === "") return;
  if (!isClientPlanKey(value)) {
    throw new Error(`Unknown plan key: ${value}`);
  }
}
