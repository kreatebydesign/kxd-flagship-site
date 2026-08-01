/**
 * Phase 4 Batch I — auth policy foundation (constants + stubs).
 */

import { EARLY_ACCESS_CLIENT_CANNOT_MANAGE_ACCESS } from "./roles";

export const PORTAL_AUTH_POLICY = {
  /** Invitation activation requires passkey OR TOTP before enrollment completes. */
  activationRequiresMfaOrPasskey: true,
  /** Password always required for newly created invitees. */
  activationRequiresPassword: true,
  /** Existing production users are not forced into MFA in this batch. */
  forceMfaForExistingUsers: false,
  /** Client-delegated invitations disabled in early access. */
  clientDelegatedInvitesEnabled: !EARLY_ACCESS_CLIENT_CANNOT_MANAGE_ACCESS && false,
  /** Email is the unique login identity — no usernames, no domain grants. */
  emailIsUniqueLogin: true,
  domainBasedAccessEnabled: false,
  publicRegistrationEnabled: false,
  smsMfaEnabled: false,
} as const;

export function isSecurityEnrollmentComplete(input: {
  securityEnrollmentCompletedAt: string | Date | null | undefined;
}): boolean {
  return Boolean(input.securityEnrollmentCompletedAt);
}

/**
 * Early-access activation gate: enrollment complete when passkey or TOTP is present
 * (caller supplies flags from DB). Password is separate.
 */
export function canCompleteSecurityEnrollment(input: {
  hasPasskey: boolean;
  totpEnabled: boolean;
}): boolean {
  return input.hasPasskey || input.totpEnabled;
}
