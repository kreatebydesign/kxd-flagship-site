import "server-only";

import { spawnWorkFromSource } from "../runner";
import { getWorkSourceAdapter } from "./contracts";
import { assignWorkNumber, linkRelationship } from "./relationships";
import type { SpawnWorkInput, SpawnWorkResult } from "./types";

/**
 * Canonical spawn entry point — external modules must use this (not raw Payload creates).
 */
export async function spawnWork(input: SpawnWorkInput): Promise<SpawnWorkResult> {
  const adapter = getWorkSourceAdapter(input.adapterKey);

  if (!adapter.supportsSpawning) {
    throw new Error(`Adapter "${adapter.displayName}" does not support spawning yet.`);
  }

  const result = await spawnWorkFromSource({
    clientId: input.clientId,
    title: input.title.trim(),
    summary: input.summary,
    source: adapter.collectionSource,
    sourceId: input.sourceId,
    category: input.category ?? adapter.defaultCategory,
    priority: input.priority ?? adapter.defaultPriority,
    clientVisible: input.clientVisible ?? false,
    timelineEnabled: input.timelineEnabled ?? true,
    createdBy: input.createdBy,
  });

  const workNumber = await assignWorkNumber(result.work.id);

  const shouldLink =
    input.linkSourceEntity !== false &&
    adapter.supportsRelationshipLinking &&
    adapter.defaultRelationshipType;

  if (shouldLink && adapter.defaultRelationshipType) {
    await linkRelationship({
      workId: result.work.id,
      type: adapter.defaultRelationshipType,
      entityId: input.sourceId,
      label: adapter.displayName,
      role: "source",
    });
  }

  return {
    ok: true,
    workId: result.work.id,
    workNumber,
    created: result.created,
  };
}
