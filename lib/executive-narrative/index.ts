/**
 * Phase 17D — Executive Narrative Layer Foundation
 *
 * Translates Brain + Pulse into founder-readable narrative.
 * Does not decide, recommend, automate, render UI, or use AI.
 *
 * Architecture:
 *   Observer → Business Brain → Pulse → Executive Narrative → Rituals → Automation
 */

export type {
  ExecutiveNarrativeResult,
  ExecutiveNarrativeInput,
  ExecutiveNarrativeDigest,
  NarrativeSection,
  NarrativeTone,
} from "./types";

export {
  NARRATIVE_SECTION_TITLES,
  OPENING_TEMPLATES,
  CLOSING_TEMPLATES,
  joinSentences,
  joinNatural,
} from "./templates";

export {
  resolveNarrativeTone,
  toneLabel,
  brainPosturePhrase,
} from "./tone";

export {
  buildOpeningSection,
  buildBusinessStateSection,
  buildChangesSection,
  buildAttentionSection,
  buildStabilitySection,
  buildClosingSection,
} from "./sections";

export { buildExecutiveNarrative } from "./narrative";
export { buildExecutiveNarrativeDigest } from "./digest";

export {
  runExecutiveNarrative,
  getLatestExecutiveNarrativeResult,
} from "./run";
