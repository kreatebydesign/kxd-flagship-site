import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { RankProgress } from "./ranks";
import { getRankTitle, getNextRank, getRankProgress } from "./ranks";
import { findActiveShift } from "./shifts";
import { getLeadWeekKey, getWeekKey, minutesBetween } from "./week";

export type JuniorCreatorPersonalBests = {
  bestEarningsWeekCents: number;
  bestHoursWeekMinutes: number;
  mostLeadsWeek: number;
};

export type JuniorCreatorStats = {
  submittedThisWeek: number;
  qualifiedThisWeek: number;
  closedWonThisWeek: number;
  submittedToday: number;
  totalLeads: number;
  lifetimeQualified: number;
  lifetimeClosedWon: number;
  leadsWithNotes: number;
  websiteOpportunityLeads: number;
  lifetimeHoursMinutes: number;
  rankTitle: string;
  nextRank: { title: string; leadsNeeded: number } | null;
  rankProgress: RankProgress;
  hoursWorkedMinutesThisWeek: number;
  estimatedEarningsCentsThisWeek: number;
  personalBests: JuniorCreatorPersonalBests;
  activeShift: {
    id: number;
    startedAt: string;
    hourlyRateCents: number;
  } | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function hasDetailedNotes(notes: unknown): boolean {
  return typeof notes === "string" && notes.trim().length >= 20;
}

function earningsFromMinutes(minutes: number, hourlyRateCents: number): number {
  return Math.round((minutes * hourlyRateCents) / 60);
}

export async function getJuniorCreatorStats(juniorCreatorUserId: number): Promise<JuniorCreatorStats> {
  const payload = await getPayload({ config });
  const currentWeekKey = getWeekKey();
  const weekStart = new Date(currentWeekKey);
  weekStart.setHours(0, 0, 0, 0);

  const leadsResult = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "research-leads" as any,
    where: { juniorCreatorUser: { equals: juniorCreatorUserId } },
    limit: 500,
    depth: 0,
    overrideAccess: true,
  });

  const shiftsResult = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "junior-creator-shifts" as any,
    where: { juniorCreatorUser: { equals: juniorCreatorUserId } },
    limit: 500,
    depth: 0,
    overrideAccess: true,
  });

  const leads = leadsResult.docs as AnyDoc[];
  const shifts = shiftsResult.docs as AnyDoc[];
  const totalLeads = leads.length;

  let submittedThisWeek = 0;
  let qualifiedThisWeek = 0;
  let closedWonThisWeek = 0;
  let submittedToday = 0;
  let lifetimeQualified = 0;
  let lifetimeClosedWon = 0;
  let leadsWithNotes = 0;
  let websiteOpportunityLeads = 0;
  const leadsPerWeek: Record<string, number> = {};

  for (const lead of leads) {
    const created = new Date(lead.createdAt as string);
    const weekKey = getLeadWeekKey(created);
    leadsPerWeek[weekKey] = (leadsPerWeek[weekKey] ?? 0) + 1;

    if (lead.status === "qualified") lifetimeQualified += 1;
    if (lead.status === "closed-won") lifetimeClosedWon += 1;
    if (hasDetailedNotes(lead.notes)) leadsWithNotes += 1;
    if (String(lead.estimatedService ?? "") === "website") websiteOpportunityLeads += 1;

    if (isToday(created)) submittedToday += 1;

    if (created >= weekStart) {
      submittedThisWeek += 1;
      if (lead.status === "qualified") qualifiedThisWeek += 1;
      if (lead.status === "closed-won") closedWonThisWeek += 1;
    }
  }

  let hoursWorkedMinutesThisWeek = 0;
  let estimatedEarningsCentsThisWeek = 0;
  let lifetimeHoursMinutes = 0;
  const minutesPerWeek: Record<string, number> = {};
  const earningsPerWeek: Record<string, number> = {};

  for (const shift of shifts) {
    const status = String(shift.status ?? "");
    if (status === "voided") continue;

    const weekKey = String(shift.weekKey ?? "");
    const rate = Number(shift.hourlyRateCents ?? 0);

    if (status === "completed") {
      const mins = Number(shift.totalMinutes ?? 0);
      if (mins > 0) {
        lifetimeHoursMinutes += mins;
        minutesPerWeek[weekKey] = (minutesPerWeek[weekKey] ?? 0) + mins;
        const earned = earningsFromMinutes(mins, rate);
        earningsPerWeek[weekKey] = (earningsPerWeek[weekKey] ?? 0) + earned;

        if (weekKey === currentWeekKey) {
          hoursWorkedMinutesThisWeek += mins;
          estimatedEarningsCentsThisWeek += earned;
        }
      }
    }
  }

  const activeShift = await findActiveShift(juniorCreatorUserId);
  if (activeShift) {
    const elapsed = minutesBetween(new Date(activeShift.startedAt), new Date());
    hoursWorkedMinutesThisWeek += elapsed;
    lifetimeHoursMinutes += elapsed;
    estimatedEarningsCentsThisWeek += earningsFromMinutes(elapsed, activeShift.hourlyRateCents);
  }

  const personalBests: JuniorCreatorPersonalBests = {
    bestEarningsWeekCents: Object.values(earningsPerWeek).length
      ? Math.max(...Object.values(earningsPerWeek))
      : 0,
    bestHoursWeekMinutes: Object.values(minutesPerWeek).length
      ? Math.max(...Object.values(minutesPerWeek))
      : 0,
    mostLeadsWeek: Object.values(leadsPerWeek).length
      ? Math.max(...Object.values(leadsPerWeek))
      : 0,
  };

  return {
    submittedThisWeek,
    qualifiedThisWeek,
    closedWonThisWeek,
    submittedToday,
    totalLeads,
    lifetimeQualified,
    lifetimeClosedWon,
    leadsWithNotes,
    websiteOpportunityLeads,
    lifetimeHoursMinutes,
    rankTitle: getRankTitle(totalLeads),
    nextRank: getNextRank(totalLeads),
    rankProgress: getRankProgress(totalLeads),
    hoursWorkedMinutesThisWeek,
    estimatedEarningsCentsThisWeek,
    personalBests,
    activeShift,
  };
}
