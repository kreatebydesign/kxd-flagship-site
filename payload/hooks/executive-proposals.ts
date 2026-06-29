import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from "payload";
import { syncProposalPricing } from "@/lib/executive-proposals/sync-pricing";
import { publishExecutiveProposalEvent } from "@/lib/executive-proposals/timeline-publish";
import { statusToTimelineEvent } from "@/lib/executive-proposals/lifecycle";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    return Number((value as AnyDoc).id);
  }
  return null;
}

export const publishExecutiveProposalLifecycleHook: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  const proposalId = doc.id as number;
  const status = String(doc.status ?? "draft");
  const previousStatus = String((previousDoc as AnyDoc | undefined)?.status ?? "");

  try {
    if (operation === "create") {
      await publishExecutiveProposalEvent(
        doc as AnyDoc,
        "proposal.created",
        req.payload,
        `Status: ${status}.`,
      );
      return doc;
    }

    if (status !== previousStatus) {
      const eventType = statusToTimelineEvent(status, "update");
      if (eventType) {
        await publishExecutiveProposalEvent(
          doc as AnyDoc,
          eventType,
          req.payload,
          `Status changed to ${status.replace(/-/g, " ")}.`,
        );
      }

      if (status === "revision-requested") {
        const revision = Number(doc.revisionNumber ?? 1);
        await req.payload.create({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: "proposal-approvals" as any,
          data: {
            proposal: proposalId,
            action: "revision-requested",
            revisionNumber: revision,
            occurredAt: new Date().toISOString(),
            notes: "Revision requested via status change.",
          },
          overrideAccess: true,
        });
      }

      if (status === "questions") {
        await req.payload.create({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: "proposal-approvals" as any,
          data: {
            proposal: proposalId,
            action: "questions",
            revisionNumber: Number(doc.revisionNumber ?? 1),
            occurredAt: new Date().toISOString(),
          },
          overrideAccess: true,
        });
      }

      if (status === "approved") {
        await req.payload.create({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: "proposal-approvals" as any,
          data: {
            proposal: proposalId,
            action: "approved",
            revisionNumber: Number(doc.revisionNumber ?? 1),
            occurredAt: doc.approvedAt ?? new Date().toISOString(),
          },
          overrideAccess: true,
        });
      }

      if (status === "declined" || status === "rejected") {
        await req.payload.create({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: "proposal-approvals" as any,
          data: {
            proposal: proposalId,
            action: "declined",
            revisionNumber: Number(doc.revisionNumber ?? 1),
            occurredAt: new Date().toISOString(),
          },
          overrideAccess: true,
        });
      }
    }
  } catch (err) {
    console.error("[KXD Proposals] Lifecycle hook failed:", err);
  }

  return doc;
};

export const onEstimateItemChangeHook: CollectionAfterChangeHook = async ({ doc, req }) => {
  const proposalId = relId(doc.proposal);
  if (!proposalId) return doc;
  try {
    await syncProposalPricing(proposalId, req.payload);
  } catch (err) {
    console.error("[KXD Proposals] Estimate sync failed:", err);
  }
  return doc;
};

export const onEstimateItemDeleteHook: CollectionAfterDeleteHook = async ({ doc, req }) => {
  const proposalId = relId(doc.proposal);
  if (!proposalId) return doc;
  try {
    await syncProposalPricing(proposalId, req.payload);
  } catch (err) {
    console.error("[KXD Proposals] Estimate sync failed:", err);
  }
  return doc;
};
