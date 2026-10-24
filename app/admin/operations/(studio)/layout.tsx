/**
 * Founder / full-operations surfaces under /admin/operations (excluding /staff).
 * Enforces restricted-staff deny-by-default even when pathname headers are absent.
 */
import { requireStaffAwarePage, resolveRequestPathname } from "@/lib/staff/guard";
import { resolveStudioOperationsGuardPath } from "@/lib/staff/studio-operations-path";

export const dynamic = "force-dynamic";

export default async function StudioOperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const raw = await resolveRequestPathname("");
  await requireStaffAwarePage(resolveStudioOperationsGuardPath(raw));
  return children;
}
