import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { createExecutiveEvent } from "@/lib/executive-timeline/create-event";
import { isClientPlanKey } from "./catalog";
import { ALL_REPORTING_CAPABILITIES } from "@/lib/reporting/domain/capabilities";
import {
  normalizeModuleList,
  PORTAL_CES_ENTITLEMENT_KEYS,
} from "./modules";
import { resolveEntitlementsFromAssignment } from "./resolve";
import { assignmentFromClientDoc } from "./data";
import {
  buildPlanAccessActivityChanges,
  rejectInvalidOverrideModules,
  shouldSyncCesEnabledModules,
} from "./validate";
import type {
  ClientPlanKey,
  ClientPlanStatus,
  ResolvedClientEntitlements,
  UpdateClientPlanInput,
} from "./types";

/** Keys allowed in client-experience-profiles.enabledModules (CES + reporting). */
const SYNCABLE_ENABLED_MODULE_KEYS = new Set<string>([
  ...PORTAL_CES_ENTITLEMENT_KEYS,
  ...ALL_REPORTING_CAPABILITIES,
]);

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

/**
 * Persist plan assignment and sync CES enabledModules for non-legacy plans.
 * Does not delete legacy enabledModules fields — syncs content when explicit.
 * Paused plans do not wipe CES history (portal gate denies access instead).
 */
export async function updateClientPlanAssignment(
  clientId: number,
  input: UpdateClientPlanInput,
  options?: { actor?: string },
): Promise<ResolvedClientEntitlements> {
  if (input.planKey != null && !isClientPlanKey(input.planKey)) {
    throw new Error(`Unknown plan key: ${input.planKey}`);
  }

  const invalidAddOns = rejectInvalidOverrideModules(input.addOnModules ?? []);
  const invalidRemoved = rejectInvalidOverrideModules(
    input.removedModules ?? [],
  );
  const unknown = [...invalidAddOns.unknown, ...invalidRemoved.unknown];
  const internalOnly = [
    ...invalidAddOns.internalOnly,
    ...invalidRemoved.internalOnly,
  ];
  if (unknown.length) {
    throw new Error(
      `Unknown entitlement module(s): ${[...new Set(unknown)].join(", ")}`,
    );
  }
  if (internalOnly.length) {
    throw new Error(
      `Internal-only module(s) cannot be assigned as client overrides: ${[
        ...new Set(internalOnly),
      ].join(", ")}`,
    );
  }

  const payload = await getPayload({ config });
  let existing: Record<string, unknown>;
  try {
    existing = (await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    })) as unknown as Record<string, unknown>;
  } catch {
    throw new Error("Client not found.");
  }

  const previous = assignmentFromClientDoc(
    existing as Parameters<typeof assignmentFromClientDoc>[0],
  );

  const nextPlanKey = input.planKey;
  let nextStatus: ClientPlanStatus = input.planStatus;
  if (nextPlanKey == null && nextStatus !== "paused") {
    nextStatus = "legacy";
  }
  if (nextPlanKey != null && nextStatus === "legacy") {
    // Explicit plan assignment leaves legacy mode.
    nextStatus = "active";
  }

  const addOnModules = normalizeModuleList(input.addOnModules ?? []);
  const removedModules = normalizeModuleList(input.removedModules ?? []);

  const profiles = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-experience-profiles" as any,
    where: { client: { equals: clientId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const profile = profiles.docs[0] as
    | { id: number; enabledModules?: unknown }
    | undefined;
  const legacyEnabledModules = asStringArray(profile?.enabledModules);

  const resolved = resolveEntitlementsFromAssignment({
    clientId,
    assignment: {
      planKey: nextPlanKey,
      planStatus: nextStatus,
      planEffectiveAt: input.planEffectiveAt ?? new Date().toISOString(),
      planNote: input.planNote ?? null,
      addOnModules,
      removedModules,
    },
    legacyEnabledModules,
  });

  // Persist plan first, then CES sync. If sync fails, throw so API is not success.
  await payload.update({
    collection: "clients",
    id: clientId,
    // Plan fields added in Phase 35A — Payload generated types lag until regenerate.
    data: {
      planKey: nextPlanKey,
      planStatus: nextStatus,
      planEffectiveAt: input.planEffectiveAt ?? new Date().toISOString(),
      planNote: input.planNote ?? null,
      planAddOnModules: addOnModules,
      planRemovedModules: removedModules,
    } as Record<string, unknown>,
    overrideAccess: true,
  });

  if (shouldSyncCesEnabledModules(resolved) && profile) {
    const synced = resolved.effectiveModules.filter((key) =>
      SYNCABLE_ENABLED_MODULE_KEYS.has(key),
    );

    try {
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-experience-profiles" as any,
        id: profile.id,
        data: { enabledModules: synced },
        overrideAccess: true,
      });
    } catch (err) {
      console.error("[KXD Client Plans] CES sync failed after plan update:", err);
      throw new Error("Unable to update plan.");
    }
  }

  try {
    const changes = buildPlanAccessActivityChanges(previous, {
      planKey: nextPlanKey,
      planStatus: nextStatus,
      addOnModules,
      removedModules,
    });

    if (changes.length) {
      await createExecutiveEvent(
        {
          client: clientId,
          eventType: "client.plan.updated",
          title: "Client plan / access updated",
          summary: changes.join(" · "),
          category: "system",
          importance: "normal",
          sourceModule: "Client Command",
          createdBy: options?.actor ?? "KXD Operator",
          internalOnly: true,
          metadata: {
            planKey: nextPlanKey,
            planStatus: nextStatus,
            addOnModules,
            removedModules,
            // planNote intentionally omitted from activity metadata
          },
        },
        payload,
      );
    }
  } catch (err) {
    console.error("[KXD Client Plans] Activity publish failed:", err);
  }

  return resolved;
}

/**
 * Apply plan at launch/provision time without requiring a prior client row update dance.
 */
export async function assignPlanOnClientCreate(
  clientId: number,
  input: {
    planKey: ClientPlanKey;
    addOnModules?: string[];
    removedModules?: string[];
    actor?: string;
  },
): Promise<ResolvedClientEntitlements> {
  return updateClientPlanAssignment(
    clientId,
    {
      planKey: input.planKey,
      planStatus: "active",
      planEffectiveAt: new Date().toISOString(),
      addOnModules: input.addOnModules ?? [],
      removedModules: input.removedModules ?? [],
      planNote: null,
    },
    { actor: input.actor },
  );
}
