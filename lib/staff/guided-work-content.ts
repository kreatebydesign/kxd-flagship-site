/**
 * Staff guided work — presentation of stored Work fields (no mutation of source text).
 */
import { splitWorkNotes } from "./work-execution-notes";
import { formatInstructionBlocks } from "./work-deliverables";

const EXPECTED_OUTCOME_MARKER = /^\[Expected outcome\]\s*\n?/i;

export type GuidedWorkBrief = {
  /** Short outcome / intent (Work.summary or legacy summary lead). */
  expectedOutcome: string | null;
  /** Operator instructions — preserved line breaks via instructionBlocks. */
  instructionBlocks: string[];
};

export function parseStudioNotesAndOutcome(rawNotes: string | null | undefined): {
  studioNotes: string | null;
  staffProgress: string | null;
  expectedOutcomeFromNotes: string | null;
} {
  const { studioNotes, staffProgress } = splitWorkNotes(rawNotes);
  if (!studioNotes?.trim()) {
    return { studioNotes: null, staffProgress, expectedOutcomeFromNotes: null };
  }
  const trimmed = studioNotes.trim();
  if (EXPECTED_OUTCOME_MARKER.test(trimmed)) {
    const body = trimmed.replace(EXPECTED_OUTCOME_MARKER, "").trim();
    return {
      studioNotes: null,
      staffProgress,
      expectedOutcomeFromNotes: body || null,
    };
  }
  return { studioNotes: trimmed, staffProgress, expectedOutcomeFromNotes: null };
}

function splitLeadFromNumberedSteps(text: string): { lead: string | null; numberedTail: string | null } {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const lineBreakBeforeStep = normalized.search(/\n(?=\d+\.\s)/);
  if (lineBreakBeforeStep >= 0) {
    const lead = normalized.slice(0, lineBreakBeforeStep).trim();
    const numberedTail = normalized.slice(lineBreakBeforeStep).trim();
    return { lead: lead || null, numberedTail: numberedTail || null };
  }
  if (/^\d+\.\s/.test(normalized)) {
    return { lead: null, numberedTail: normalized };
  }
  return { lead: normalized, numberedTail: null };
}

/** When legacy assignments stored steps in summary, hide numbered tail if deliverables exist. */
export function splitLegacySummaryBody(
  summary: string | null | undefined,
  hasStructuredDeliverables: boolean,
): { lead: string | null; tailForInstructions: string | null } {
  if (!summary?.trim()) return { lead: null, tailForInstructions: null };
  const normalized = summary.replace(/\r\n/g, "\n").trim();
  const parts = normalized.split(/\n{2,}/);
  if (parts.length === 1) {
    const { lead, numberedTail } = splitLeadFromNumberedSteps(normalized);
    if (hasStructuredDeliverables && numberedTail) {
      return { lead, tailForInstructions: null };
    }
    return { lead: lead ?? normalized, tailForInstructions: numberedTail };
  }
  const lead = parts[0]?.trim() || null;
  const tail = parts.slice(1).join("\n\n").trim();
  if (!tail) return { lead, tailForInstructions: null };
  if (hasStructuredDeliverables && /^\d+\.\s/m.test(tail)) {
    return { lead, tailForInstructions: null };
  }
  const { lead: tailLead, numberedTail } = splitLeadFromNumberedSteps(tail);
  if (hasStructuredDeliverables && numberedTail) {
    const mergedLead = [lead, tailLead].filter(Boolean).join("\n\n").trim();
    return { lead: mergedLead || lead, tailForInstructions: null };
  }
  return { lead, tailForInstructions: tail };
}

export function resolveGuidedWorkBrief(input: {
  summary: string | null;
  description: string | null;
  expectedOutcomeFromNotes: string | null;
  hasStructuredDeliverables: boolean;
}): GuidedWorkBrief {
  const { lead, tailForInstructions } = splitLegacySummaryBody(
    input.summary,
    input.hasStructuredDeliverables,
  );

  const expectedOutcome =
    input.expectedOutcomeFromNotes?.trim() ||
    (input.description?.trim() ? input.summary?.trim() || null : lead) ||
    (!input.description?.trim() ? lead : null);

  const instructionParts: string[] = [];
  if (input.description?.trim()) instructionParts.push(input.description.trim());
  if (tailForInstructions?.trim()) instructionParts.push(tailForInstructions);
  if (lead?.trim() && lead.trim() !== expectedOutcome?.trim()) {
    instructionParts.push(lead.trim());
  }
  if (
    !input.description?.trim() &&
    !input.hasStructuredDeliverables &&
    input.summary?.trim()
  ) {
    instructionParts.push(input.summary.trim());
  }

  const instructionSource = instructionParts.join("\n\n");

  return {
    expectedOutcome,
    instructionBlocks: formatInstructionBlocks(instructionSource),
  };
}
