/**
 * Client-safe exports for proposal conversion.
 */
export type {
  ConversionEngineResult,
  ConversionIntelligenceSignal,
  ConversionIntelligenceSnapshot,
  ConversionMode,
  ConversionResultPayload,
  ConversionStatus,
  ExecutiveConversionWidget,
  ExecutiveConversionWidgetItem,
  LaunchStatus,
  WorkspaceContractRow,
  WorkspaceContractsSnapshot,
  WorkspaceConversionRow,
} from "./types";

export {
  CONVERSION_MODES,
  CONVERSION_STATUS_LABELS,
  LAUNCH_STATUS_LABELS,
  displayConversionStatus,
  displayLaunchStatus,
  formatConversionMode,
} from "./lifecycle";
