import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { isClientPlanKey } from "./catalog";
import { normalizeModuleList } from "./modules";
import {
  clientHasModule,
  resolveEntitlementsFromAssignment,
} from "./resolve";
import type {
  ClientPlanAssignment,
  ClientPlanKey,
  ClientPlanStatus,
  ResolvedClientEntitlements,
} from "./types";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function parsePlanStatus(value: unknown): ClientPlanStatus {
  if (
    value === "active" ||
    value === "trial" ||
    value === "paused" ||
    value === "legacy"
  ) {
    return value;
  }
  return "legacy";
}

function parsePlanKey(value: unknown): ClientPlanKey | null {
  if (typeof value !== "string" || !value) return null;
  return isClientPlanKey(value) ? value : null;
}

export function assignmentFromClientDoc(doc: {
  planKey?: unknown;
  planStatus?: unknown;
  planEffectiveAt?: unknown;
  planNote?: unknown;
  planAddOnModules?: unknown;
  planRemovedModules?: unknown;
}): ClientPlanAssignment {
  const planKey = parsePlanKey(doc.planKey);
  let planStatus = parsePlanStatus(doc.planStatus);
  // Unassigned clients are always treated as legacy for access continuity.
  if (planKey == null && planStatus !== "paused") {
    planStatus = "legacy";
  }

  return {
    planKey,
    planStatus,
    planEffectiveAt:
      typeof doc.planEffectiveAt === "string" ? doc.planEffectiveAt : null,
    planNote: typeof doc.planNote === "string" ? doc.planNote : null,
    addOnModules: normalizeModuleList(asStringArray(doc.planAddOnModules)),
    removedModules: normalizeModuleList(asStringArray(doc.planRemovedModules)),
  };
}

async function loadLegacyEnabledModules(
  clientId: number,
): Promise<string[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-experience-profiles" as any,
    where: { client: { equals: clientId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const doc = result.docs[0] as { enabledModules?: unknown } | undefined;
  return asStringArray(doc?.enabledModules);
}

/**
 * Resolve entitlements for a client from Shared Core (session-derived clientId only).
 */
export async function resolveClientEntitlements(
  clientId: number,
): Promise<ResolvedClientEntitlements> {
  const payload = await getPayload({ config });
  const client = await payload.findByID({
    collection: "clients",
    id: clientId,
    depth: 0,
    overrideAccess: true,
  });

  const assignment = assignmentFromClientDoc(
    client as Parameters<typeof assignmentFromClientDoc>[0],
  );
  const legacyEnabledModules = await loadLegacyEnabledModules(clientId);

  return resolveEntitlementsFromAssignment({
    clientId,
    assignment,
    legacyEnabledModules,
  });
}

export async function clientHasEntitlement(
  clientId: number,
  moduleKey: string,
): Promise<boolean> {
  const entitlements = await resolveClientEntitlements(clientId);
  return clientHasModule(entitlements, moduleKey);
}

export class ClientEntitlementError extends Error {
  readonly status = 403;
  readonly code = "entitlement_denied";

  constructor(
    readonly clientId: number,
    readonly moduleKey: string,
  ) {
    super(`Client ${clientId} is not entitled to module "${moduleKey}".`);
    this.name = "ClientEntitlementError";
  }
}

export async function requireClientEntitlement(
  clientId: number,
  moduleKey: string,
): Promise<ResolvedClientEntitlements> {
  const entitlements = await resolveClientEntitlements(clientId);
  if (!clientHasModule(entitlements, moduleKey)) {
    throw new ClientEntitlementError(clientId, moduleKey);
  }
  return entitlements;
}
