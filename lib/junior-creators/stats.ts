import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { getRankTitle } from "./ranks";

export type JuniorCreatorStats = {
  submittedThisWeek: number;
  qualifiedThisWeek: number;
  closedWonThisWeek: number;
  totalLeads: number;
  rankTitle: string;
};

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - diff);
  return start;
}

export async function getJuniorCreatorStats(juniorCreatorUserId: number): Promise<JuniorCreatorStats> {
  const payload = await getPayload({ config });
  const weekStart = getWeekStart();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await payload.find({
    collection: "research-leads" as any,
    where: { juniorCreatorUser: { equals: juniorCreatorUserId } },
    limit: 500,
    depth: 0,
    overrideAccess: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leads = result.docs as any[];
  const totalLeads = leads.length;

  let submittedThisWeek = 0;
  let qualifiedThisWeek = 0;
  let closedWonThisWeek = 0;

  for (const lead of leads) {
    const created = new Date(lead.createdAt as string);
    const isThisWeek = created >= weekStart;
    if (isThisWeek) {
      submittedThisWeek += 1;
      if (lead.status === "qualified") qualifiedThisWeek += 1;
      if (lead.status === "closed-won") closedWonThisWeek += 1;
    }
  }

  return {
    submittedThisWeek,
    qualifiedThisWeek,
    closedWonThisWeek,
    totalLeads,
    rankTitle: getRankTitle(totalLeads),
  };
}
