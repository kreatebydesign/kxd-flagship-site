/**
 * Phase 17E — Business Context Foundation
 *
 * Interpretation context for how the same fact means different things per business.
 * Never replaces observations, overrides facts, or renders UI.
 *
 * Architecture:
 *   Observer → Brain → Pulse → Narrative → Rituals
 *                                    ↑
 *                            Business Context (interpretation lens)
 */

export type {
  BusinessContext,
  BusinessContextInput,
  BusinessModel,
  OperatingStyle,
  BusinessMaturity,
  BusinessPriority,
  BusinessPriorityKey,
  BusinessGoal,
  BusinessGoalHorizon,
  BusinessGoalEmphasis,
  BusinessDomain,
  BusinessDomainKey,
  SuccessIndicator,
  ContextObservationPattern,
  ContextInterpretationInput,
  ContextInterpretationResult,
} from "./types";

export {
  normalizeBusinessContext,
  normalizeBusinessModel,
  normalizeOperatingStyle,
  isValidBusinessContext,
} from "./schema";

export {
  KXD_STUDIO_BUSINESS_CONTEXT,
  CREATIVE_AGENCY_CONTEXT,
  CONSTRUCTION_CONTEXT,
  RESTAURANT_OPENING_CONTEXT,
  BUSINESS_CONTEXT_PRESETS,
  createDefaultBusinessContext,
} from "./defaults";

export {
  BUSINESS_DOMAIN_LABELS,
  DOMAIN_DESCRIPTIONS,
  INTERPRETATION_LENSES,
  domainLabel,
  domainWeight,
  topDomains,
  contextualMeaningForPattern,
} from "./domains";

export {
  interpretWithContext,
  contextWeightForDomain,
  primaryPriorityLabel,
  summarizeBusinessContext,
  isDomainImportant,
} from "./context";

export {
  loadBusinessContext,
  setBusinessContext,
  resetBusinessContext,
  getActiveBusinessContext,
} from "./loader";
