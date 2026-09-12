/**
 * Resolve effective operating-state config for compose.
 * Persisted CES config wins; optional content packs fill gaps (CONTENT only).
 */

import {
  mergeOperatingStateConfig,
  parseOperatingStateConfig,
  type ClientOperatingStateConfig,
} from "@/lib/ces/operating-state";
import { getClientContentPackOperatingState } from "@/lib/ces/content-packs";

export function resolveOperatingStateConfigForClient(input: {
  clientSlug: string | null | undefined;
  persisted?: unknown;
}): ClientOperatingStateConfig | null {
  const persisted = parseOperatingStateConfig(input.persisted);
  const pack = getClientContentPackOperatingState(input.clientSlug);
  // Persisted wins field-by-field; pack supplies authored defaults when absent.
  return mergeOperatingStateConfig(pack, persisted);
}
