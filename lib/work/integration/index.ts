/**
 * Work Integration Layer — Phase 14C
 *
 * The only supported method for external KXD OS modules to interact with Work.
 * Internal use: Payload hooks, server routes, automation, future AI.
 */

export type {
  LinkRelationshipInput,
  LinkRelationshipResult,
  PublishWorkEventInput,
  SpawnWorkInput,
  SpawnWorkResult,
  UpdateWorkInput,
  UpdateWorkResult,
  WorkAdapterKey,
  WorkHealth,
  WorkIntegrationMetadata,
  WorkLifecycleEvent,
  WorkRelationshipRecord,
  WorkRelationshipType,
  WorkSourceAdapterDefinition,
} from "./types";

export {
  WORK_HEALTH_LABELS,
  WORK_INTEGRATION_METADATA_VERSION,
  formatWorkNumber,
  parseWorkNumber,
} from "./types";

export {
  WORK_SOURCE_ADAPTERS,
  adapterSupportsSpawning,
  getWorkSourceAdapter,
  listWorkSourceAdapters,
} from "./contracts";

export { spawnWork } from "./spawn";
export { updateWork, completeWork, archiveWork, startWork } from "./updates";
export {
  assignWorkNumber,
  linkRelationship,
  unlinkRelationship,
  readWorkRelationships,
  findRelationshipsByEntity,
} from "./relationships";
export { findWorkBySource, mergeWorkMetadata, resolveWorkIdFromNumber } from "./lookup";
export type { WorkSourceLookupResult } from "./lookup";
export { publishWorkEvent, resolveLifecycleEvent, publishWorkEventFromDoc } from "./events";

// Prepared — not for client/admin UI exposure yet
export { computeWorkHealth, computeWorkHealthFromDoc } from "./health";
