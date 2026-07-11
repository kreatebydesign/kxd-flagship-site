import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { calculateClientHealth } from "@/lib/client-health/health-engine";
import {
  clientId,
  clientName,
  daysSince,
  daysUntil,
  loadIntelligenceContext,
} from "@/lib/intelligence/context";
import type { IntelligenceDoc } from "@/lib/intelligence/types";
import { getExecutiveTimelineClient } from "@/lib/executive-timeline/data";
import { getClientWork } from "@/lib/work/services";
import type {
  CheckInListItem,
  ClientSuccessDashboardData,
  ClientSuccessDetailData,
  ClientSuccessListItem,
  ClientSuccessMonthActivity,
  ClientSuccessSummary,
  SatisfactionLevel,
} from "./types";

const PLANS = "client-success-plans";
const CHECKINS = "success-check-ins";

type SuccessDoc = IntelligenceDoc;

function toCheckInItem(doc: SuccessDoc): CheckInListItem {
  const cid = clientId(doc.client) ?? 0;
  const cname = clientName(doc.client);
  return {
    id: doc.id as number,
    clientId: cid,
    clientName: cname,
    meetingDate: String(doc.meetingDate ?? doc.createdAt ?? ""),
    summary: String(doc.summary ?? "Check-in"),
    wins: doc.wins ? String(doc.wins) : null,
    satisfaction: doc.satisfaction as SatisfactionLevel | null,
    completed: Boolean(doc.completed),
    followUpDate: doc.followUpDate ? String(doc.followUpDate) : null,
    href: `/admin/operations/client-success/${cid}`,
  };
}

function buildListItem(
  cid: number,
  ctx: Awaited<ReturnType<typeof loadIntelligenceContext>>,
  plan: SuccessDoc | undefined,
  lastCheckIn: SuccessDoc | undefined,
  healthScore: number,
  relationshipStatus: string,
): ClientSuccessListItem {
  const renewalDate = plan?.renewalDate ? String(plan.renewalDate) : null;
  const nextReview = plan?.nextReview ? String(plan.nextReview) : null;
  const lastMeetingDate = lastCheckIn?.meetingDate ? String(lastCheckIn.meetingDate) : null;

  return {
    clientId: cid,
    clientName: clientName(cid, ctx),
    healthScore,
    successScore: plan?.successScore != null ? Number(plan.successScore) : null,
    relationshipStatus,
    lastMeetingDate,
    daysSinceMeeting: daysSince(lastMeetingDate),
    nextReview,
    daysUntilReview: daysUntil(nextReview),
    renewalDate,
    daysUntilRenewal: daysUntil(renewalDate),
    currentFocus: plan?.currentFocus ? String(plan.currentFocus) : null,
    href: `/admin/operations/client-success/${cid}`,
    detail: plan?.opportunities ? String(plan.opportunities).slice(0, 120) : undefined,
  };
}

function recommendAction(item: ClientSuccessListItem): string {
  if (item.daysSinceMeeting != null && item.daysSinceMeeting >= 30) {
    return "Schedule success check-in";
  }
  if (item.daysUntilReview != null && item.daysUntilReview <= 14) {
    return "Prepare quarterly review";
  }
  if (item.daysUntilRenewal != null && item.daysUntilRenewal <= 30) {
    return "Review renewal strategy";
  }
  if (item.relationshipStatus === "at-risk" || item.healthScore < 50) {
    return "Address relationship risks";
  }
  if (item.detail) {
    return "Explore expansion opportunity";
  }
  if (item.currentFocus) {
    return `Continue focus: ${item.currentFocus.slice(0, 60)}`;
  }
  return "Maintain relationship momentum";
}

async function loadPlansAndCheckIns(): Promise<{ plans: SuccessDoc[]; checkIns: SuccessDoc[] }> {
  const payload = await getPayload({ config });
  try {
    const [plansR, checkInsR] = await Promise.all([
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: PLANS as any,
        limit: 300,
        depth: 1,
        overrideAccess: true,
      }),
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: CHECKINS as any,
        limit: 400,
        sort: "-meetingDate",
        depth: 1,
        overrideAccess: true,
      }),
    ]);
    return {
      plans: plansR.docs as SuccessDoc[],
      checkIns: checkInsR.docs as SuccessDoc[],
    };
  } catch {
    return { plans: [], checkIns: [] };
  }
}

export async function getClientSuccessDashboard(): Promise<ClientSuccessDashboardData> {
  const [ctx, { plans, checkIns }] = await Promise.all([
    loadIntelligenceContext(),
    loadPlansAndCheckIns(),
  ]);

  const plansByClient = new Map<number, SuccessDoc>();
  for (const plan of plans) {
    const cid = clientId(plan.client);
    if (cid) plansByClient.set(cid, plan);
  }

  const checkInsByClient = new Map<number, SuccessDoc[]>();
  for (const checkIn of checkIns) {
    const cid = clientId(checkIn.client);
    if (!cid) continue;
    const list = checkInsByClient.get(cid) ?? [];
    list.push(checkIn);
    checkInsByClient.set(cid, list);
  }

  const activeClients = ctx.clients.filter(
    (c) => String(c.status ?? "active") === "active",
  );

  const needingAttention: ClientSuccessListItem[] = [];
  const upcomingReviews: ClientSuccessListItem[] = [];
  const renewals: ClientSuccessListItem[] = [];
  const staleMeetings: ClientSuccessListItem[] = [];
  const decliningHealth: ClientSuccessListItem[] = [];
  const expansionOpportunities: ClientSuccessListItem[] = [];
  const satisfiedClients: ClientSuccessListItem[] = [];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  let checkInsThisMonth = 0;

  for (const checkIn of checkIns) {
    const d = new Date(String(checkIn.meetingDate ?? ""));
    if (!Number.isNaN(d.getTime()) && d >= monthStart && checkIn.completed) {
      checkInsThisMonth += 1;
    }
  }

  for (const client of activeClients) {
    const cid = client.id as number;
    const plan = plansByClient.get(cid);
    const clientCheckIns = checkInsByClient.get(cid) ?? [];
    const lastCheckIn = clientCheckIns[0];
    const health = calculateClientHealth(cid, ctx.healthCtx);
    const item = buildListItem(
      cid,
      ctx,
      plan,
      lastCheckIn,
      health.overallScore,
      health.relationshipStatus,
    );

    const needsAttention =
      health.relationshipStatus === "at-risk" ||
      health.relationshipStatus === "needs-attention" ||
      health.overallScore < 55 ||
      Boolean(plan?.risks);

    if (needsAttention) needingAttention.push(item);

    if (item.daysUntilReview != null && item.daysUntilReview >= 0 && item.daysUntilReview <= 30) {
      upcomingReviews.push(item);
    }

    if (item.daysUntilRenewal != null && item.daysUntilRenewal >= 0 && item.daysUntilRenewal <= 60) {
      renewals.push(item);
    }

    if (item.daysSinceMeeting == null || item.daysSinceMeeting >= 30) {
      staleMeetings.push(item);
    }

    if (
      health.relationshipStatus === "at-risk" ||
      health.overallScore < 50 ||
      (plan?.successScore != null && Number(plan.successScore) > health.overallScore + 15)
    ) {
      decliningHealth.push(item);
    }

    if (plan?.opportunities && String(plan.opportunities).trim().length > 0) {
      expansionOpportunities.push(item);
    }

    const recentSat = lastCheckIn?.satisfaction;
    if (recentSat === "high" || recentSat === "excellent") {
      satisfiedClients.push(item);
    }
  }

  const newestWins = checkIns
    .filter((c) => c.wins && String(c.wins).trim().length > 0)
    .slice(0, 12)
    .map(toCheckInItem);

  const sortByReview = (a: ClientSuccessListItem, b: ClientSuccessListItem) =>
    (a.daysUntilReview ?? 999) - (b.daysUntilReview ?? 999);
  const sortByRenewal = (a: ClientSuccessListItem, b: ClientSuccessListItem) =>
    (a.daysUntilRenewal ?? 999) - (b.daysUntilRenewal ?? 999);
  const sortByStale = (a: ClientSuccessListItem, b: ClientSuccessListItem) =>
    (b.daysSinceMeeting ?? 999) - (a.daysSinceMeeting ?? 999);

  upcomingReviews.sort(sortByReview);
  renewals.sort(sortByRenewal);
  staleMeetings.sort(sortByStale);
  needingAttention.sort((a, b) => a.healthScore - b.healthScore);
  decliningHealth.sort((a, b) => a.healthScore - b.healthScore);

  return {
    needingAttention: needingAttention.slice(0, 15),
    upcomingReviews: upcomingReviews.slice(0, 12),
    renewals: renewals.slice(0, 12),
    staleMeetings: staleMeetings.slice(0, 12),
    decliningHealth: decliningHealth.slice(0, 12),
    expansionOpportunities: expansionOpportunities.slice(0, 12),
    satisfiedClients: satisfiedClients.slice(0, 10),
    newestWins,
    stats: {
      activeClients: activeClients.length,
      plansCount: plans.length,
      checkInsThisMonth,
      reviewsDue: upcomingReviews.length,
      renewalsDue: renewals.length,
      staleMeetingCount: staleMeetings.length,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function getClientSuccessDetail(clientId: number): Promise<ClientSuccessDetailData | null> {
  const ctx = await loadIntelligenceContext();
  if (!ctx.clientsById.has(clientId)) return null;

  const payload = await getPayload({ config });
  const [timeline, plansR, checkInsR, work] = await Promise.all([
    getExecutiveTimelineClient(clientId),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: PLANS as any,
      where: { client: { equals: clientId } },
      limit: 1,
      depth: 1,
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: CHECKINS as any,
      where: { client: { equals: clientId } },
      limit: 24,
      sort: "-meetingDate",
      depth: 0,
      overrideAccess: true,
    }),
    getClientWork(clientId),
  ]);

  const plan = (plansR.docs[0] as SuccessDoc | undefined) ?? undefined;
  const checkInDocs = checkInsR.docs as SuccessDoc[];
  const checkInHistory = checkInDocs.map(toCheckInItem);
  const health = calculateClientHealth(clientId, ctx.healthCtx);

  const accountManager =
    plan?.accountManager && typeof plan.accountManager === "object"
      ? String((plan.accountManager as SuccessDoc).email ?? (plan.accountManager as SuccessDoc).name ?? "")
      : null;

  const renewalDate = plan?.renewalDate ? String(plan.renewalDate) : null;
  const nextReview = plan?.nextReview ? String(plan.nextReview) : null;
  const lastCheckIn = checkInDocs[0];

  const listItem = buildListItem(
    clientId,
    ctx,
    plan,
    lastCheckIn,
    health.overallScore,
    health.relationshipStatus,
  );

  const recentWins = checkInHistory.filter((c) => c.wins).slice(0, 5);

  const timelineHighlights = timeline?.milestones?.slice(0, 6).map((e) => ({
    title: String(e.title ?? "Timeline event"),
    summary: String(e.summary ?? ""),
    date: String(e.occurredAt ?? e.createdAt ?? ""),
  })) ?? [];

  const executiveSummary = [
    `Health score ${health.overallScore}/100 (${health.relationshipStatus.replace("-", " ")}).`,
    plan?.currentFocus
      ? `Current focus: ${String(plan.currentFocus).slice(0, 140)}`
      : "No current focus documented.",
    lastCheckIn
      ? `Last check-in ${daysSince(String(lastCheckIn.meetingDate)) ?? 0} day(s) ago.`
      : "No success check-ins on record.",
    work.openCount > 0
      ? `${work.openCount} open work item${work.openCount === 1 ? "" : "s"} on file.`
      : "No open work on file.",
  ];

  return {
    clientId,
    clientName: clientName(clientId, ctx),
    planId: plan ? (plan.id as number) : null,
    accountManager,
    executiveSummary,
    quarterlyGoals: plan?.quarterlyGoals ? String(plan.quarterlyGoals) : null,
    yearlyGoals: plan?.yearlyGoals ? String(plan.yearlyGoals) : null,
    currentFocus: plan?.currentFocus ? String(plan.currentFocus) : null,
    carePlan: plan?.carePlan ? String(plan.carePlan) : null,
    risks: plan?.risks ? String(plan.risks) : null,
    opportunities: plan?.opportunities ? String(plan.opportunities) : null,
    notes: plan?.notes ? String(plan.notes) : null,
    successScore: plan?.successScore != null ? Number(plan.successScore) : null,
    healthScore: health.overallScore,
    relationshipStatus: health.relationshipStatus,
    renewalDate,
    daysUntilRenewal: daysUntil(renewalDate),
    nextReview,
    daysUntilReview: daysUntil(nextReview),
    recentWins,
    checkInHistory,
    timelineHighlights,
    work,
    recommendedAction: recommendAction(listItem),
    planHref: `/admin/collections/client-success-plans`,
    generatedAt: new Date().toISOString(),
  };
}

export async function getClientSuccessSummary(clientId: number): Promise<ClientSuccessSummary> {
  const detail = await getClientSuccessDetail(clientId);
  if (!detail) {
    return {
      successScore: null,
      healthScore: 0,
      nextReview: null,
      daysUntilReview: null,
      quarterlyGoals: null,
      currentFocus: null,
      recentWins: [],
      snapshot: "No success plan on file",
      href: `/admin/operations/client-success/${clientId}`,
    };
  }

  const wins = detail.recentWins.map((w) => w.wins ?? w.summary).filter(Boolean).slice(0, 3);
  const snapshot = `Health ${detail.healthScore} · ${detail.relationshipStatus.replace("-", " ")}`;

  return {
    successScore: detail.successScore,
    healthScore: detail.healthScore,
    nextReview: detail.nextReview,
    daysUntilReview: detail.daysUntilReview,
    quarterlyGoals: detail.quarterlyGoals,
    currentFocus: detail.currentFocus,
    recentWins: wins,
    snapshot,
    href: detail.clientId ? `/admin/operations/client-success/${detail.clientId}` : "/admin/operations/client-success",
  };
}

export async function getClientSuccessActivityForMonth(
  clientId: number,
  month: number,
  year: number,
): Promise<ClientSuccessMonthActivity> {
  const payload = await getPayload({ config });
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  try {
    const checkInsR = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: CHECKINS as any,
      where: { client: { equals: clientId } },
      limit: 50,
      depth: 0,
      overrideAccess: true,
    });

    const inMonth = (checkInsR.docs as SuccessDoc[]).filter((c) => {
      const d = new Date(String(c.meetingDate ?? ""));
      return d >= start && d <= end;
    });

    const wins = inMonth
      .map((c) => (c.wins ? String(c.wins) : null))
      .filter((w): w is string => Boolean(w));

    const detail = await getClientSuccessDetail(clientId);
    const goalsAchieved: string[] = [];
    if (detail?.quarterlyGoals && inMonth.some((c) => c.completed)) {
      goalsAchieved.push("Quarterly goals reviewed in success meeting");
    }

    let renewalReadiness = "Not assessed";
    if (detail?.daysUntilRenewal != null) {
      if (detail.daysUntilRenewal <= 30) renewalReadiness = "Renewal window active — prepare strategy";
      else if (detail.healthScore >= 70) renewalReadiness = "Strong renewal readiness";
      else renewalReadiness = "Monitor before renewal conversation";
    }

    const expansionNotes = detail?.opportunities
      ? [String(detail.opportunities).slice(0, 200)]
      : [];

    return {
      checkInsCompleted: inMonth.filter((c) => c.completed).length,
      wins,
      goalsAchieved,
      renewalReadiness,
      expansionNotes,
    };
  } catch {
    return {
      checkInsCompleted: 0,
      wins: [],
      goalsAchieved: [],
      renewalReadiness: "Not assessed",
      expansionNotes: [],
    };
  }
}

/** Founder intelligence — clients at renewal risk, upsell-ready, stale meetings, reviews due */
export async function getClientSuccessFounderSignals(): Promise<{
  renewalRisk: ClientSuccessListItem[];
  upsellReady: ClientSuccessListItem[];
  reviewsDue: ClientSuccessListItem[];
  staleMeetings: ClientSuccessListItem[];
  momentumPositive: ClientSuccessListItem[];
}> {
  const dash = await getClientSuccessDashboard();
  return {
    renewalRisk: dash.renewals.filter((c) => (c.daysUntilRenewal ?? 999) <= 30),
    upsellReady: dash.expansionOpportunities,
    reviewsDue: dash.upcomingReviews,
    staleMeetings: dash.staleMeetings,
    momentumPositive: dash.satisfiedClients,
  };
}
