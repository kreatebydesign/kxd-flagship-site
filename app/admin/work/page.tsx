/**
 * /admin/work
 * Phase 24A — Work Planning & Daily Execution
 */

import { redirect } from "next/navigation";
import { WorkEngineWorkspace } from "@/components/admin/work/WorkEngineWorkspace";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import {
  formatDisplayDate,
  getZonedHour,
  resolveRequestTimezone,
} from "@/lib/platform/timezone";
import { resolveExecutiveFirstName } from "@/lib/rituals/morning-welcome";
import {
  loadWorkPlanningPage,
  parseWorkSortId,
  parseWorkViewId,
  type WorkDueRange,
  type WorkViewFilters,
} from "@/lib/work/planning";
import type { WorkPriority, WorkStatus } from "@/lib/work/types";

export const dynamic = "force-dynamic";

function parseFilters(params: Record<string, string | undefined>): WorkViewFilters {
  const clientIdRaw = params.clientId;
  const assignedRaw = params.assignedTo;
  return {
    clientId: clientIdRaw && /^\d+$/.test(clientIdRaw) ? Number(clientIdRaw) : null,
    status: params.status ? (params.status as WorkStatus) : null,
    priority: params.priority ? (params.priority as WorkPriority) : null,
    assignedToId:
      assignedRaw && /^\d+$/.test(assignedRaw) ? Number(assignedRaw) : null,
    dueRange: (params.due as WorkDueRange | undefined) ?? "any",
    tag: params.tag?.trim() || null,
  };
}

export default async function WorkEnginePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const user = await requirePayloadAdminPage("/admin/work");
  const params = searchParams ? await searchParams : {};

  // Preserve deep links to client boards under operations.
  if (params.client && /^\d+$/.test(params.client)) {
    redirect(`/admin/operations/work/${params.client}`);
  }

  const [planning, timeZone] = await Promise.all([
    loadWorkPlanningPage({
      view: parseWorkViewId(params.view),
      sort: parseWorkSortId(params.sort),
      filters: parseFilters(params),
    }),
    resolveRequestTimezone(),
  ]);

  const firstName = resolveExecutiveFirstName(
    typeof user.displayName === "string" ? user.displayName : null,
    typeof user.email === "string" ? user.email : null,
  );
  const hour = getZonedHour(new Date(), timeZone);
  const greeting =
    hour < 12
      ? `Good morning, ${firstName}.`
      : hour < 17
        ? `Good afternoon, ${firstName}.`
        : `Good evening, ${firstName}.`;

  return (
    <WorkEngineWorkspace
      planning={planning}
      greeting={greeting}
      dateDisplay={formatDisplayDate(new Date(), timeZone)}
      currentUser={{
        id: Number(user.id),
        email: typeof user.email === "string" ? user.email : "",
        displayName: typeof user.displayName === "string" ? user.displayName : null,
      }}
    />
  );
}
