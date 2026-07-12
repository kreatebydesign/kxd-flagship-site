/**
 * /admin/work/[workId]
 * Phase 20D — Work detail
 */

import { notFound } from "next/navigation";
import { WorkDetailClient } from "@/components/admin/work/WorkDetailClient";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { getSchedulingProposalDetail } from "@/lib/scheduling/proposals-list";
import { getWorkItem } from "@/lib/work/services";

export const dynamic = "force-dynamic";

export default async function WorkDetailPage({
  params,
}: {
  params: Promise<{ workId: string }>;
}) {
  const user = await requirePayloadAdminPage("/admin/work");
  const { workId: raw } = await params;
  const workId = Number.parseInt(raw, 10);
  if (!Number.isFinite(workId)) notFound();

  const work = await getWorkItem(workId);
  if (!work) notFound();

  const scheduleLink =
    work.activeScheduleLinkId != null
      ? await getSchedulingProposalDetail(work.activeScheduleLinkId)
      : null;

  return (
    <WorkDetailClient
      initialWork={work}
      calendarEventHtmlLink={
        scheduleLink?.link.googleEventHtmlLink ?? null
      }
      calendarWriteAt={scheduleLink?.link.calendarWriteAt ?? null}
      scheduleLinkId={scheduleLink?.link.id ?? work.activeScheduleLinkId}
      calendarSyncStatus={scheduleLink?.link.syncStatus ?? null}
      calendarRecoveryState={scheduleLink?.link.recoveryState ?? null}
      calendarExternalChangeClass={
        scheduleLink?.link.externalChangeClass ?? null
      }
      calendarLastSyncAt={scheduleLink?.link.lastSyncAt ?? null}
      currentUser={{
        id: Number(user.id),
        email: typeof user.email === "string" ? user.email : "",
        displayName: typeof user.displayName === "string" ? user.displayName : null,
      }}
    />
  );
}
