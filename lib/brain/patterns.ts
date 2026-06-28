import "server-only";

import {
  ACTIVE_PROJECT_STATUSES,
  STALE_PROJECT_DAYS,
  STALE_TIMELINE_DAYS,
  activeClients,
  clientId,
  clientName,
  daysSince,
  latestActivityDate,
  retainerClientIds,
} from "@/lib/intelligence/context";
import { detectWorkTaskPatterns } from "@/lib/client-tasks/brain";
import type { IntelligenceContext } from "@/lib/intelligence/types";
import type { BrainPattern } from "./types";

const REQUEST_GROWTH_THRESHOLD = 3;
const INFRA_FAILURE_THRESHOLD = 2;

export function detectBrainPatterns(ctx: IntelligenceContext): BrainPattern[] {
  const patterns: BrainPattern[] = [];
  const retainerIds = retainerClientIds(ctx);

  for (const client of activeClients(ctx)) {
    const cid = client.id as number;
    const name = String(client.name);
    const last = latestActivityDate(ctx, cid);
    const inactiveDays = daysSince(last) ?? 0;

    if (inactiveDays > STALE_TIMELINE_DAYS) {
      patterns.push({
        id: `declining-engagement-${cid}`,
        label: "Declining engagement",
        description: `${name} — ${inactiveDays} days since last activity.`,
        severity: inactiveDays > 60 ? "high" : "medium",
        clientId: cid,
        clientName: name,
        metric: inactiveDays,
      });
    }

    const recentRequests = ctx.requests.filter(
      (r) => clientId(r.client) === cid && (daysSince(r.createdAt as string) ?? 999) <= 30,
    );
    if (recentRequests.length >= REQUEST_GROWTH_THRESHOLD) {
      patterns.push({
        id: `increasing-requests-${cid}`,
        label: "Increasing requests",
        description: `${recentRequests.length} requests opened in the last 30 days.`,
        severity: "medium",
        clientId: cid,
        clientName: name,
        metric: recentRequests.length,
      });
    }

    const activeProjects = ctx.projects.filter(
      (p) => clientId(p.client) === cid && ACTIVE_PROJECT_STATUSES.has(String(p.status)),
    );
    const stalled = activeProjects.filter(
      (p) => (daysSince(p.updatedAt as string) ?? 0) > STALE_PROJECT_DAYS,
    );
    if (stalled.length > 0 && stalled.length === activeProjects.length && activeProjects.length > 0) {
      patterns.push({
        id: `projects-slowing-${cid}`,
        label: "Projects slowing",
        description: `All ${activeProjects.length} active project(s) stale beyond ${STALE_PROJECT_DAYS} days.`,
        severity: "high",
        clientId: cid,
        clientName: name,
      });
    }

    const infraEvents = ctx.infraEvents.filter(
      (e) => clientId(e.client) === cid && e.status === "open",
    );
    if (infraEvents.length >= INFRA_FAILURE_THRESHOLD) {
      patterns.push({
        id: `infra-failures-${cid}`,
        label: "Repeated infrastructure failures",
        description: `${infraEvents.length} open infrastructure events.`,
        severity: "critical",
        clientId: cid,
        clientName: name,
        metric: infraEvents.length,
      });
    }

    const audits = ctx.audits.filter(
      (a) =>
        clientId(a.client) === cid ||
        String(a.company ?? "").toLowerCase() === name.toLowerCase(),
    );
    const latestAudit = audits.sort((a, b) =>
      String(b.updatedAt).localeCompare(String(a.updatedAt)),
    )[0];
    if (!latestAudit || (daysSince(latestAudit.updatedAt as string) ?? 999) > 365) {
      patterns.push({
        id: `website-neglect-${cid}`,
        label: "Website neglect",
        description: "No recent website audit on file.",
        severity: "low",
        clientId: cid,
        clientName: name,
      });
    }

    const openProposals = ctx.proposals.filter(
      (p) =>
        clientId(p.client) === cid && ["draft", "sent", "viewed"].includes(String(p.status)),
    );
    if (openProposals.length >= 2) {
      patterns.push({
        id: `proposal-bottleneck-${cid}`,
        label: "Proposal bottlenecks",
        description: `${openProposals.length} proposals in pipeline without closure.`,
        severity: "medium",
        clientId: cid,
        clientName: name,
        metric: openProposals.length,
      });
    }

    const deliverables = ctx.deliverables.filter((d) => clientId(d.client) === cid);
    const overdue = deliverables.filter(
      (d) =>
        d.status !== "complete" &&
        d.dueDate &&
        new Date(d.dueDate as string).getTime() < Date.now(),
    );
    if (overdue.length > 0) {
      patterns.push({
        id: `delayed-launch-${cid}`,
        label: "Delayed launches",
        description: `${overdue.length} overdue deliverable(s).`,
        severity: "high",
        clientId: cid,
        clientName: name,
        metric: overdue.length,
      });
    }

    if (retainerIds.has(cid) && openCreativeCountProxy(ctx, cid) === 0 && recentRequests.length === 0) {
      patterns.push({
        id: `inactive-retainer-${cid}`,
        label: "Inactive retainer",
        description: "Retainer active but low delivery and creative activity.",
        severity: "medium",
        clientId: cid,
        clientName: name,
      });
    }

    const meetings = ctx.executiveNotes.filter(
      (n) =>
        clientId(n.client) === cid &&
        n.noteType === "meeting" &&
        n.reminderDate &&
        new Date(String(n.reminderDate)).getTime() < Date.now(),
    );
    if (meetings.length > 0) {
      patterns.push({
        id: `missed-meetings-${cid}`,
        label: "Missed meetings",
        description: `${meetings.length} meeting note(s) with overdue reminders.`,
        severity: "medium",
        clientId: cid,
        clientName: name,
      });
    }

    const healthGrowing =
      (daysSince(last) ?? 999) < 14 &&
      recentRequests.length >= 1 &&
      activeProjects.length > 0;
    if (healthGrowing) {
      patterns.push({
        id: `growing-client-${cid}`,
        label: "Growing client",
        description: "Recent activity, active projects, and ongoing requests.",
        severity: "low",
        clientId: cid,
        clientName: name,
      });
    }
  }

  patterns.sort(
    (a, b) =>
      ({ critical: 0, high: 1, medium: 2, low: 3 }[a.severity] ?? 9) -
      ({ critical: 0, high: 1, medium: 2, low: 3 }[b.severity] ?? 9),
  );

  return patterns;
}

export async function detectBrainPatternsWithWork(
  ctx: IntelligenceContext,
): Promise<BrainPattern[]> {
  const base = detectBrainPatterns(ctx);
  const work = await detectWorkTaskPatterns(ctx);
  return [...base, ...work];
}

function openCreativeCountProxy(ctx: IntelligenceContext, cid: number): number {
  const open = (items: typeof ctx.campaigns) =>
    items.filter(
      (i) =>
        clientId(i.client) === cid &&
        !["complete", "completed", "cancelled", "archived"].includes(String(i.status)),
    ).length;
  return open(ctx.campaigns) + open(ctx.flyers) + open(ctx.videos) + open(ctx.socialPosts);
}
