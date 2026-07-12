/**
 * Phase 26B — Load scheduling proposals for the Proposal Workspace.
 * Occupancy / policy evidence only — no Google event titles or credentials.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { WORK_COLLECTION, WORK_ENGINE_HOME } from "@/lib/work/constants";
import { SCHEDULE_LINK_COLLECTION } from "./types";
import type {
  ScheduleLinkStatus,
  SchedulingPolicyEvidence,
  WorkScheduleLinkRecord,
} from "./types";
import {
  dedupeActiveProposalsPerWork,
  workspaceGroupForStatus,
  type SchedulingProposalAuditEntry,
  type SchedulingProposalCard,
  type SchedulingProposalDetail,
} from "./workspace";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapLink(doc: AnyDoc): WorkScheduleLinkRecord {
  return {
    id: doc.id as number,
    workId: relId(doc.work) ?? 0,
    calendarOwnerId: relId(doc.calendarOwner),
    requestedById: relId(doc.requestedBy),
    approvedById: relId(doc.approvedBy),
    status: doc.status as ScheduleLinkStatus,
    approvalStatus: doc.approvalStatus,
    syncStatus: doc.syncStatus,
    schedulingMode: doc.schedulingMode,
    permissionLevel: Number(doc.permissionLevel) as 1 | 2 | 3,
    proposedStart: String(doc.proposedStart),
    proposedEnd: String(doc.proposedEnd),
    timezone: String(doc.timezone ?? "America/Los_Angeles"),
    durationMinutes: Number(doc.durationMinutes),
    schedulingReason: doc.schedulingReason ? String(doc.schedulingReason) : null,
    evidenceSummary: doc.evidenceSummary ? String(doc.evidenceSummary) : null,
    confidence: doc.confidence ?? "medium",
    source: doc.source ?? "operator",
    restrictionReason: doc.restrictionReason
      ? String(doc.restrictionReason)
      : null,
    rejectionReason: doc.rejectionReason ? String(doc.rejectionReason) : null,
    canceledReason: doc.canceledReason ? String(doc.canceledReason) : null,
    supersededReason: doc.supersededReason
      ? String(doc.supersededReason)
      : null,
    replacedById: relId(doc.replacedBy),
    googleCalendarId: null,
    googleEventId: null,
    googleEventEtag: null,
    googleEventUpdatedAt: null,
    googleEventHtmlLink: null,
    policySnapshot: (doc.policySnapshot as SchedulingPolicyEvidence) ?? null,
    conflictSnapshot: null,
    displacedItemSnapshot: null,
    metadata: (doc.metadata as Record<string, unknown>) ?? null,
    createdAt: String(doc.createdAt ?? ""),
    updatedAt: String(doc.updatedAt ?? ""),
  };
}

function userLabel(doc: AnyDoc | null | undefined): string | null {
  if (!doc) return null;
  if (typeof doc.displayName === "string" && doc.displayName.trim()) {
    return doc.displayName.trim();
  }
  if (typeof doc.email === "string" && doc.email.trim()) {
    return doc.email.trim();
  }
  return null;
}

async function resolveUserLabel(
  payload: Awaited<ReturnType<typeof getPayload>>,
  userId: number | null,
): Promise<string | null> {
  if (userId == null) return null;
  try {
    const user = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "users" as any,
      id: userId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
    return userLabel(user);
  } catch {
    return null;
  }
}

async function loadWorkBundle(
  payload: Awaited<ReturnType<typeof getPayload>>,
  workId: number,
): Promise<{
  title: string;
  summary: string | null;
  description: string | null;
  priority: string | null;
  status: string | null;
  clientName: string;
  project: string | null;
  estimatedEffortHours: number | null;
  activityHistory: SchedulingProposalAuditEntry[];
} | null> {
  try {
    const doc = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: WORK_COLLECTION as any,
      id: workId,
      depth: 1,
      overrideAccess: true,
    })) as AnyDoc;

    let clientName = "Internal";
    const client = doc.client;
    if (client && typeof client === "object") {
      clientName =
        String(client.name ?? client.companyName ?? client.title ?? "Client") ||
        "Client";
    }

    const history = Array.isArray(doc.activityHistory)
      ? (doc.activityHistory as AnyDoc[])
          .filter((e) => String(e.action ?? "").startsWith("schedule."))
          .map((e) => ({
            at: String(e.at ?? ""),
            actor: e.actor != null ? String(e.actor) : null,
            action: String(e.action ?? ""),
            detail: e.detail != null ? String(e.detail) : null,
          }))
          .reverse()
      : [];

    return {
      title: String(doc.title ?? "Work"),
      summary: doc.summary ? String(doc.summary) : null,
      description: doc.description ? String(doc.description) : null,
      priority: doc.priority ? String(doc.priority) : null,
      status: doc.status ? String(doc.status) : null,
      clientName,
      project: doc.internalProject ? String(doc.internalProject) : null,
      estimatedEffortHours:
        typeof doc.estimatedEffort === "number" ? doc.estimatedEffort : null,
      activityHistory: history,
    };
  } catch {
    return null;
  }
}

export async function listSchedulingProposals(opts?: {
  limit?: number;
  statuses?: ScheduleLinkStatus[];
}): Promise<{
  proposals: SchedulingProposalCard[];
  totalDocs: number;
}> {
  const payload = await getPayload({ config });
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 200);

  const where = opts?.statuses?.length
    ? { status: { in: opts.statuses } }
    : undefined;

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: SCHEDULE_LINK_COLLECTION as any,
    where,
    sort: "-updatedAt",
    limit,
    depth: 0,
    overrideAccess: true,
  });

  const proposals: SchedulingProposalCard[] = [];

  for (const raw of result.docs as AnyDoc[]) {
    const link = mapLink(raw);
    // Strip Google stubs from list payloads (already null in mapLink)
    const group = workspaceGroupForStatus(link.status);
    if (!group) continue;

    const work = await loadWorkBundle(payload, link.workId);
    const requestedByLabel = await resolveUserLabel(payload, link.requestedById);

    proposals.push({
      link,
      workTitle: work?.title ?? `Work #${link.workId}`,
      workHref: `${WORK_ENGINE_HOME}/${link.workId}`,
      clientName: work?.clientName ?? "—",
      project: work?.project ?? null,
      estimatedEffortHours: work?.estimatedEffortHours ?? null,
      requestedByLabel,
      policy:
        link.policySnapshot && typeof link.policySnapshot === "object"
          ? (link.policySnapshot as SchedulingPolicyEvidence)
          : null,
      group,
    });
  }

  return {
    proposals: dedupeActiveProposalsPerWork(proposals),
    totalDocs: result.totalDocs,
  };
}

export async function getSchedulingProposalDetail(
  linkId: number,
): Promise<SchedulingProposalDetail | null> {
  const payload = await getPayload({ config });
  let doc: AnyDoc;
  try {
    doc = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: SCHEDULE_LINK_COLLECTION as any,
      id: linkId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
  } catch {
    return null;
  }

  const link = mapLink(doc);
  const group = workspaceGroupForStatus(link.status);
  // Superseded is historical — still loadable for audit, not listed in active groups.
  if (!group && link.status !== "superseded") return null;
  const resolvedGroup = group ?? ("cancelled" as const);

  const work = await loadWorkBundle(payload, link.workId);
  const requestedByLabel = await resolveUserLabel(payload, link.requestedById);

  return {
    link,
    workTitle: work?.title ?? `Work #${link.workId}`,
    workHref: `${WORK_ENGINE_HOME}/${link.workId}`,
    clientName: work?.clientName ?? "—",
    project: work?.project ?? null,
    estimatedEffortHours: work?.estimatedEffortHours ?? null,
    requestedByLabel,
    policy:
      link.policySnapshot && typeof link.policySnapshot === "object"
        ? (link.policySnapshot as SchedulingPolicyEvidence)
        : null,
    group: resolvedGroup,
    workSummary: work?.summary ?? null,
    workDescription: work?.description ?? null,
    workPriority: work?.priority ?? null,
    workStatus: work?.status ?? null,
    auditHistory: work?.activityHistory ?? [],
  };
}
