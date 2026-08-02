/**
 * Phase 6 Batch C0/C4 — server-side Connect access evaluation.
 *
 * Evaluation order (fail closed; every layer required):
 * 1. Global kill switch
 * 2. Global Connect feature enabled (edition feature OR operator enablement env)
 * 3. Environment allows Connect (non-production for local dogfood)
 * 4. Local operator activation enabled (`.connect/local-activation.json`)
 * 5. Subject kind (staff only — portal denied)
 * 6. Staff allowlisted (activation file, else env CSV — empty denies)
 * 7. Organization allowlisted
 * 8. Organization active
 * 9. Active Connect membership
 *
 * C1 messaging adds conversation/participation checks in
 * `lib/connect/messaging/authorization.ts` after this base gate.
 *
 * Client-controlled request data cannot enable Connect.
 * Portal membership alone never grants Connect access.
 * Authorization decisions are never cached — callers re-evaluate per request.
 */

import { isFeatureEnabled } from "@/lib/editions/engine";
import {
  connectOpsEventFromDenyReason,
  getEffectiveConnectOrganizationAllowlist,
  getEffectiveConnectStaffAllowlist,
  isConnectEnvironmentAllowed,
  isConnectLocalActivationEnabled,
  logConnectOpsEvent,
} from "./activation";
import {
  getConnectOrganizationAllowlist,
  getConnectStaffDogfoodEmails,
  isConnectKillSwitchActive,
  isConnectOperatorEnablementOn,
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
  /**
   * Injected for tests — when omitted, resolved from local activation file
   * (production always false).
   */
  localActivationEnabled?: boolean;
  /**
   * Injected for tests — when omitted, resolved from environment gates
   * (production always false).
   */
  environmentAllowed?: boolean;
  /** Injected allowlist override for tests. */
  staffAllowlist?: ReadonlySet<string>;
  /** Injected org allowlist override for tests. */
  organizationAllowlist?: ReadonlySet<string>;
  /** When true, emit a structured ops log line (no message content). */
  recordOpsLog?: boolean;
  env?: NodeJS.ProcessEnv;
  cwd?: string;
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
 * Does not memoize — safe for immediate rollback.
 */
export function evaluateConnectAccess(
  input: ConnectAccessEvalInput,
): ConnectAccessDecision {
  const env = input.env ?? process.env;
  const cwd = input.cwd;

  const decide = (decision: ConnectAccessDecision): ConnectAccessDecision => {
    if (!input.recordOpsLog) return decision;
    if (decision.allowed) {
      logConnectOpsEvent({
        type: "authorization.success",
        summary: "Connect authorization succeeded",
        meta: {
          organizationKey: decision.organizationKey,
          role: decision.role,
          subjectKind: input.subjectKind,
        },
      });
      return decision;
    }
    logConnectOpsEvent({
      type: connectOpsEventFromDenyReason(decision.reason),
      summary: `Connect authorization denied: ${decision.reason}`,
      meta: {
        reason: decision.reason,
        subjectKind: input.subjectKind,
      },
    });
    return decision;
  };

  if (isConnectKillSwitchActive(env)) {
    return decide({ allowed: false, reason: "kill_switch" });
  }

  const featureActive =
    isConnectEditionFeatureActive(input.editionFeatureActive) ||
    isConnectOperatorEnablementOn(env);

  if (!featureActive) {
    return decide({ allowed: false, reason: "feature_disabled" });
  }

  const environmentAllowed =
    typeof input.environmentAllowed === "boolean"
      ? input.environmentAllowed
      : isConnectEnvironmentAllowed(env);

  if (!environmentAllowed) {
    return decide({ allowed: false, reason: "environment_not_allowed" });
  }

  const activationInjected =
    typeof input.localActivationEnabled === "boolean";
  const localActivationEnabled = activationInjected
    ? input.localActivationEnabled === true
    : isConnectLocalActivationEnabled({ cwd, env });

  if (!localActivationEnabled) {
    return decide({ allowed: false, reason: "local_activation_required" });
  }

  if (input.subjectKind === "portal-user") {
    return decide({
      allowed: false,
      reason: "portal_identity_not_supported_in_c0",
    });
  }

  // Injected activation (unit tests) uses env allowlists so a developer's
  // local activation file cannot flake verifiers. Live requests use the
  // effective allowlist (activation file, else env) — re-read every call.
  const staffAllowlist =
    input.staffAllowlist ??
    (activationInjected
      ? getConnectStaffDogfoodEmails(env)
      : getEffectiveConnectStaffAllowlist({ cwd, env }));
  const normalizedEmail = input.staffEmail?.trim().toLowerCase() ?? "";
  if (!normalizedEmail || !staffAllowlist.has(normalizedEmail)) {
    return decide({ allowed: false, reason: "not_staff_dogfood" });
  }

  if (!input.organization) {
    return decide({ allowed: false, reason: "invalid_organization" });
  }

  const organizationAllowlist =
    input.organizationAllowlist ??
    (activationInjected
      ? getConnectOrganizationAllowlist(env)
      : getEffectiveConnectOrganizationAllowlist({ cwd, env }));
  const orgKey = input.organization.key.trim().toLowerCase();
  if (!orgKey || !organizationAllowlist.has(orgKey)) {
    return decide({ allowed: false, reason: "org_not_allowlisted" });
  }

  if (input.organization.status !== "active") {
    return decide({ allowed: false, reason: "org_inactive" });
  }

  if (!input.membership) {
    return decide({ allowed: false, reason: "no_membership" });
  }

  if (input.membership.status !== "active") {
    return decide({ allowed: false, reason: "membership_disabled" });
  }

  return decide({
    allowed: true,
    organizationKey: input.organization.key,
    role: input.membership.role,
  });
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
