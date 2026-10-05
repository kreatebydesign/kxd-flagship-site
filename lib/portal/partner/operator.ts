/**
 * Studio-operator helpers for Partner Portal Phase 1.1.
 * Never imported by partner UI routes.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { PARTNER_VISIBILITY_STATES, type PartnerVisibilityState } from "./types";
import {
  createPartnerEarningEntry,
  loadPartnerCommissionPolicy,
  transitionPartnerEarningStatus,
  type CreatePartnerEarningInput,
} from "./commission";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export async function operatorListPartnerReferrals(limit = 50): Promise<AnyDoc[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "partner-referrals" as any,
    limit,
    depth: 1,
    sort: "-createdAt",
    overrideAccess: true,
  });
  return result.docs as AnyDoc[];
}

export async function operatorUpdatePartnerVisibility(input: {
  referralId: number;
  visibilityState: PartnerVisibilityState;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!(PARTNER_VISIBILITY_STATES as readonly string[]).includes(input.visibilityState)) {
    return { ok: false, message: "Invalid visibility state." };
  }
  try {
    const payload = await getPayload({ config });
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "partner-referrals" as any,
      id: input.referralId,
      data: { partnerVisibilityState: input.visibilityState },
      overrideAccess: true,
    });
    return { ok: true };
  } catch {
    return { ok: false, message: "Failed to update referral." };
  }
}

export async function operatorSetPartnerActive(input: {
  partnerId: number;
  status: "active" | "inactive";
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const payload = await getPayload({ config });
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "kxd-partner-profiles" as any,
      id: input.partnerId,
      data: { status: input.status },
      overrideAccess: true,
    });
    return { ok: true };
  } catch {
    return { ok: false, message: "Failed to update partner." };
  }
}

export async function operatorCreateEarning(input: CreatePartnerEarningInput) {
  return createPartnerEarningEntry(input);
}

export async function operatorTransitionEarning(input: {
  earningId: number;
  status: "approved" | "paid" | "void";
  approvedBy?: string;
  operatorNotes?: string;
}) {
  return transitionPartnerEarningStatus(input);
}

export async function operatorListBookings(limit = 50): Promise<AnyDoc[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "partner-booking-requests" as any,
    limit,
    depth: 1,
    sort: "-createdAt",
    overrideAccess: true,
  });
  return result.docs as AnyDoc[];
}

export async function operatorListEarnings(limit = 50): Promise<AnyDoc[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "partner-earnings" as any,
    limit,
    depth: 0,
    sort: "-createdAt",
    overrideAccess: true,
  });
  return result.docs as AnyDoc[];
}

export async function operatorGetPolicy() {
  return loadPartnerCommissionPolicy("default");
}

export async function operatorUpdatePolicy(input: {
  projectRateBps?: number;
  monthlyRateBps?: number;
  monthlyBonusMonths?: number;
  retentionKickerEnabled?: boolean;
  retentionKickerRateBps?: number;
  retentionKickerMonth?: number;
  eligibleRecurringServices?: string;
  performanceBonusEnabled?: boolean;
  performanceBonusAmountCents?: number;
  performanceBonusProjectCount?: number;
  performanceBonusWindowDays?: number;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const policy = await loadPartnerCommissionPolicy("default");
    const payload = await getPayload({ config });
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "partner-commission-policies" as any,
      id: policy.id,
      data: input,
      overrideAccess: true,
    });
    return { ok: true };
  } catch {
    return { ok: false, message: "Failed to update policy." };
  }
}
