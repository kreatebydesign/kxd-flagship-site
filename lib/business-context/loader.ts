import "server-only";

import { createDefaultBusinessContext } from "./defaults";
import { normalizeBusinessContext } from "./schema";
import type { BusinessContext, BusinessContextInput } from "./types";

let activeContext: BusinessContext = createDefaultBusinessContext();

/**
 * Load the active business context.
 * Phase 17E uses in-process context — no database queries.
 * Future phases may persist context without changing this read surface.
 */
export function loadBusinessContext(): BusinessContext {
  return { ...activeContext };
}

/** Replace the active business context after normalization */
export function setBusinessContext(input: BusinessContextInput): BusinessContext {
  activeContext = normalizeBusinessContext(input, activeContext);
  return loadBusinessContext();
}

/** Reset to KXD studio default context */
export function resetBusinessContext(): BusinessContext {
  activeContext = createDefaultBusinessContext();
  return loadBusinessContext();
}

/** Latest context reference for in-process consumers */
export function getActiveBusinessContext(): BusinessContext {
  return activeContext;
}
