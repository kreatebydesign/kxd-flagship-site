/**
 * Phase 20A — Public Work Engine service API.
 * Future modules should call these — not Payload directly.
 */

import "server-only";

import {
  archiveWork as archiveWorkIntegration,
  completeWork as completeWorkIntegration,
  updateWork as updateWorkIntegration,
} from "./integration/updates";
import { getClientWork as loadClientWork, getWorkWorkspace } from "./engine";
import { createWork, getWorkById, updateWorkStatus } from "./runner";
import type {
  ClientWorkData,
  CreateWorkInput,
  UpdateWorkItemInput,
  WorkListItem,
  WorkStatus,
  WorkWorkspaceData,
} from "./types";
import {
  filterOverdueWork,
  filterTodayWork,
  filterUpcomingWork,
  filterWorkByStatus,
  sortWorkByPriority,
} from "./views";

export async function createWorkItem(input: CreateWorkInput): Promise<WorkListItem> {
  const result = await createWork(input);
  return result.work;
}

export async function updateWorkItem(input: UpdateWorkItemInput): Promise<WorkListItem> {
  const { workId, actorEmail, ...patch } = input;
  await updateWorkIntegration({
    workId,
    title: patch.title,
    summary: patch.summary,
    description: patch.description,
    notes: patch.notes,
    status: patch.status,
    priority: patch.priority,
    category: patch.category,
    clientId: patch.clientId,
    assignedToId: patch.assignedToId,
    internalProject: patch.internalProject,
    tags: patch.tags,
    estimatedEffort: patch.estimatedEffort,
    dueDate: patch.dueDate,
    startDate: patch.startDate,
    actorEmail,
  });
  const work = await getWorkById(workId);
  if (!work) throw new Error("Work item not found after update.");
  return work;
}

export async function completeWorkItem(
  workId: number,
  actorEmail?: string,
): Promise<WorkListItem> {
  await completeWorkIntegration(workId, actorEmail);
  const work = await getWorkById(workId);
  if (!work) throw new Error("Work item not found after complete.");
  return work;
}

export async function archiveWorkItem(
  workId: number,
  actorEmail?: string,
): Promise<WorkListItem> {
  await archiveWorkIntegration(workId, actorEmail);
  const work = await getWorkById(workId);
  if (!work) throw new Error("Work item not found after archive.");
  return work;
}

export async function getWorkItem(workId: number): Promise<WorkListItem | null> {
  return getWorkById(workId);
}

/** Status transition with activity + timeline (via hooks). */
export async function transitionWorkItem(
  workId: number,
  status: WorkStatus,
  actorEmail?: string,
): Promise<WorkListItem> {
  return updateWorkItem({ workId, status, actorEmail });
}

export async function getWorkEngineWorkspace(): Promise<WorkWorkspaceData> {
  return getWorkWorkspace();
}

/** Client Success — grouped work for one client. Single query. */
export async function getClientWork(clientId: number): Promise<ClientWorkData> {
  return loadClientWork(clientId);
}

export async function getTodayWork(): Promise<WorkListItem[]> {
  const workspace = await getWorkWorkspace();
  return workspace.todayWork.length
    ? workspace.todayWork
    : filterTodayWork(workspace.currentWork);
}

export async function getUpcomingWork(days = 14): Promise<WorkListItem[]> {
  const workspace = await getWorkWorkspace();
  if (days === 14) return workspace.upcoming;
  return filterUpcomingWork(
    [...workspace.currentWork, ...workspace.upcoming, ...workspace.queue],
    days,
  );
}

export async function getBlockedWork(): Promise<WorkListItem[]> {
  const workspace = await getWorkWorkspace();
  return sortWorkByPriority(filterWorkByStatus(workspace.currentWork, "blocked"));
}

export async function getWaitingOnClient(): Promise<WorkListItem[]> {
  const workspace = await getWorkWorkspace();
  return workspace.waitingOnClient;
}

export async function getWaitingOnKXD(): Promise<WorkListItem[]> {
  const workspace = await getWorkWorkspace();
  return workspace.waitingOnKxd;
}

export async function getOverdueWork(): Promise<WorkListItem[]> {
  const workspace = await getWorkWorkspace();
  return workspace.overdue.length
    ? workspace.overdue
    : filterOverdueWork(workspace.currentWork);
}

export async function setWorkStatus(
  workId: number,
  status: WorkListItem["status"],
  actorEmail?: string,
): Promise<WorkListItem> {
  const result = await updateWorkStatus({ workId, status, actorEmail });
  return result.work;
}
