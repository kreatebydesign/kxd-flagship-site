/**
 * Resolve a safe in-app return path for staff layout login redirects.
 * Middleware sets x-kxd-pathname from the request URL; this guards against
 * malformed values and confines redirects to an expected admin prefix.
 */

export function trustedLayoutReturnPath(
  pathname: string | null | undefined,
  fallback: string,
  requiredPrefix: string,
): string {
  const trimmed = String(pathname ?? "").trim();
  if (
    !trimmed ||
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("://") ||
    trimmed.includes("\\")
  ) {
    return fallback;
  }
  if (!trimmed.startsWith(requiredPrefix)) {
    return fallback;
  }
  return trimmed;
}
