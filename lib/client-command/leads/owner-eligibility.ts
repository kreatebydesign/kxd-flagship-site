/**
 * Pure lead-owner eligibility helpers (no Payload / no server-only).
 * Used by owners loader and verify scripts.
 */

import type { ManagedClientLeadPolicy } from "@/lib/acquisition-operations/policy";

function hasManageCapability(
  role: string | undefined,
  canManageMembers: boolean | undefined,
  policy: ManagedClientLeadPolicy,
): boolean {
  if (policy.portalModuleEnabled) return true;
  return role === "client-owner" || role === "client-admin" || canManageMembers === true;
}

/** Studio / KXD agency identities must not appear as client sales owners. */
export function isStudioOrAgencyEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return (
    normalized.endsWith("@kreatebydesign.com") ||
    normalized.endsWith("@kxd.local") ||
    normalized.endsWith("@kxd.local.com")
  );
}

/** QA / test / inventory scaffolding identities — never sales owners. */
export function isQaOrTestOwnerIdentity(input: {
  email: string;
  displayName?: string | null;
}): boolean {
  const email = input.email.trim().toLowerCase();
  const name = String(input.displayName ?? "").trim().toLowerCase();
  const haystack = `${email} ${name}`;
  return (
    /\bqa\b/.test(haystack) ||
    /\btest\b/.test(haystack) ||
    email.includes("+qa") ||
    email.includes("inventory.qa") ||
    name.includes("inventory qa")
  );
}

/** Case-insensitive policy allowlist, empty when unconfigured. */
export function normalizeAssignableOwnerAllowlist(
  emails: readonly string[] | undefined,
): ReadonlySet<string> {
  if (!emails || emails.length === 0) return new Set<string>();
  return new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean));
}

/**
 * Pure eligibility check — used by owners loader and verify scripts.
 * Does not hit the database.
 *
 * A configured policy allowlist is authoritative: it names real people, so the
 * studio/QA heuristics below must never veto an explicitly authorized owner.
 * Those heuristics only guard the default path, where eligibility is inferred.
 */
export function isAssignableLeadOwnerCandidate(input: {
  email: string;
  displayName?: string | null;
  active?: boolean | null;
  role?: string;
  canManageMembers?: boolean;
  policy: ManagedClientLeadPolicy;
}): boolean {
  const email = input.email.trim().toLowerCase();
  if (!email) return false;
  if (input.active === false) return false;
  if (!hasManageCapability(input.role, input.canManageMembers, input.policy)) return false;

  const allowlist = normalizeAssignableOwnerAllowlist(
    input.policy.assignablePortalOwnerEmails,
  );
  if (allowlist.size > 0) return allowlist.has(email);

  if (isStudioOrAgencyEmail(email)) return false;
  if (isQaOrTestOwnerIdentity({ email, displayName: input.displayName })) return false;
  return true;
}
