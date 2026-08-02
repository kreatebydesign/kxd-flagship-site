/**
 * Phase 6 Batch C0/C1 — server-side Connect access evaluation.
 *
 * Evaluation order (fail closed):
 * 1. Global kill switch
 * 2. Edition feature OR operator enablement env
 * 3. Staff dogfood allowlist (C0/C1 — portal identities denied)
 * 4. Organization allowlist
 * 5. Organization active
 * 6. Active Connect membership
 *
 * C1 messaging adds conversation/participation checks in
 * `lib/connect/messaging/authorization.ts` after this base gate.
 *
 * Client-controlled request data cannot enable Connect.
 * Portal membership alone never grants Connect access.
 */

import { isFeatureEnabled } from "@/lib/editions/engine";
import {
  isConnectKillSwitchActive,
  isConnectOperatorEnablementOn,
  isOrganizationKeyAllowlisted,
  isStaffEmailInConnectDogfoodAllowlist,
} from "./config";
import type {
  ConnectAccessDecision,
  ConnectMembershipRecord,
  ConnectMembershipRole,
  ConnectOrganizationRecord,
  ConnectSubjectKind,
} from "./types";

export type ConnectAccessEvalInput = {
  subjectKind: ConnectSubjectKind;
  staffEmail?: string | null;
  organization: Pick<ConnectOrganizationRecord, "key" | "status"> | null;
  membership: Pick<ConnectMembershipRecord, "status" | "role"> | null;
  /** Injected for tests — defaults to live edition evaluation. */
  editionFeatureActive?: boolean;
  env?: NodeJS.ProcessEnv;
};

export function isConnectEditionFeatureActive(
  editionFeatureActive?: boolean,
): boolean {
  if (typeof editionFeatureActive === "boolean") return editionFeatureActive;
  return isFeatureEnabled("kxd-connect");
}

/**
 * Pure access evaluation used by services and verify scripts.
 * Never trusts browser-supplied "enableConnect" style flags.
 */
export function evaluateConnectAccess(
  input: ConnectAccessEvalInput,
): ConnectAccessDecision {
  const env = input.env ?? process.env;

  if (isConnectKillSwitchActive(env)) {
    return { allowed: false, reason: "kill_switch" };
  }

  const featureActive =
    isConnectEditionFeatureActive(input.editionFeatureActive) ||
    isConnectOperatorEnablementOn(env);

  if (!featureActive) {
    return { allowed: false, reason: "feature_disabled" };
  }

  if (input.subjectKind === "portal-user") {
    return { allowed: false, reason: "portal_identity_not_supported_in_c0" };
  }

  if (!isStaffEmailInConnectDogfoodAllowlist(input.staffEmail, env)) {
    return { allowed: false, reason: "not_staff_dogfood" };
  }

  if (!input.organization) {
    return { allowed: false, reason: "invalid_organization" };
  }

  if (!isOrganizationKeyAllowlisted(input.organization.key, env)) {
    return { allowed: false, reason: "org_not_allowlisted" };
  }

  if (input.organization.status !== "active") {
    return { allowed: false, reason: "org_inactive" };
  }

  if (!input.membership) {
    return { allowed: false, reason: "no_membership" };
  }

  if (input.membership.status !== "active") {
    return { allowed: false, reason: "membership_disabled" };
  }

  return {
    allowed: true,
    organizationKey: input.organization.key,
    role: input.membership.role,
  };
}

/** Role authority for membership mutations in C0. */
export function canMutateConnectMemberships(
  actorRole: ConnectMembershipRole | null | undefined,
): boolean {
  return actorRole === "platform-operator" || actorRole === "organization-admin";
}

/**
 * Future plan/entitlement packaging hook.
 * C0: Connect is never granted by client plans — reserved key only.
 */
export function isConnectGrantedByClientEntitlement(
  effectiveModules: readonly string[] | null | undefined,
): boolean {
  if (!effectiveModules?.length) return false;
  return effectiveModules.includes("kxd-connect");
}
