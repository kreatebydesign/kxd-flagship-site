/**
 * Phase 4 membership schema containment.
 *
 * When `portal_client_memberships` is absent (migration pending), portal
 * continues via legacy portal-users.client fallback. Membership writes must
 * never return false success.
 *
 * Pure helpers — safe for operator UI message imports.
 */

export const MEMBERSHIP_COLLECTION = "portal-client-memberships";
export const MEMBERSHIP_TABLE = "portal_client_memberships";

/** Operator/portal-safe copy — no SQL, table names, or stack details. */
export const MEMBERSHIP_SCHEMA_UNAVAILABLE_MESSAGE =
  "Multi-client membership management is temporarily unavailable pending database activation.";

export class MembershipSchemaUnavailableError extends Error {
  readonly code = "MEMBERSHIP_SCHEMA_UNAVAILABLE" as const;

  constructor(message = MEMBERSHIP_SCHEMA_UNAVAILABLE_MESSAGE) {
    super(message);
    this.name = "MembershipSchemaUnavailableError";
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message ?? "");
  }
  return "";
}

function errorCode(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  if ("code" in err && (err as { code: unknown }).code != null) {
    return String((err as { code: unknown }).code);
  }
  const cause = "cause" in err ? (err as { cause: unknown }).cause : null;
  if (cause && typeof cause === "object" && "code" in cause) {
    return String((cause as { code: unknown }).code);
  }
  return null;
}

/**
 * True only for the expected missing membership relation/enum.
 * Does not treat auth, validation, or unrelated infrastructure as unavailable.
 */
export function isMembershipSchemaUnavailableError(err: unknown): boolean {
  if (err instanceof MembershipSchemaUnavailableError) return true;

  const msg = errorMessage(err);
  if (!msg) return false;

  const mentionsMembership =
    /\bportal_client_memberships\b/i.test(msg) ||
    /\benum_portal_client_memberships_/i.test(msg) ||
    /\bportal-client-memberships\b/i.test(msg);

  if (!mentionsMembership) return false;

  const code = errorCode(err);
  // 42P01 undefined_table, 42704 undefined_object, 42703 undefined_column
  // (Batch I role / can_manage_members pending migrate).
  if (code === "42P01" || code === "42704" || code === "42703") return true;

  return (
    /does not exist/i.test(msg) ||
    /undefined_table/i.test(msg) ||
    /undefined_object/i.test(msg) ||
    /undefined_column/i.test(msg) ||
    /column .+ does not exist/i.test(msg) ||
    /relation .+ does not exist/i.test(msg) ||
    /type .+ does not exist/i.test(msg)
  );
}

export function toMembershipSchemaUnavailableError(
  err: unknown,
): MembershipSchemaUnavailableError | null {
  if (err instanceof MembershipSchemaUnavailableError) return err;
  if (isMembershipSchemaUnavailableError(err)) {
    return new MembershipSchemaUnavailableError();
  }
  return null;
}

export function rethrowIfMembershipSchemaUnavailable(err: unknown): never {
  const mapped = toMembershipSchemaUnavailableError(err);
  if (mapped) throw mapped;
  throw err;
}

export async function withMembershipSchema<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    rethrowIfMembershipSchemaUnavailable(err);
  }
}

export function membershipUnavailableResponseBody(
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ok: false,
    success: false,
    unavailable: true,
    error: MEMBERSHIP_SCHEMA_UNAVAILABLE_MESSAGE,
    ...extra,
  };
}
