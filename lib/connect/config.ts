/**
 * Phase 6 Batch C0 — Connect release-control configuration.
 *
 * Fail closed. Env presence never enables Connect for portal clients.
 * Schema existence never grants access.
 */

function splitCsv(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

/** Global kill switch — when "1", Connect is always denied. */
export function isConnectKillSwitchActive(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.KXD_CONNECT_KILL_SWITCH?.trim() === "1";
}

/**
 * Operator opt-in for dogfood / controlled enablement.
 * Defaults off. Does not alone grant access — allowlists + membership still required.
 */
export function isConnectOperatorEnablementOn(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.KXD_CONNECT_ENABLED?.trim() === "1";
}

/** Staff email allowlist for dogfood. Empty → nobody (fail closed). */
export function getConnectStaffDogfoodEmails(
  env: NodeJS.ProcessEnv = process.env,
): ReadonlySet<string> {
  return new Set(splitCsv(env.KXD_CONNECT_STAFF_DOGFOOD_EMAILS));
}

/** Organization key allowlist. Empty → no org may use Connect (fail closed). */
export function getConnectOrganizationAllowlist(
  env: NodeJS.ProcessEnv = process.env,
): ReadonlySet<string> {
  return new Set(splitCsv(env.KXD_CONNECT_ORG_ALLOWLIST));
}

export function isStaffEmailInConnectDogfoodAllowlist(
  email: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const normalized = email?.trim().toLowerCase() ?? "";
  if (!normalized) return false;
  return getConnectStaffDogfoodEmails(env).has(normalized);
}

export function isOrganizationKeyAllowlisted(
  organizationKey: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const key = organizationKey?.trim().toLowerCase() ?? "";
  if (!key) return false;
  return getConnectOrganizationAllowlist(env).has(key);
}
