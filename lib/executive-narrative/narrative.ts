import { buildExecutiveNarrativeDigest } from "./digest";
import {
  buildAttentionSection,
  buildBusinessStateSection,
  buildChangesSection,
  buildClosingSection,
  buildOpeningSection,
  buildStabilitySection,
} from "./sections";
import { resolveNarrativeTone } from "./tone";
import type { ExecutiveNarrativeInput, ExecutiveNarrativeResult } from "./types";

/**
 * Assemble the full executive narrative from Brain + Pulse context.
 */
export function buildExecutiveNarrative(
  input: ExecutiveNarrativeInput,
): ExecutiveNarrativeResult {
  const overallTone = resolveNarrativeTone(input);

  const opening = buildOpeningSection(input);
  const businessState = buildBusinessStateSection(input);
  const changes = buildChangesSection(input);
  const attention = buildAttentionSection(input);
  const stability = buildStabilitySection(input);
  const closing = buildClosingSection(input, overallTone);

  const digest = buildExecutiveNarrativeDigest({
    opening,
    businessState,
    changes,
    attention,
    stability,
    closing,
    pulseHeadline: input.pulse.executiveDigest.headline,
  });

  return {
    generatedAt: input.pulse.generatedAt,
    opening,
    businessState,
    changes,
    attention,
    stability,
    closing,
    overallTone,
    digest,
  };
}
