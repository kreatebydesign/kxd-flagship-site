/**
 * Phase 32A — Executive Memory (Shared Core).
 * Per-client living memory for Executive Performance + Client Summary.
 */

export type {
  ExecutiveAwaitingOwner,
  ExecutiveBriefingSectionId,
  ExecutiveMemoryEvidenceStrength,
  ExecutiveMemoryItem,
  ExecutiveMemoryKind,
  ExecutiveMemoryLens,
  ExecutiveMemorySlice,
  ExecutiveMemoryStatus,
  ExecutivePlatformOpportunity,
} from "./types";

export {
  getExecutiveMemoryLens,
  hasExecutiveMemory,
  listExecutiveMemoryClientSlugs,
} from "./registry";

export {
  composeExecutiveMemorySlice,
  memoryStatementsByKind,
  memoryToEvolutionItems,
  memoryToMilestones,
  memoryToPartnershipItems,
  memoryToStoryBeats,
} from "./compose";
