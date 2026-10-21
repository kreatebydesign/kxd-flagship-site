import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { getTrainingDashboard } from "@/lib/training/services";
import { getAssignedWorkForStaff } from "./load";
import { buildStaffPlan } from "./plan";
import { staffActorFromUser } from "./actor";
import { staffRoleTitle } from "./permissions";
import { listStaffResponsibilities } from "./responsibilities";
import { listRecentWrapUps } from "./wrap-up";
import {
  countOpenHelpForStaff,
  listOpenHelpRequestsForOversight,
} from "./help-requests";
import { isWaitingOnMatt } from "./prioritize";
import { isWorkSubmittedForReview } from "@/lib/work/list-enrichment";
import { isWorkOverdue } from "@/lib/work/views";
import type { StaffOversightData } from "./types";
import { loadStaffTimeOversightActiveShifts } from "@/lib/staff-time/shifts";
import { staffWorkIntentLabel } from "@/lib/staff-time/intent";
import type { StaffWorkIntentCategory } from "@/lib/staff-time/types";

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
  const draftsSeen = new Set<number>();

  for (const doc of result.docs) {
    const memberActor = staffActorFromUser(doc);
    if (!memberActor) continue;
    if (memberActor.staffRole === "none") continue;
    if (memberActor.role === "admin") continue;

    const userId = memberActor.userId;
    const email = memberActor.email;
    const displayName = memberActor.displayName;
    const staffRole = memberActor.staffRole;

    const assigned = await getAssignedWorkForStaff(memberActor);
    const open = assigned.filter(
      (w) => w.status !== "completed" && w.status !== "archived",
    );
    const waitingOnMatt = open.filter((w) => isWaitingOnMatt(w));
    const submittedForReview = open.filter((w) => isWorkSubmittedForReview(w));
    const blocked = open.filter((w) => w.status === "blocked");
    const overdue = open.filter((w) => isWorkOverdue(w));
    const recentCompleted = assigned.filter((w) => w.status === "completed");

    for (const draft of submittedForReview) {
      if (draftsSeen.has(draft.id)) continue;
      draftsSeen.add(draft.id);
      draftsAwaitingApproval.push({
        workId: draft.id,
        title: draft.title,
        assigneeLabel: displayName,
        href: `/admin/work/${draft.id}`,
        priority: draft.priority,
        dueDate: draft.dueDate,
        deliverableProgress: draft.deliverableProgress ?? null,
      });
    }

    let trainingPercent = 0;
    let startHereLabel: string | null = null;
    let planActionableCount = 0;
    try {
      const dash = await getTrainingDashboard(doc);
      trainingPercent = dash.overallPercent;
      const plan = buildStaffPlan({
        actor: memberActor,
        assigned,
        training: dash,
      });
      startHereLabel = plan.primaryAction.title ?? plan.primaryAction.label;
      planActionableCount = plan.morning.actionableCount;
    } catch {
      trainingPercent = 0;
    }

    const onboardingCompleted = Boolean(memberActor.onboardingCompletedAt);

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
      submittedForReviewCount: submittedForReview.length,
      helpRequestedCount,
      recentCompletedCount: recentCompleted.length,
      blockedCount: blocked.length,
      overdueCount: overdue.length,
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

  let activeTimeShifts: StaffOversightData["activeTimeShifts"] = [];
  try {
    const active = await loadStaffTimeOversightActiveShifts();
    activeTimeShifts = active.map((row) => ({
      shiftId: row.shiftId,
      staffUserId: row.staffUserId,
      staffLabel: row.staffLabel,
      startedAt: row.startedAt,
      workIntentCategory: staffWorkIntentLabel(
        row.workIntentCategory as StaffWorkIntentCategory,
      ),
      elapsedMinutes: row.elapsedMinutes,
    }));
  } catch {
    activeTimeShifts = [];
  }

  return {
    members,
    draftsAwaitingApproval,
    helpRequests,
    responsibilities,
    wrapUps,
    activeTimeShifts,
  };
}
