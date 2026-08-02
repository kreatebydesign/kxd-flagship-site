/**
 * Phase 6 Batch C4 — local dogfood activation public surface.
 */

export {
  isConnectEnvironmentAllowed,
  isConnectProductionEnvironment,
} from "./environment";

export {
  CONNECT_LOCAL_ACTIVATION_RELATIVE_PATH,
  buildConnectLocalActivationFromEnv,
  createDisabledConnectLocalActivationState,
  getEffectiveConnectOrganizationAllowlist,
  getEffectiveConnectStaffAllowlist,
  isConnectLocalActivationEnabled,
  readConnectLocalActivationState,
  resolveConnectLocalActivationPath,
  writeConnectLocalActivationState,
} from "./local-state";

export {
  CONNECT_OPS_LOG_RELATIVE_PATH,
  connectOpsEventFromDenyReason,
  logConnectOpsEvent,
} from "./ops-log";

export {
  getConnectActivationSnapshot,
  type ConnectActivationSnapshot,
} from "./snapshot";

export type {
  ConnectActivationLayer,
  ConnectLocalActivationState,
  ConnectOpsEventType,
  ConnectOpsLogEntry,
} from "./types";

export { CONNECT_LOCAL_ACTIVATION_VERSION } from "./types";
