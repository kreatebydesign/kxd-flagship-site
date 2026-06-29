/**
 * Payload-safe pricing sync — no server-only.
 * Used by Payload hooks and CLI migrate (via payload.config import graph).
 */
import type { Payload } from "payload";
import { getPayload } from "payload";
import config from "@payload-config";
import { calculateEstimateTotals, mergePricingIntoProposalFields } from "./pricing";
import type { EstimateItemInput, ProposalDoc } from "./types";

const PROPOSALS = "proposals";
const ESTIMATE_ITEMS = "estimate-items";

export async function loadEstimateItemsForProposal(
  proposalId: number,
  payloadInstance?: Payload,
): Promise<EstimateItemInput[]> {
  const payload = payloadInstance ?? (await getPayload({ config }));
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: ESTIMATE_ITEMS as any,
    where: { proposal: { equals: proposalId } },
    limit: 100,
    sort: "sortOrder",
    depth: 0,
    overrideAccess: true,
  });

  return result.docs.map((doc) => {
    const d = doc as ProposalDoc;
    return {
      id: d.id as number,
      title: String(d.title ?? "Item"),
      description: d.description ? String(d.description) : null,
      itemType: String(d.itemType ?? "fixed"),
      quantity: d.quantity != null ? Number(d.quantity) : 1,
      unitPrice: d.unitPrice != null ? Number(d.unitPrice) : 0,
      hours: d.hours != null ? Number(d.hours) : 0,
      isRecurring: Boolean(d.isRecurring),
      isOptional: Boolean(d.isOptional),
      includedByDefault: d.includedByDefault !== false,
      discountable: d.discountable !== false,
      sortOrder: d.sortOrder != null ? Number(d.sortOrder) : 0,
    };
  });
}

export async function syncProposalPricing(
  proposalId: number,
  payloadInstance?: Payload,
): Promise<void> {
  const payload = payloadInstance ?? (await getPayload({ config }));
  const proposal = await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: PROPOSALS as any,
    id: proposalId,
    depth: 0,
    overrideAccess: true,
  });

  const items = await loadEstimateItemsForProposal(proposalId, payload);
  if (!items.length) return;

  const totals = calculateEstimateTotals(items, {
    discountType:
      proposal.discountType === "percent" || proposal.discountType === "fixed"
        ? proposal.discountType
        : "none",
    discountValue: proposal.discountValue != null ? Number(proposal.discountValue) : 0,
    taxRate: proposal.taxRate != null ? Number(proposal.taxRate) : 0,
  });

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: PROPOSALS as any,
    id: proposalId,
    data: mergePricingIntoProposalFields(totals),
    overrideAccess: true,
  });
}
