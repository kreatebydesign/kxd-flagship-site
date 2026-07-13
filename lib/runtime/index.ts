/**
 * Phase 30B — KXD OS Runtime Contract public surface.
 *
 * Boundary:
 * - Product/domain logic stays in Shared Core (remote Payload/Next/Neon)
 * - Runtime adapters expose host capabilities only
 * - Never import Tauri/Electron from application code
 */

export type {
  KxdCapabilityId,
  KxdCapabilityState,
  KxdCapabilitySupport,
  KxdRuntimeCapabilities,
  KxdRuntimeInfo,
  KxdRuntimeKind,
  KxdRuntimeSurface,
} from "./types";
export {
  KXD_CAPABILITY_IDS,
  KXD_RUNTIME_CONTRACT_VERSION,
} from "./types";

export type {
  KxdRuntimeError,
  KxdRuntimeErrorCode,
  KxdRuntimeFail,
  KxdRuntimeOk,
  KxdRuntimeResult,
} from "./errors";
export {
  runtimeFail,
  runtimeOk,
  sanitizeErrorDetails,
  unsupported,
} from "./errors";

export {
  allUnsupported,
  capabilityState,
  expectedCapabilitiesForKind,
  isCapabilityUsable,
} from "./capabilities";

export type { KxdRuntimeAdapter } from "./adapter";

export {
  clearRuntimeAdapter,
  getRuntimeAdapter,
  registerRuntimeAdapter,
  requireRuntimeAdapter,
} from "./registry";

export {
  detectRuntime,
  detectRuntimeKind,
  detectRuntimeSurface,
} from "./detect";
export type { DetectedRuntime } from "./detect";

export {
  initializeRuntime,
  getInitializedRuntime,
  resetRuntime,
} from "./initialize";

export { WebRuntimeAdapter } from "./adapters/web";

export {
  NATIVE_BRIDGE_COMMANDS,
  NATIVE_BRIDGE_PROTOCOL_VERSION,
  FORBIDDEN_BRIDGE_CAPABILITIES,
  detectNativeBridgeHost,
  invokeNativeBridge,
  isNativeBridgeCommand,
  validateBridgeRequest,
} from "./bridge";
export type {
  NativeBridgeCommand,
  NativeBridgeHostHint,
  NativeBridgeRequest,
  NativeBridgeResponse,
} from "./bridge";

export {
  runtimeEvents,
  KxdRuntimeEventBus,
} from "./events";
export type {
  KxdConnectivityStatus,
  KxdRuntimeEventMap,
  KxdRuntimeEventName,
} from "./events";

export {
  detectBrowserTimezone,
  formatDateOnly,
  formatInTimezone,
  parseDateOnly,
  parseUtcIso,
  resolvePresentationTimezone,
  toUtcIso,
  DATETIME_HYDRATION_NOTE,
  EXECUTIVE_INTELLIGENCE_FOOTER_TIMEZONE_DEBT,
} from "./datetime";
export type {
  DateOnly,
  ResolveTimezoneInput,
  ResolvedTimezone,
  TimezoneSource,
} from "./datetime";

export {
  detectBrowserConnectivity,
  mayAttemptBusinessMutation,
  mayMutateBusinessState,
  resolveConnectivity,
} from "./connectivity";
export type { ConnectivitySnapshot } from "./connectivity";

export {
  AUTH_CONTRACT,
  OAUTH_RETURN_POLICY,
  SIGN_OUT_CONTRACT,
} from "./auth";
export type {
  AuthContractRules,
  AuthSessionKind,
  OAuthReturnPolicy,
  SignOutScope,
} from "./auth";

export {
  DEEP_LINK_ALLOWED_PREFIXES,
  KXD_APP_PROTOCOL,
  deepLinkToBrowserHref,
  isDeepLinkAllowed,
  parseDeepLink,
  validateDeepLinkSegments,
} from "./deep-links";
export type { DeepLinkParseResult } from "./deep-links";

export {
  isKnownKxdHost,
  normalizeAppPath,
  validateExternalUrl,
} from "./navigation";
export type { OpenExternalUrlRequest } from "./navigation";

export {
  isMimeAllowed,
  sanitizeFilename,
  validateDownloadUrl,
} from "./files";
export type {
  DownloadHandle,
  DownloadRequest,
  OpenFileRequest,
  OpenFileResult,
  SaveFileRequest,
  SaveFileResult,
} from "./files";

export { SETTINGS_OWNERSHIP, settingsForScope } from "./settings";
export type { SettingsOwnership, SettingsScope } from "./settings";

export {
  RuntimeProvider,
  useRuntime,
  useRuntimeRequired,
} from "./provider";
export type { RuntimeContextValue } from "./provider";
