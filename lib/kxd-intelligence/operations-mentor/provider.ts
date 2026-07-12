/**
 * Provider boundary — UI never couples to a vendor.
 * Deterministic guidance is default. Model routing is future-ready.
 */

import type { GuidanceTaskComplexity, OperationsGuidanceResponse, OperationsMentorContext } from "./types";

export interface GuidanceProvider {
  id: string;
  /** Whether this provider may be used for a complexity class. */
  supports(complexity: GuidanceTaskComplexity): boolean;
  /**
   * Optional interpretation layer. Return null to keep deterministic answer.
   * Must not be called on page load — only after intentional request.
   */
  interpret?(
    context: OperationsMentorContext,
    draft: Omit<OperationsGuidanceResponse, "usage">,
  ): Promise<Partial<Omit<OperationsGuidanceResponse, "usage">> | null>;
}

/** Default provider — no vendor, no background generation. */
export const DeterministicGuidanceProvider: GuidanceProvider = {
  id: "deterministic",
  supports() {
    return true;
  },
  async interpret() {
    return null;
  },
};

let activeProvider: GuidanceProvider = DeterministicGuidanceProvider;

export function getGuidanceProvider(): GuidanceProvider {
  return activeProvider;
}

/**
 * Future model routing registers here without changing mentor UI.
 */
export function setGuidanceProvider(provider: GuidanceProvider): void {
  activeProvider = provider;
}

export function resetGuidanceProvider(): void {
  activeProvider = DeterministicGuidanceProvider;
}

/**
 * Only escalate to interpretation when judgment is needed and draft confidence is low.
 */
export function shouldAttemptInterpretation(
  complexity: GuidanceTaskComplexity,
  draftConfidence: OperationsGuidanceResponse["confidence"],
): boolean {
  if (complexity === "lookup" || complexity === "review") return false;
  if (draftConfidence === "high") return false;
  return getGuidanceProvider().id !== "deterministic";
}
