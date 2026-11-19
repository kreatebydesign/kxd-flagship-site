/**
 * Founder / full-operations surfaces under /admin/operations (excluding /staff).
 * Enforces restricted-staff deny-by-default even when pathname headers are absent.
 */
import { StudioOperationsChrome } from "@/components/admin/operations/shared/StudioOperationsChrome";
import { requireStaffAwarePage, resolveRequestPathname } from "@/lib/staff/guard";
import { resolveStudioOperationsGuardPath } from "@/lib/staff/studio-operations-path";
import { timePhase } from "@/lib/perf/request-phases";

export const dynamic = "force-dynamic";

export default async function StudioOperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const raw = await resolveRequestPathname("");
  await timePhase("studio.guard", () =>
    requireStaffAwarePage(resolveStudioOperationsGuardPath(raw)),
  );
  return <StudioOperationsChrome>{children}</StudioOperationsChrome>;
}
