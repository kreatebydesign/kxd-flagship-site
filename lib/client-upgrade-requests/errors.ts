/**
 * Pure error helpers for upgrade-request concurrency mapping.
 */

/**
 * Detect Postgres unique-constraint conflicts (including nested Payload/Drizzle causes).
 * Used so race duplicates return a sanitized active_duplicate outcome.
 */
export function isUniqueConstraintError(err: unknown): boolean {
  const walk = (value: unknown, depth = 0): boolean => {
    if (value == null || depth > 5) return false;
    if (typeof value === "string") {
      const s = value.toLowerCase();
      if (s.includes("23505")) return true;
      if (
        s.includes("client_upgrade_requests_active_unique") ||
        (s.includes("unique") && s.includes("duplicate"))
      ) {
        return true;
      }
      return false;
    }
    if (typeof value !== "object") return false;
    const row = value as Record<string, unknown>;
    if (row.code === "23505" || row.code === 23505) return true;
    if (
      typeof row.constraint === "string" &&
      row.constraint.includes("client_upgrade_requests_active_unique")
    ) {
      return true;
    }
    return (
      walk(row.message, depth + 1) ||
      walk(row.cause, depth + 1) ||
      walk(row.detail, depth + 1) ||
      walk(row.originalError, depth + 1)
    );
  };
  return walk(err);
}
