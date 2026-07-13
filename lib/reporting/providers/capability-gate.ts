/**
 * Phase 29C — Capability gate helpers (pure, no Payload).
 */

import type { ReportingCapabilityId } from "@/lib/reporting/domain";

export function isCapabilityEnabled(
  enabledCapabilities: ReportingCapabilityId[],
  capabilityId: ReportingCapabilityId,
): boolean {
  return enabledCapabilities.includes(capabilityId);
}
