/**
 * Path used for restricted-staff allowlist checks.
 * Canonical returnPath from the route wins over request headers so a mismatched
 * x-kxd-pathname cannot bypass page-level authorization.
 */
export function resolveStaffAwarePathname(
  rawPath: string,
  returnPath?: string,
): string {
  const canonical = returnPath?.trim();
  if (canonical) return canonical;
  return rawPath.trim();
}
