/**
 * Portal client readiness — adapter over Client Launch Readiness (Phase 18D).
 * Keeps backward-compatible exports for Portal Access and verify scripts.
 */

import { PRIMAL_CLIENT_SLUG } from "@/lib/ces/profile/primal";
import {
  evaluateClientLaunchReadiness,
  isResendConfigured,
  mapPortalInputToLaunchInput,
} from "@/lib/client-launch/readiness";
import type {
  CesProfileStatus,
  LaunchBlocker,
  LaunchBlockerLevel,
  LaunchReadinessEnv,
} from "@/lib/client-launch/types";

export type PortalReadinessIssueLevel = LaunchBlockerLevel;
export type PortalReadinessIssue = LaunchBlocker;

export interface PortalClientReadinessInput {
  clientId: number;
  clientName: string;
  clientSlug: string | null;
  websiteUrl: string | null;
  portalUserCount: number;
  activePortalUserCount: number;
  cesProfileStatus: CesProfileStatus;
  cesProfileName: string | null;
  cesModules: string[];
  accentColor: string | null;
  welcomePendingUserCount?: number;
}

export interface PortalReadinessEnv extends LaunchReadinessEnv {}

export interface PortalClientReadinessResult {
  ready: boolean;
  issues: PortalReadinessIssue[];
}

export { isResendConfigured };

export function evaluatePortalClientReadiness(
  client: PortalClientReadinessInput,
  env: PortalReadinessEnv,
): PortalClientReadinessResult {
  const launchInput = mapPortalInputToLaunchInput(
    client,
    client.welcomePendingUserCount ?? 0,
  );
  const result = evaluateClientLaunchReadiness(launchInput, env);

  return {
    ready: result.overallStatus !== "not_ready",
    issues: result.blockers,
  };
}

export function isPrimalProductionCandidate(clientSlug: string | null): boolean {
  return clientSlug === PRIMAL_CLIENT_SLUG;
}

export type { CesProfileStatus };
