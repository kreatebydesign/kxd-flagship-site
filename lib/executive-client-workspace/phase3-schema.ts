/**
 * Phase 3 relationship schema containment for Founding Client Early Access.
 *
 * When `client_contacts` / `client_relationship_events` are absent (migration
 * pending), operators must see an honest unavailable state — never an
 * unhandled 500, and never a false success on writes.
 *
 * Narrowly classifies missing-schema errors only. Unrelated failures propagate.
 * Pure helpers — safe for operator UI imports (message constant only).
 */

export const PHASE3_CONTACTS_COLLECTION = "client-contacts";
export const PHASE3_EVENTS_COLLECTION = "client-relationship-events";

export const PHASE3_CONTACTS_TABLE = "client_contacts";
export const PHASE3_EVENTS_TABLE = "client_relationship_events";

/** Operator-facing copy — no SQL, table names, or stack details. */
export const PHASE3_OPERATOR_UNAVAILABLE_MESSAGE =
  "Relationship Events and Contacts are temporarily unavailable pending database activation.";

export class Phase3SchemaUnavailableError extends Error {
  readonly code = "PHASE3_SCHEMA_UNAVAILABLE" as const;

  constructor(message = PHASE3_OPERATOR_UNAVAILABLE_MESSAGE) {
    super(message);
    this.name = "Phase3SchemaUnavailableError";
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
 * True only when the failure is the expected missing Phase 3 relation/enum.
 * Does not treat auth, validation, or unrelated infrastructure errors as unavailable.
 */
export function isPhase3SchemaUnavailableError(err: unknown): boolean {
  if (err instanceof Phase3SchemaUnavailableError) return true;

  const msg = errorMessage(err);
  if (!msg) return false;

  const mentionsPhase3Table =
    /\bclient_contacts\b/i.test(msg) ||
    /\bclient_relationship_events\b/i.test(msg) ||
    /\benum_client_contacts_/i.test(msg) ||
    /\benum_client_relationship_events_/i.test(msg);

  if (!mentionsPhase3Table) return false;

  const code = errorCode(err);
  if (code === "42P01" || code === "42704") return true;

  return (
    /does not exist/i.test(msg) ||
    /undefined_table/i.test(msg) ||
    /undefined_object/i.test(msg) ||
    /relation .+ does not exist/i.test(msg) ||
    /type .+ does not exist/i.test(msg)
  );
}

export function toPhase3SchemaUnavailableError(
  err: unknown,
): Phase3SchemaUnavailableError | null {
  if (err instanceof Phase3SchemaUnavailableError) return err;
  if (isPhase3SchemaUnavailableError(err)) {
    return new Phase3SchemaUnavailableError();
  }
  return null;
}

/** Re-throw as Phase3SchemaUnavailableError when the cause is missing schema. */
export function rethrowIfPhase3SchemaUnavailable(err: unknown): never {
  const mapped = toPhase3SchemaUnavailableError(err);
  if (mapped) throw mapped;
  throw err;
}

export async function withPhase3Schema<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    rethrowIfPhase3SchemaUnavailable(err);
  }
}

export function phase3UnavailableResponseBody(
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    success: false,
    unavailable: true,
    error: PHASE3_OPERATOR_UNAVAILABLE_MESSAGE,
    ...extra,
  };
}
