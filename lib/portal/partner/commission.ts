/**
 * Partner commission policy + ledger helpers.
 * Operators approve all payable entries. Partners never calculate.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { PartnerEarningType } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export type PartnerCommissionPolicy = {
  id: number;
  key: string;
  projectRateBps: number;
  monthlyRateBps: number;
  monthlyBonusMonths: number;
  retentionKickerEnabled: boolean;
  retentionKickerRateBps: number;
  retentionKickerMonth: number;
  eligibleRecurringServices: string[];
  performanceBonusEnabled: boolean;
  performanceBonusAmountCents: number;
  performanceBonusProjectCount: number;
  performanceBonusWindowDays: number;
};

export const DEFAULT_PARTNER_COMMISSION_POLICY: Omit<PartnerCommissionPolicy, "id"> = {
  key: "default",
  projectRateBps: 1000,
  monthlyRateBps: 1000,
  monthlyBonusMonths: 3,
  retentionKickerEnabled: true,
  retentionKickerRateBps: 1000,
  retentionKickerMonth: 4,
  eligibleRecurringServices: [
    "Website Care",
    "Website Management",
    "SEO & Growth",
  ],
  performanceBonusEnabled: true,
  performanceBonusAmountCents: 25_000,
  performanceBonusProjectCount: 3,
  performanceBonusWindowDays: 90,
};

export function amountFromRateBps(
  eligibleCollectedCents: number,
  rateBps: number,
): number {
  if (!Number.isFinite(eligibleCollectedCents) || eligibleCollectedCents < 0) {
    return 0;
  }
  if (!Number.isFinite(rateBps) || rateBps < 0) return 0;
  return Math.round((eligibleCollectedCents * rateBps) / 10_000);
}

function mapPolicy(doc: AnyDoc): PartnerCommissionPolicy {
  const services = String(doc.eligibleRecurringServices ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    id: Number(doc.id),
    key: String(doc.key ?? "default"),
    projectRateBps: Number(doc.projectRateBps ?? 1000),
    monthlyRateBps: Number(doc.monthlyRateBps ?? 1000),
    monthlyBonusMonths: Number(doc.monthlyBonusMonths ?? 3),
    retentionKickerEnabled: doc.retentionKickerEnabled !== false,
    retentionKickerRateBps: Number(doc.retentionKickerRateBps ?? 1000),
    retentionKickerMonth: Number(doc.retentionKickerMonth ?? 4),
    eligibleRecurringServices:
      services.length > 0
        ? services
        : [...DEFAULT_PARTNER_COMMISSION_POLICY.eligibleRecurringServices],
    performanceBonusEnabled: doc.performanceBonusEnabled !== false,
    performanceBonusAmountCents: Number(doc.performanceBonusAmountCents ?? 25_000),
    performanceBonusProjectCount: Number(doc.performanceBonusProjectCount ?? 3),
    performanceBonusWindowDays: Number(doc.performanceBonusWindowDays ?? 90),
  };
}

export async function loadPartnerCommissionPolicy(
  key = "default",
): Promise<PartnerCommissionPolicy> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "partner-commission-policies" as any,
    where: {
      and: [{ key: { equals: key } }, { active: { equals: true } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (result.docs[0]) return mapPolicy(result.docs[0] as AnyDoc);

  const created = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "partner-commission-policies" as any,
    data: {
      ...DEFAULT_PARTNER_COMMISSION_POLICY,
      eligibleRecurringServices:
        DEFAULT_PARTNER_COMMISSION_POLICY.eligibleRecurringServices.join("\n"),
      active: true,
    },
    overrideAccess: true,
  });
  return mapPolicy(created as AnyDoc);
}

export type CreatePartnerEarningInput = {
  partnerId: number;
  earningType: PartnerEarningType;
  relatedBusinessName: string;
  amountCents: number;
  rateBps?: number;
  eligibleCollectedCents?: number;
  relevantMonth?: string;
  coveredServiceMonth?: number;
  relatedSalesLeadId?: number;
  relatedPartnerReferralId?: number;
  operatorNotes?: string;
  paymentStatus?: "pending_approval" | "approved" | "paid" | "void";
  approvedBy?: string;
};

/**
 * Operator-only ledger create. Never auto-pays.
 * Prefer calculating amount via amountFromRateBps from collected revenue.
 */
export async function createPartnerEarningEntry(
  input: CreatePartnerEarningInput,
): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
  if (!input.partnerId || !Number.isFinite(input.partnerId)) {
    return { ok: false, message: "Partner is required." };
  }
  if (!input.relatedBusinessName.trim()) {
    return { ok: false, message: "Related business is required." };
  }
  if (!Number.isFinite(input.amountCents) || input.amountCents < 0) {
    return { ok: false, message: "Valid amount is required." };
  }

  try {
    const payload = await getPayload({ config });
    const status = input.paymentStatus ?? "pending_approval";
    const now = new Date().toISOString();
    const created = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "partner-earnings" as any,
      data: {
        partner: input.partnerId,
        earningType: input.earningType,
        paymentStatus: status,
        relatedBusinessName: input.relatedBusinessName.trim(),
        amountCents: input.amountCents,
        rateBps: input.rateBps,
        eligibleCollectedCents: input.eligibleCollectedCents,
        relevantMonth: input.relevantMonth,
        coveredServiceMonth: input.coveredServiceMonth,
        relatedSalesLead: input.relatedSalesLeadId,
        relatedPartnerReferral: input.relatedPartnerReferralId,
        operatorNotes: input.operatorNotes,
        approvedBy: input.approvedBy,
        approvedAt: status === "approved" || status === "paid" ? now : undefined,
        paidAt: status === "paid" ? now : undefined,
      },
      overrideAccess: true,
    });
    return { ok: true, id: Number(created.id) };
  } catch (err) {
    console.error("[KXD Partner] Earning create failed:", err);
    return { ok: false, message: "Failed to create earning entry." };
  }
}

export async function transitionPartnerEarningStatus(input: {
  earningId: number;
  status: "approved" | "paid" | "void";
  approvedBy?: string;
  operatorNotes?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const payload = await getPayload({ config });
    const now = new Date().toISOString();
    const data: Record<string, unknown> = {
      paymentStatus: input.status,
    };
    if (input.operatorNotes) data.operatorNotes = input.operatorNotes;
    if (input.status === "approved") {
      data.approvedAt = now;
      data.approvedBy = input.approvedBy;
    }
    if (input.status === "paid") {
      data.paidAt = now;
      if (input.approvedBy) data.approvedBy = input.approvedBy;
      if (!data.approvedAt) data.approvedAt = now;
    }
    if (input.status === "void") {
      data.voidedAt = now;
    }

    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "partner-earnings" as any,
      id: input.earningId,
      data,
      overrideAccess: true,
    });
    return { ok: true };
  } catch (err) {
    console.error("[KXD Partner] Earning transition failed:", err);
    return { ok: false, message: "Failed to update earning." };
  }
}
