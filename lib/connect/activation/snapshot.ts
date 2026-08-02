/**
 * Phase 6 Batch C4 — activation snapshot for operators / status APIs.
 */

import { isFeatureEnabled } from "@/lib/editions/engine";
import {
  isConnectKillSwitchActive,
  isConnectOperatorEnablementOn,
} from "../config";
import { isConnectEnvironmentAllowed } from "./environment";
import {
  getEffectiveConnectOrganizationAllowlist,
  getEffectiveConnectStaffAllowlist,
  readConnectLocalActivationState,
} from "./local-state";

export type ConnectActivationSnapshot = {
  killSwitch: boolean;
  globalFeatureEnabled: boolean;
  operatorEnablement: boolean;
  editionFeatureActive: boolean;
  environmentAllowed: boolean;
  localActivationEnabled: boolean;
  staffAllowlistSize: number;
  organizationAllowlistSize: number;
  /** True only when kill switch off, global feature on, environment allowed, local activation on. */
  dogfoodLayersReady: boolean;
  updatedAt: string | null;
};

/**
 * Read-through snapshot — no caching. Safe for status endpoints.
 */
export function getConnectActivationSnapshot(input?: {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  editionFeatureActive?: boolean;
}): ConnectActivationSnapshot {
  const env = input?.env ?? process.env;
  const killSwitch = isConnectKillSwitchActive(env);
  const operatorEnablement = isConnectOperatorEnablementOn(env);
  const editionFeatureActive =
    typeof input?.editionFeatureActive === "boolean"
      ? input.editionFeatureActive
      : isFeatureEnabled("kxd-connect");
  const globalFeatureEnabled = editionFeatureActive || operatorEnablement;
  const environmentAllowed = isConnectEnvironmentAllowed(env);
  const state = readConnectLocalActivationState({ cwd: input?.cwd, env });
  const localActivationEnabled = state.enabled === true;
  const staffAllowlistSize = getEffectiveConnectStaffAllowlist({
    cwd: input?.cwd,
    env,
  }).size;
  const organizationAllowlistSize = getEffectiveConnectOrganizationAllowlist({
    cwd: input?.cwd,
    env,
  }).size;

  return {
    killSwitch,
    globalFeatureEnabled,
    operatorEnablement,
    editionFeatureActive,
    environmentAllowed,
    localActivationEnabled,
    staffAllowlistSize,
    organizationAllowlistSize,
    dogfoodLayersReady:
      !killSwitch &&
      globalFeatureEnabled &&
      environmentAllowed &&
      localActivationEnabled,
    updatedAt: state.updatedAt || null,
  };
}
