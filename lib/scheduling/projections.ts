/**
 * Phase 25B — Work scheduling summary projections.
 * Sole mutators for Work.schedulingStatus / scheduledStart / scheduledEnd / activeScheduleLink.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { WORK_COLLECTION } from "@/lib/work/constants";
import type { WorkSchedulingStatus } from "./types";

export interface WorkScheduleProjection {
  schedulingStatus: WorkSchedulingStatus;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  activeScheduleLinkId: number | null;
}

/**
 * Apply denormalized schedule summary onto Work.
 * Call only from scheduling services.
 */
export async function applyWorkScheduleProjection(
  workId: number,
  projection: WorkScheduleProjection,
): Promise<void> {
  const payload = await getPayload({ config });
  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    id: workId,
    data: {
      schedulingStatus: projection.schedulingStatus,
      scheduledStart: projection.scheduledStart,
      scheduledEnd: projection.scheduledEnd,
      activeScheduleLink: projection.activeScheduleLinkId,
    },
    depth: 0,
    overrideAccess: true,
  });
}

/**
 * Clear Work schedule projection (cancel / complete / reject of active link).
 */
export async function clearWorkScheduleProjection(workId: number): Promise<void> {
  await applyWorkScheduleProjection(workId, {
    schedulingStatus: "none",
    scheduledStart: null,
    scheduledEnd: null,
    activeScheduleLinkId: null,
  });
}

export function projectionForProposed(
  linkId: number,
  start: string,
  end: string,
): WorkScheduleProjection {
  return {
    schedulingStatus: "proposed",
    scheduledStart: start,
    scheduledEnd: end,
    activeScheduleLinkId: linkId,
  };
}

export function projectionForScheduled(
  linkId: number,
  start: string,
  end: string,
): WorkScheduleProjection {
  return {
    schedulingStatus: "scheduled",
    scheduledStart: start,
    scheduledEnd: end,
    activeScheduleLinkId: linkId,
  };
}

export function projectionForSyncError(
  linkId: number,
  start: string,
  end: string,
): WorkScheduleProjection {
  return {
    schedulingStatus: "sync_error",
    scheduledStart: start,
    scheduledEnd: end,
    activeScheduleLinkId: linkId,
  };
}
