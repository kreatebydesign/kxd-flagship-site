/**
 * Phase 4 Batch I — recent strong-auth window for sensitive mutations.
 */

import { STEP_UP_WINDOW_MS } from "./crypto";

export function isStepUpSatisfied(
  lastStepUpAt: string | Date | null | undefined,
  nowMs = Date.now(),
  windowMs = STEP_UP_WINDOW_MS,
): boolean {
  if (!lastStepUpAt) return false;
  const t = new Date(lastStepUpAt).getTime();
  if (!Number.isFinite(t)) return false;
  return nowMs - t <= windowMs;
}

/**
 * Password alone never satisfies step-up once MFA is enrolled.
 * Passkey with userVerified=true, or verified TOTP/recovery, does.
 */
export function strongAuthSatisfiesStepUp(input: {
  method: "password" | "passkey" | "totp" | "recovery";
  userVerified?: boolean;
  mfaEnrolled: boolean;
}): boolean {
  if (input.method === "password") return !input.mfaEnrolled;
  if (input.method === "passkey") return input.userVerified === true;
  if (input.method === "totp" || input.method === "recovery") return true;
  return false;
}
