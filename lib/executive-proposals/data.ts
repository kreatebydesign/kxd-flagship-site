import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  displayProposalStatus,
  isOpenProposalStatus,
  needsProposalFollowUp,
} from "./lifecycle";
import type {
  ProposalDoc,
  WorkspaceProposalApprovalRow,
  WorkspaceProposalRow,
  WorkspaceProposalsSnapshot,
} from "./types";

const PROPOSALS = "proposals";
const APPROVALS = "proposal-approvals";

function relId(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    return Number((value as ProposalDoc).id);
  }
  return null;
}

function toProposalRow(doc: ProposalDoc): WorkspaceProposalRow {
  const id = doc.id as number;
  const snapshot = doc.pricingSnapshot as Record<string, unknown> | undefined;
  const oneTime =
    snapshot?.grandOneTimeTotal != null
      ? Number(snapshot.grandOneTimeTotal)
      : doc.investment != null
        ? Number(doc.investment)
        : null;
  const recurring =
    snapshot?.grandRecurringTotal != null
      ? Number(snapshot.grandRecurringTotal)
      : doc.recurringAmount != null
        ? Number(doc.recurringAmount)
        : null;
  const annual =
    snapshot?.projectedAnnualValue != null ? Number(snapshot.projectedAnnualValue) : null;

  return {
    id,
    proposalNumber: String(doc.proposalNumber ?? id),
    title: String(doc.title ?? "Proposal"),
    status: String(doc.status ?? "draft"),
    displayStatus: displayProposalStatus(String(doc.status ?? "draft")),
    proposalType: doc.proposalType ? String(doc.proposalType) : null,
    oneTimeTotal: oneTime,
    recurringTotal: recurring,
    projectedAnnualValue: annual,
    lastViewedAt: doc.lastViewedAt ? String(doc.lastViewedAt) : null,
    sentAt: doc.sentAt ? String(doc.sentAt) : null,
    expiresAt: doc.expiresAt ? String(doc.expiresAt) : null,
    approvedAt: doc.approvedAt ? String(doc.approvedAt) : null,
    approvalStatus: doc.approvalStatus ? String(doc.approvalStatus) : null,
    revisionNumber: doc.revisionNumber != null ? Number(doc.revisionNumber) : 1,
    href: `/admin/sales/proposals/${id}`,
    builderHref: `/admin/sales/proposals/${id}`,
  };
}

export async function loadClientProposalsSnapshot(
  clientId: number,
): Promise<WorkspaceProposalsSnapshot> {
  const payload = await getPayload({ config });

  const proposalsR = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: PROPOSALS as any,
    where: { client: { equals: clientId } },
    limit: 50,
    sort: "-updatedAt",
    depth: 0,
    overrideAccess: true,
  });

  const proposals = (proposalsR.docs as ProposalDoc[]).map(toProposalRow);
  const proposalIds = proposals.map((p) => p.id);

  let approvals: WorkspaceProposalApprovalRow[] = [];
  if (proposalIds.length > 0) {
    const approvalsResult = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: APPROVALS as any,
      where: { proposal: { in: proposalIds } },
      limit: 100,
      sort: "-occurredAt",
      depth: 0,
      overrideAccess: true,
    });
    approvals = approvalsResult.docs.map((doc) => {
      const d = doc as ProposalDoc;
      return {
        id: d.id as number,
        action: String(d.action ?? ""),
        actorName: d.actorName ? String(d.actorName) : null,
        notes: d.notes ? String(d.notes) : null,
        revisionNumber: d.revisionNumber != null ? Number(d.revisionNumber) : 1,
        occurredAt: String(d.occurredAt ?? d.createdAt ?? ""),
      };
    });
  }

  const open = proposals.filter((p) => isOpenProposalStatus(p.status));
  const current =
    open.sort((a, b) => {
      const rank = (s: string) =>
        s === "revision-requested" || s === "questions" ? 0 : s === "viewed" ? 1 : 2;
      return rank(a.status) - rank(b.status);
    })[0] ?? null;

  return {
    current,
    proposals,
    approvals,
    openCount: open.length,
    pendingFollowUpCount: proposals.filter((p) => needsProposalFollowUp(p.status)).length,
  };
}

export async function loadProposalsForClientIds(
  clientIds: number[],
): Promise<ProposalDoc[]> {
  if (!clientIds.length) return [];
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: PROPOSALS as any,
    where: { client: { in: clientIds } },
    limit: 300,
    depth: 1,
    overrideAccess: true,
  });
  return result.docs as ProposalDoc[];
}
