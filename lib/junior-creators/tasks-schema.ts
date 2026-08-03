/**
 * Junior Creator Assigned Tasks — schema containment for pre-migration deploys.
 *
 * When `junior_creator_tasks` is absent (migration pending), Junior dashboard,
 * Academy, timer/shifts, and admin review must remain usable. Reads degrade to
 * empty lists. Writes fail honestly. Unrelated errors still propagate.
 *
 * Pattern mirrors portal membership / Phase 3 schema guards.
 */

export const JUNIOR_TASKS_COLLECTION = "junior-creator-tasks";
export const JUNIOR_TASKS_TABLE = "junior_creator_tasks";

/** Operator/junior-safe copy — no SQL or stack details. */
export const JUNIOR_TASKS_SCHEMA_UNAVAILABLE_MESSAGE =
  "Assigned Tasks are temporarily unavailable pending database activation.";

export class JuniorTasksSchemaUnavailableError extends Error {
  readonly code = "JUNIOR_TASKS_SCHEMA_UNAVAILABLE" as const;

  constructor(message = JUNIOR_TASKS_SCHEMA_UNAVAILABLE_MESSAGE) {
    super(message);
    this.name = "JuniorTasksSchemaUnavailableError";
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
 * True only for the expected missing junior_creator_tasks relation/enum.
 * Does not treat auth, validation, or unrelated infrastructure as unavailable.
 */
export function isJuniorTasksSchemaUnavailableError(err: unknown): boolean {
  if (err instanceof JuniorTasksSchemaUnavailableError) return true;

  const msg = errorMessage(err);
  if (!msg) return false;

  const mentionsTasks =
    /\bjunior_creator_tasks\b/i.test(msg) ||
    /\benum_junior_creator_tasks_/i.test(msg) ||
    /\bjunior-creator-tasks\b/i.test(msg);

  if (!mentionsTasks) return false;

  const code = errorCode(err);
  // 42P01 undefined_table, 42704 undefined_object, 42703 undefined_column
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

export function toJuniorTasksSchemaUnavailableError(
  err: unknown,
): JuniorTasksSchemaUnavailableError | null {
  if (err instanceof JuniorTasksSchemaUnavailableError) return err;
  if (isJuniorTasksSchemaUnavailableError(err)) {
    return new JuniorTasksSchemaUnavailableError();
  }
  return null;
}

/** For read paths: return fallback when schema is missing; rethrow otherwise. */
export async function withJuniorTasksSchemaRead<T>(
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isJuniorTasksSchemaUnavailableError(err)) return fallback;
    throw err;
  }
}

/** For write paths: map missing schema to a typed error; rethrow otherwise. */
export function rethrowIfJuniorTasksSchemaUnavailable(err: unknown): never {
  const mapped = toJuniorTasksSchemaUnavailableError(err);
  if (mapped) throw mapped;
  throw err;
}
