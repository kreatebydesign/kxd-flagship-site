/**
 * /admin/work
 * Phase 20A — Work Engine editorial workspace
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
import { getWorkEngineWorkspace } from "@/lib/work/services";

export const dynamic = "force-dynamic";

export default async function WorkEnginePage({
  searchParams,
}: {
  searchParams?: Promise<{ client?: string }>;
}) {
  const user = await requirePayloadAdminPage("/admin/work");
  const params = searchParams ? await searchParams : {};

  // Preserve deep links to client boards under operations.
  if (params.client && /^\d+$/.test(params.client)) {
    redirect(`/admin/operations/work/${params.client}`);
  }

  const [data, timeZone] = await Promise.all([
    getWorkEngineWorkspace(),
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
      data={data}
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
