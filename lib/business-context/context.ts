import type {
  BusinessContext,
  BusinessDomainKey,
  ContextInterpretationInput,
  ContextInterpretationResult,
} from "./types";
import { contextualMeaningForPattern, domainWeight } from "./domains";

/**
 * Interpret a generic business meaning through the active business context.
 * Does not modify or override the underlying observation fact.
 */
export function interpretWithContext(
  context: BusinessContext,
  input: ContextInterpretationInput,
): ContextInterpretationResult {
  const businessModel = context.businessModel ?? "custom";
  const contextualMeaning = contextualMeaningForPattern(
    input.pattern,
    businessModel,
    input.genericMeaning,
  );

  return {
    pattern: input.pattern,
    genericMeaning: input.genericMeaning,
    contextualMeaning,
    businessModel,
    applied: contextualMeaning !== input.genericMeaning,
  };
}

/**
 * Weight for a domain based on business context priorities.
 * Future Brain, Pulse, and Narrative layers can use this for weighting.
 */
export function contextWeightForDomain(
  context: BusinessContext,
  domain: BusinessDomainKey,
): number {
  return domainWeight(context, domain);
}

/**
 * Resolve the highest-weight priority label for narrative context.
 */
export function primaryPriorityLabel(context: BusinessContext): string | null {
  const sorted = [...context.priorities].sort((a, b) => b.weight - a.weight);
  return sorted[0]?.label ?? null;
}

/**
 * Short context summary for downstream layers — descriptive only.
 */
export function summarizeBusinessContext(context: BusinessContext): string {
  const parts: string[] = [];

  if (context.businessName) {
    parts.push(context.businessName);
  }

  if (context.industry) {
    parts.push(context.industry);
  }

  if (context.businessModel) {
    parts.push(`${context.businessModel.replace(/-/g, " ")} operating model`);
  }

  if (context.operatingStyle) {
    parts.push(`${context.operatingStyle.replace(/-/g, " ")} rhythm`);
  }

  const primary = primaryPriorityLabel(context);
  if (primary) {
    parts.push(`primary priority: ${primary}`);
  }

  return parts.length > 0
    ? `Business context: ${parts.join(" · ")}.`
    : "Business context is configured.";
}

/**
 * Check whether a domain is materially important in this business context.
 */
export function isDomainImportant(
  context: BusinessContext,
  domain: BusinessDomainKey,
  threshold = 60,
): boolean {
  return contextWeightForDomain(context, domain) >= threshold;
}
