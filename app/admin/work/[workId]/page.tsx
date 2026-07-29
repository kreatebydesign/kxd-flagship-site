/**
 * /admin/work/[workId]
 * Phase 20D — Work detail
 *
 * Restricted staff may only open work assigned to them; others redirect home.
 */

import { notFound, redirect } from "next/navigation";
import { WorkDetailClient } from "@/components/admin/work/WorkDetailClient";
import { getSchedulingProposalDetail } from "@/lib/scheduling/proposals-list";
import {
  STAFF_HOME_PATH,
  isRestrictedStaff,
  requireStaffAwarePage,
  staffActorFromUser,
} from "@/lib/staff";
import { getWorkItem } from "@/lib/work/services";
import { getWebsiteReviewWorkContext } from "@/lib/work/website-review-context";

export const dynamic = "force-dynamic";

export default async function WorkDetailPage({
  params,
}: {
  params: Promise<{ workId: string }>;
}) {
  const { workId: raw } = await params;
  const workId = Number.parseInt(raw, 10);
  if (!Number.isFinite(workId)) notFound();

  const user = await requireStaffAwarePage(`/admin/work/${workId}`);
  const actor = staffActorFromUser(user);

  const work = await getWorkItem(workId);
  if (!work) notFound();

  if (
    actor &&
    isRestrictedStaff(actor) &&
    work.assignedToId !== actor.userId
  ) {
    redirect(STAFF_HOME_PATH);
  }

  const [scheduleLink, websiteReviewContext] = await Promise.all([
    work.activeScheduleLinkId != null
      ? getSchedulingProposalDetail(work.activeScheduleLinkId)
      : Promise.resolve(null),
    getWebsiteReviewWorkContext(work),
  ]);

  return (
    <WorkDetailClient
      initialWork={work}
      websiteReviewContext={websiteReviewContext}
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
