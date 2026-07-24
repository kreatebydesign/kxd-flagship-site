import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { getTrainingDashboard } from "@/lib/training/services";
import { getAssignedWorkForStaff } from "./load";
import { buildStaffPlan } from "./plan";
import { normalizeStaffRole, staffRoleTitle } from "./permissions";
import { listStaffResponsibilities } from "./responsibilities";
import { listRecentWrapUps } from "./wrap-up";
import {
  countOpenHelpForStaff,
  listOpenHelpRequestsForOversight,
} from "./help-requests";
import { isWaitingOnMatt } from "./prioritize";
import type { StaffOversightData, StaffRoleId } from "./types";

/**
 * Administrator-only staff oversight composition.
 * Coaching and readiness — not surveillance.
 */
export async function loadStaffOversight(): Promise<StaffOversightData> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "users",
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });

  const members: StaffOversightData["members"] = [];
  const draftsAwaitingApproval: StaffOversightData["draftsAwaitingApproval"] = [];

  for (const doc of result.docs) {
    const staffRole = normalizeStaffRole(
      (doc as { staffRole?: unknown }).staffRole,
    ) as StaffRoleId;
    if (staffRole === "none") continue;
    if ((doc as { role?: string }).role === "admin") continue;

    const userId = Number(doc.id);
    const email =
      typeof doc.email === "string" ? doc.email.trim().toLowerCase() : "";
    const displayName =
      typeof (doc as { displayName?: string }).displayName === "string" &&
      (doc as { displayName?: string }).displayName!.trim()
        ? (doc as { displayName: string }).displayName.trim()
        : email || `User ${userId}`;

    const assigned = await getAssignedWorkForStaff(userId);
    const open = assigned.filter(
      (w) => w.status !== "completed" && w.status !== "archived",
    );
    const waitingOnMatt = open.filter((w) => isWaitingOnMatt(w));
    const blocked = open.filter((w) => w.status === "blocked");
    const recentCompleted = assigned.filter((w) => w.status === "completed");

    for (const draft of waitingOnMatt) {
      draftsAwaitingApproval.push({
        workId: draft.id,
        title: draft.title,
        assigneeLabel: displayName,
        href: `/admin/work/${draft.id}`,
      });
    }

    let trainingPercent = 0;
    let startHereLabel: string | null = null;
    let planActionableCount = 0;
    try {
      const dash = await getTrainingDashboard(doc);
      trainingPercent = dash.overallPercent;
      const rawOnboarding = (doc as { staffOnboardingCompletedAt?: unknown })
        .staffOnboardingCompletedAt;
      const onboardingCompletedAt =
        typeof rawOnboarding === "string"
          ? rawOnboarding
          : rawOnboarding instanceof Date
            ? rawOnboarding.toISOString()
            : null;
      const actor = {
        userId,
        email,
        displayName,
        role: "editor" as const,
        staffRole,
        onboardingCompletedAt,
      };
      const plan = buildStaffPlan({ actor, assigned, training: dash });
      startHereLabel = plan.primaryAction.title ?? plan.primaryAction.label;
      planActionableCount = plan.morning.actionableCount;
    } catch {
      trainingPercent = 0;
    }

    const onboardingCompleted = Boolean(
      (doc as { staffOnboardingCompletedAt?: unknown }).staffOnboardingCompletedAt,
    );

    let helpRequestedCount = 0;
    try {
      helpRequestedCount = await countOpenHelpForStaff(userId);
    } catch {
      helpRequestedCount = 0;
    }

    members.push({
      userId,
      displayName,
      email,
      staffRole,
      roleTitle: staffRoleTitle(staffRole),
      trainingPercent,
      onboardingCompleted,
      assignedOpenCount: open.length,
      waitingOnMattCount: waitingOnMatt.length,
      helpRequestedCount,
      recentCompletedCount: recentCompleted.length,
      blockedCount: blocked.length,
      startHereLabel,
      planActionableCount,
    });
  }

  let helpRequests: StaffOversightData["helpRequests"] = [];
  try {
    const openHelp = await listOpenHelpRequestsForOversight();
    helpRequests = openHelp.map((row) => ({
      id: String(row.id),
      helpId: row.id,
      staffLabel: row.staffLabel,
      summary: row.question,
      createdAt: row.createdAt,
      href: row.href,
      status: row.status,
      workTitle: row.workTitle,
      mattResponse: row.mattResponse,
      intelligenceResponse: row.intelligenceResponse,
      responseSource: row.responseSource,
      confidence: row.confidence,
      requiresMatt: row.requiresMatt,
    }));
  } catch {
    helpRequests = [];
  }

  let responsibilities: StaffOversightData["responsibilities"] = [];
  try {
    const templates = await listStaffResponsibilities();
    responsibilities = templates.map((t) => ({
      id: t.id,
      title: t.title,
      ownerLabel:
        members.find((m) => m.userId === t.ownerUserId)?.displayName ??
        (t.ownerUserId ? `User ${t.ownerUserId}` : "Unassigned"),
      cadence: t.cadence,
      active: t.active,
      requiresApproval: t.requiresApproval,
    }));
  } catch {
    responsibilities = [];
  }

  let wrapUps: StaffOversightData["wrapUps"] = [];
  try {
    const recent = await listRecentWrapUps(12);
    wrapUps = recent.map((w) => ({
      id: w.id,
      staffLabel: w.staffLabel,
      dateKey: w.dateKey,
      noteForMatt: w.noteForMatt,
      createdAt: w.createdAt,
    }));
  } catch {
    wrapUps = [];
  }

  return {
    members,
    draftsAwaitingApproval,
    helpRequests,
    responsibilities,
    wrapUps,
  };
}
