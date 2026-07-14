/**
 * Whether Executive Client Briefing is available for a client slug.
 * Controlled by presentation configuration + authored Executive Memory.
 */

import { getExecutivePresentation } from "@/lib/ces/executive-performance/presentation";
import { hasExecutiveMemory } from "@/lib/executive-memory";

export function isExecutiveClientBriefingAvailable(
  clientSlug: string | null | undefined,
): boolean {
  if (!clientSlug) return false;
  const presentation = getExecutivePresentation(clientSlug);
  if (!presentation?.briefingEnabled) return false;
  return hasExecutiveMemory(clientSlug);
}
