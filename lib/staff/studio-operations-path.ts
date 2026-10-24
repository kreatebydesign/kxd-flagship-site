import { trustedLayoutReturnPath } from "@/lib/admin/trusted-layout-return-path";

export const STUDIO_OPERATIONS_GUARD_FALLBACK = "/admin/operations/today";

/**
 * Path passed to requireStaffAwarePage for founder / studio operations routes.
 * When request pathname headers are missing (nested RSC), fail closed to Today
 * so restricted staff cannot render unguarded founder surfaces.
 */
export function resolveStudioOperationsGuardPath(rawPath: string): string {
  const raw = rawPath.trim();
  if (!raw) return STUDIO_OPERATIONS_GUARD_FALLBACK;
  return trustedLayoutReturnPath(
    raw,
    STUDIO_OPERATIONS_GUARD_FALLBACK,
    "/admin/operations",
  );
}
