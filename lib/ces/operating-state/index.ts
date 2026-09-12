/**
 * Shared Client Operating State — resolve business intent + evidence-bound presentation.
 * Pure module — no Payload / server-only imports.
 */

export type {
  CapabilityEvidenceState,
  ClientOperatingContent,
  ClientOperatingStateConfig,
  OperatingCapabilityEvidence,
  OperatingInfrastructureSignals,
  ResolvedCapabilityPresentation,
  ResolvedClientOperatingState,
  ResolvedWebsiteOperatingPresentation,
} from "./types";

export {
  mergeOperatingStateConfig,
  parseOperatingStateConfig,
} from "./parse";

export { resolveOperatingStateConfigForClient } from "./resolve-config";

export {
  resolveClientOperatingState,
  toPerformanceConnectionState,
} from "./resolve";
