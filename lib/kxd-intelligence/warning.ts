import "server-only";

import { runIntelligencePipeline } from "./pipeline";
import type {
  IntelligenceQueryContext,
  OperationalWarning,
} from "./types";

/**
 * Operational warnings — quiet, evidence-bound, never spam.
 */
export async function getOperationalWarning(
  context: IntelligenceQueryContext = {},
): Promise<OperationalWarning | null> {
  const bundle = await runIntelligencePipeline(context, { warmPipeline: false });
  return bundle.warnings[0] ?? null;
}

export async function getOperationalWarnings(
  context: IntelligenceQueryContext = {},
): Promise<OperationalWarning[]> {
  const bundle = await runIntelligencePipeline(context, { warmPipeline: false });
  return bundle.warnings;
}
