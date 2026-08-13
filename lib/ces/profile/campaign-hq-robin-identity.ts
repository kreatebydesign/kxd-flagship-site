/**
 * Pure identity guards for Robin Campaign HQ configure.
 * No Payload / server-only imports — safe for focused verification.
 */

export const ROBIN_CLIENT_ID = 17;
export const ROBIN_CLIENT_SLUG = "robin-cole";
export const ROBIN_CONTRACT_ID = 1;

export const ROBIN_PORTAL_USER_TARGETS = [
  {
    label: "robin",
    portalUserId: 10,
    role: "client-owner" as const,
    displayNamePattern: /robin\s*cole/i,
    emailEnvKey: "CAMPAIGN_HQ_ROBIN_PORTAL_EMAIL",
  },
  {
    label: "barbara",
    portalUserId: 11,
    role: "client-admin" as const,
    displayNamePattern: /barbara\s*sasso/i,
    emailEnvKey: "CAMPAIGN_HQ_BARBARA_PORTAL_EMAIL",
  },
] as const;

export type PortalUserIdentityInput = {
  id: number;
  email?: string | null;
  displayName?: string | null;
  active?: boolean | null;
  client?: unknown;
};

export function asClientId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

/**
 * Fail-closed identity check for Robin/Barbara membership backfill.
 */
export function assertRobinPortalUserIdentity(input: {
  expectedUserId: number;
  expectedClientId: number;
  displayNamePattern: RegExp;
  expectedEmail?: string | null;
  user: PortalUserIdentityInput | null | undefined;
}): { ok: true } | { ok: false; reason: string } {
  const user = input.user;
  if (!user) {
    return { ok: false, reason: `Portal user id=${input.expectedUserId} not found.` };
  }
  if (Number(user.id) !== input.expectedUserId) {
    return {
      ok: false,
      reason: `Portal user id mismatch (got ${user.id}, expected ${input.expectedUserId}).`,
    };
  }
  if (user.active === false) {
    return { ok: false, reason: `Portal user id=${input.expectedUserId} is inactive.` };
  }
  const clientId = asClientId(user.client);
  if (clientId !== input.expectedClientId) {
    return {
      ok: false,
      reason: `Portal user id=${input.expectedUserId} client is ${clientId ?? "null"}, expected ${input.expectedClientId}.`,
    };
  }
  const displayName = String(user.displayName ?? "").trim();
  if (!input.displayNamePattern.test(displayName)) {
    return {
      ok: false,
      reason: `Portal user id=${input.expectedUserId} displayName "${displayName}" failed identity pattern.`,
    };
  }
  const email = String(user.email ?? "").trim().toLowerCase();
  if (!email) {
    return {
      ok: false,
      reason: `Portal user id=${input.expectedUserId} has empty email.`,
    };
  }
  const expectedEmail = String(input.expectedEmail ?? "").trim().toLowerCase();
  if (expectedEmail && email !== expectedEmail) {
    return {
      ok: false,
      reason: `Portal user id=${input.expectedUserId} email does not match expected identity.`,
    };
  }
  return { ok: true };
}
