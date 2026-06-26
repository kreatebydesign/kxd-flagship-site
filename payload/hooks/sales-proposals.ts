import type { CollectionAfterChangeHook } from "payload";
import { executeProposalConversion } from "@/lib/sales/acquisition";
import { prepareProposalConversionWorkflow } from "@/lib/sales/automation";
import { isPaymentComplete } from "@/lib/sales/public-core";
import { logSalesActivityRecord, publishSalesTimelineEvent } from "@/lib/sales/timeline-events";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export const onProposalStatusChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
}) => {
  const status = String(doc.status ?? "");
  const previousStatus = String((previousDoc as AnyDoc | undefined)?.status ?? "");

  if (status === "approved" && previousStatus !== "approved") {
    try {
      if (!doc.conversionPreparedAt) {
        const workflow = await prepareProposalConversionWorkflow(doc.id as number, req.payload);
        await req.payload.update({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: "proposals" as any,
          id: doc.id as number,
          data: {
            conversionPreparedAt: new Date().toISOString(),
            approvedAt: doc.approvedAt ?? new Date().toISOString(),
            conversionDraft: workflow,
            approvalStatus: "ready",
          },
          overrideAccess: true,
        });
      }

      const clientId =
        typeof doc.client === "object" && doc.client !== null
          ? (doc.client as AnyDoc).id
          : doc.client;

      await publishSalesTimelineEvent(
        {
          eventType: "sales.proposal-approved",
          clientId: clientId as number | undefined,
          proposalId: doc.id as number,
          title: `Proposal approved · ${String(doc.title ?? doc.proposalNumber)}`,
          summary: "Proposal approved with agreement and payment requirements met.",
        },
        req.payload,
      );

      if (isPaymentComplete(doc) && !doc.conversionExecutedAt) {
        await executeProposalConversion(doc.id as number, req.payload);
      } else {
        const leadId =
          typeof doc.lead === "object" && doc.lead !== null
            ? (doc.lead as AnyDoc).id
            : doc.lead;

        await logSalesActivityRecord(req.payload, {
          activityType: "note",
          title: `Proposal approved · ${String(doc.title ?? doc.proposalNumber)}`,
          summary: doc.conversionExecutedAt
            ? "Conversion already executed."
            : "Conversion workflow prepared — execute via wizard when ready.",
          leadId: leadId ?? undefined,
          proposalId: doc.id as number,
          clientId: clientId as number | undefined,
        });
      }
    } catch (err) {
      console.error("[KXD Sales] Failed proposal approval workflow:", err);
    }
  }

  if (status === "rejected" && previousStatus !== "rejected") {
    const clientId =
      typeof doc.client === "object" && doc.client !== null
        ? (doc.client as AnyDoc).id
        : doc.client;
    await publishSalesTimelineEvent(
      {
        eventType: "sales.proposal-rejected",
        clientId: clientId as number | undefined,
        proposalId: doc.id as number,
        title: `Proposal declined · ${String(doc.title ?? doc.proposalNumber)}`,
      },
      req.payload,
    );
  }

  return doc;
};
