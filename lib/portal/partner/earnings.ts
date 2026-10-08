import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { PartnerEarningListItem, PartnerEarningType } from "./types";
import { PARTNER_EARNING_TYPE_LABELS } from "./types";
import { formatPartnerCents } from "./format-cents";

export { formatPartnerCents };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export type PartnerEarningsSummary = {
  projectCommissionsCents: number;
  monthlyBonusesCents: number;
  retentionKickersCents: number;
  performanceBonusesCents: number;
  paidToDateCents: number;
  approvedOutstandingCents: number;
  pendingApprovalCents: number;
  approvedEntries: PartnerEarningListItem[];
};

function asEarningType(value: unknown): PartnerEarningType {
  const raw = String(value ?? "");
  if (raw in PARTNER_EARNING_TYPE_LABELS) return raw as PartnerEarningType;
  return "project_commission";
}

function mapSafeEntry(row: AnyDoc): PartnerEarningListItem | null {
  const status = String(row.paymentStatus);
  if (status !== "approved" && status !== "paid") return null;
  const amount = Number(row.amountCents);
  if (!Number.isFinite(amount) || amount < 0) return null;
  const earningType = asEarningType(row.earningType);
  const relatedReferralId =
    typeof row.relatedPartnerReferral === "number"
      ? row.relatedPartnerReferral
      : typeof row.relatedPartnerReferral === "object" &&
          row.relatedPartnerReferral &&
          "id" in row.relatedPartnerReferral
        ? Number(row.relatedPartnerReferral.id)
        : null;
  const relatedSalesLeadId =
    typeof row.relatedSalesLead === "number"
      ? row.relatedSalesLead
      : typeof row.relatedSalesLead === "object" &&
          row.relatedSalesLead &&
          "id" in row.relatedSalesLead
        ? Number(row.relatedSalesLead.id)
        : null;
  return {
    id: Number(row.id),
    earningType,
    earningTypeLabel: PARTNER_EARNING_TYPE_LABELS[earningType],
    relatedBusinessName: String(row.relatedBusinessName ?? ""),
    amountCents: amount,
    paymentStatus: status === "paid" ? "paid" : "approved",
    paymentStatusLabel: status === "paid" ? "Paid" : "Approved",
    relevantMonth: row.relevantMonth ? String(row.relevantMonth) : null,
    paidAt: row.paidAt ? String(row.paidAt) : null,
    approvedAt: row.approvedAt ? String(row.approvedAt) : null,
    relatedReferralId:
      relatedReferralId != null && Number.isFinite(relatedReferralId)
        ? relatedReferralId
        : null,
    relatedSalesLeadId:
      relatedSalesLeadId != null && Number.isFinite(relatedSalesLeadId)
        ? relatedSalesLeadId
        : null,
  };
}

export async function loadPartnerEarningsSummary(
  partnerId: number,
): Promise<PartnerEarningsSummary> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "partner-earnings" as any,
    where: { partner: { equals: partnerId } },
    limit: 200,
    depth: 0,
    sort: "-createdAt",
    overrideAccess: true,
  });

  let projectCommissionsCents = 0;
  let monthlyBonusesCents = 0;
  let retentionKickersCents = 0;
  let performanceBonusesCents = 0;
  let paidToDateCents = 0;
  let approvedOutstandingCents = 0;
  let pendingApprovalCents = 0;
  const approvedEntries: PartnerEarningListItem[] = [];

  for (const row of result.docs as AnyDoc[]) {
    const amount = Number(row.amountCents);
    if (!Number.isFinite(amount) || amount < 0) continue;
    const status = String(row.paymentStatus);
    const type = asEarningType(row.earningType);

    if (status === "pending_approval") {
      pendingApprovalCents += amount;
      continue;
    }
    if (status === "void") continue;

    const safe = mapSafeEntry(row);
    if (!safe) continue;
    approvedEntries.push(safe);

    if (type === "project_commission") projectCommissionsCents += amount;
    if (type === "monthly_bonus") monthlyBonusesCents += amount;
    if (type === "retention_kicker") retentionKickersCents += amount;
    if (type === "performance_bonus") performanceBonusesCents += amount;
    if (status === "paid") paidToDateCents += amount;
    if (status === "approved") approvedOutstandingCents += amount;
  }

  return {
    projectCommissionsCents,
    monthlyBonusesCents,
    retentionKickersCents,
    performanceBonusesCents,
    paidToDateCents,
    approvedOutstandingCents,
    pendingApprovalCents,
    approvedEntries,
  };
}

export async function listPartnerEarningsForReferral(input: {
  partnerId: number;
  referralId: number;
}): Promise<PartnerEarningListItem[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "partner-earnings" as any,
    where: {
      and: [
        { partner: { equals: input.partnerId } },
        { relatedPartnerReferral: { equals: input.referralId } },
        { paymentStatus: { in: ["approved", "paid"] } },
      ],
    },
    limit: 50,
    depth: 0,
    sort: "-createdAt",
    overrideAccess: true,
  });
  return (result.docs as AnyDoc[])
    .map(mapSafeEntry)
    .filter((row): row is PartnerEarningListItem => row != null);
}
