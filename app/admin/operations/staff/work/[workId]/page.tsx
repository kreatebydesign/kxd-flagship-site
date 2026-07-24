/**
 * /admin/operations/staff/work/[workId] — guided assigned work
 */

import { redirect } from "next/navigation";
import { StaffGuidedWorkScreen } from "@/components/admin/operations/staff";
import {
  STAFF_HOME_PATH,
  loadStaffGuidedWork,
  loadStaffToday,
  requireStaffAwarePage,
} from "@/lib/staff";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ workId: string }>;
};

export default async function StaffGuidedWorkPage({ params }: PageProps) {
  const { workId: workIdParam } = await params;
  const workId = Number.parseInt(workIdParam, 10);
  if (!Number.isFinite(workId) || workId <= 0) {
    redirect(STAFF_HOME_PATH);
  }

  const user = await requireStaffAwarePage(`/admin/operations/staff/work/${workId}`);
  const [data, today] = await Promise.all([
    loadStaffGuidedWork(user, workId),
    loadStaffToday(user),
  ]);

  if (!data) {
    redirect(STAFF_HOME_PATH);
  }

  const readOnly = !today.permissions.canAct || today.permissions.isPreview;

  return (
    <StaffGuidedWorkScreen
      data={data}
      readOnly={readOnly}
      canAct={today.permissions.canAct}
    />
  );
}
