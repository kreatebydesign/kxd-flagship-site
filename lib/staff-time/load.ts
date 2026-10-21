import "server-only";

import type { StaffActor } from "@/lib/staff/types";
import { resolveRequestTimezone } from "@/lib/platform/timezone";
import { loadUpcomingPaydaySummary } from "@/lib/staff-pay/bootstrap";
import { getPayload } from "payload";
import config from "@payload-config";
import {
  findActiveStaffShift,
  listStaffShiftHistory,
} from "./shifts";
import type { StaffTimeHistoryItem, StaffTimeShiftView } from "./types";
import {
  listStaffTimeEligibleClients,
  listStaffTimeEligibleWork,
  type StaffTimeEligibleClientOption,
  type StaffTimeEligibleWorkOption,
} from "./eligible-assignments";

export type StaffTimeClockPageData = {
  workTimezone: string;
  activeShift: StaffTimeShiftView | null;
  history: StaffTimeHistoryItem[];
  eligibleWork: StaffTimeEligibleWorkOption[];
  eligibleClients: StaffTimeEligibleClientOption[];
  payroll: {
    nextPayday: string | null;
    nextPeriodLabel: string | null;
    weeklyHoursLimit: number;
  };
  viewer: Pick<StaffActor, "userId" | "displayName" | "staffRole">;
};

export async function loadStaffTimeClockPage(
  actor: StaffActor,
): Promise<StaffTimeClockPageData> {
  const payload = await getPayload({ config });
  const workTimezone = await resolveRequestTimezone();
  const [activeShift, history, payroll, eligibleWork, eligibleClients] = await Promise.all([
    findActiveStaffShift(actor.userId),
    listStaffShiftHistory(actor.userId, 20),
    loadUpcomingPaydaySummary(payload),
    listStaffTimeEligibleWork(actor),
    listStaffTimeEligibleClients(actor),
  ]);

  return {
    workTimezone,
    activeShift,
    history,
    eligibleWork,
    eligibleClients,
    payroll,
    viewer: {
      userId: actor.userId,
      displayName: actor.displayName,
      staffRole: actor.staffRole,
    },
  };
}
