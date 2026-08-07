import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { AdminCreatorRow, AdminShiftRow, JuniorCreatorAdminReviewData } from "./admin-review-types";
import { getWeekKey, minutesBetween, formatEarningsCents, formatHoursFromMinutes } from "./week";
import { listAllJuniorTasks } from "./tasks";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function earningsFromMinutes(minutes: number, hourlyRateCents: number, payAdjustmentCents = 0): number {
  return Math.round((minutes * hourlyRateCents) / 60) + payAdjustmentCents;
}

function displayStatusFor(doc: AnyDoc): string {
  const status = String(doc.status ?? "");
  if (status === "active") return "Active";
  if (status === "voided") return "Voided/corrected";
  const stopReason = doc.stopReason ? String(doc.stopReason) : "";
  if (
    stopReason === "inactivity_timeout" ||
    stopReason === "max_shift_timeout" ||
    stopReason === "system_recovery"
  ) {
    return "Auto-stopped";
  }
  return "Completed";
}

function mapShift(doc: AnyDoc, elapsedOverride?: number): AdminShiftRow {
  const status = String(doc.status ?? "");
  const rate = Number(doc.hourlyRateCents ?? 0);
  const payAdjustmentCents = Number(doc.payAdjustmentCents ?? 0);
  let mins = Number(doc.totalMinutes ?? 0);

  if (status === "active" && elapsedOverride !== undefined) {
    mins = elapsedOverride;
  }

  const stopReason = doc.stopReason ? String(doc.stopReason) : null;

  return {
    id: doc.id as number,
    startedAt: String(doc.startedAt),
    endedAt: doc.endedAt ? String(doc.endedAt) : null,
    totalMinutes: mins,
    status,
    weekKey: String(doc.weekKey ?? ""),
    hourlyRateCents: rate,
    notes: doc.notes ? String(doc.notes) : null,
    payAdjustmentCents,
    estimatedCents: earningsFromMinutes(mins, rate, payAdjustmentCents),
    correctionAudit: Array.isArray(doc.correctionAudit) ? doc.correctionAudit : [],
    stopReason,
    lastActivityAt: doc.lastActivityAt ? String(doc.lastActivityAt) : null,
    automaticStopAt: doc.automaticStopAt ? String(doc.automaticStopAt) : null,
    displayStatus: displayStatusFor(doc),
  };
}

export async function getJuniorCreatorAdminReviewData(): Promise<JuniorCreatorAdminReviewData> {
  const payload = await getPayload({ config });
  const weekKey = getWeekKey();

  const usersResult = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "junior-creator-users" as any,
    limit: 100,
    depth: 0,
    sort: "displayName",
    overrideAccess: true,
  });

  const shiftsResult = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "junior-creator-shifts" as any,
    limit: 500,
    depth: 0,
    sort: "-startedAt",
    overrideAccess: true,
  });

  const users = usersResult.docs as AnyDoc[];
  const shifts = shiftsResult.docs as AnyDoc[];
  const now = new Date();

  const shiftsByUser: Record<number, AnyDoc[]> = {};
  for (const shift of shifts) {
    const userId = Number(shift.juniorCreatorUser);
    if (!userId) continue;
    if (!shiftsByUser[userId]) shiftsByUser[userId] = [];
    shiftsByUser[userId].push(shift);
  }

  let totalWeekMinutes = 0;
  let totalWeekEarnings = 0;
  let activeShifts = 0;

  const creators: AdminCreatorRow[] = users.map((user) => {
    const userId = user.id as number;
    const userShifts = shiftsByUser[userId] ?? [];

    let weekMinutes = 0;
    let weekEarningsCents = 0;
    let activeShift: AdminShiftRow | null = null;

    const shiftRows: AdminShiftRow[] = userShifts.map((s) => {
      const status = String(s.status ?? "");
      if (status === "voided") {
        return mapShift(s, 0);
      }

      if (status === "active") {
        const elapsed = minutesBetween(new Date(s.startedAt as string), now);
        activeShifts += 1;
        const row = mapShift(s, elapsed);
        if (s.weekKey === weekKey) {
          weekMinutes += elapsed;
          weekEarningsCents += row.estimatedCents;
        }
        if (!activeShift) activeShift = row;
        return row;
      }

      if (status === "completed") {
        const mins = Number(s.totalMinutes ?? 0);
        const row = mapShift(s);
        if (s.weekKey === weekKey && (mins > 0 || row.payAdjustmentCents !== 0)) {
          weekMinutes += mins;
          weekEarningsCents += row.estimatedCents;
        }
        return row;
      }

      return mapShift(s);
    });

    totalWeekMinutes += weekMinutes;
    totalWeekEarnings += weekEarningsCents;

    return {
      id: userId,
      displayName: String(user.displayName ?? "—"),
      email: String(user.email ?? ""),
      hourlyRateCents: Number(user.hourlyRateCents ?? 800),
      active: Boolean(user.active),
      weekMinutes,
      weekEarningsCents,
      weekHoursLabel: formatHoursFromMinutes(weekMinutes),
      weekEarningsLabel: formatEarningsCents(weekEarningsCents),
      activeShift,
      shifts: shiftRows,
    };
  });

  return {
    weekKey,
    creators,
    assignedTasks: await listAllJuniorTasks({ includeArchived: false }),
    totals: {
      weekMinutes: totalWeekMinutes,
      weekEarningsCents: totalWeekEarnings,
      weekHoursLabel: formatHoursFromMinutes(totalWeekMinutes),
      weekEarningsLabel: formatEarningsCents(totalWeekEarnings),
      activeShifts,
    },
  };
}
