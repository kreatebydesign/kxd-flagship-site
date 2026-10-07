/**
 * Studio-operator helpers for Partner Portal Phase 1.1 / Network Command Phase 2.
 * Never imported by partner UI routes.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  deriveNetworkCommand,
  type NetworkCommandBookingInput,
  type NetworkCommandEarningInput,
  type NetworkCommandNoteInput,
  type NetworkCommandProfileInput,
  type NetworkCommandReferralInput,
  type NetworkCommandSalesLeadInput,
  type NetworkCommandWorkspace,
} from "./network-command";
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

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id: unknown }).id;
    if (typeof id === "number" && Number.isFinite(id)) return id;
    if (typeof id === "string" && /^\d+$/.test(id)) return Number(id);
  }
  return null;
}

async function findAllCollection(collection: string, sort = "-createdAt"): Promise<AnyDoc[]> {
  const payload = await getPayload({ config });
  const docs: AnyDoc[] = [];
  let page = 1;
  while (page <= 20) {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: collection as any,
      limit: 100,
      page,
      depth: 0,
      sort,
      overrideAccess: true,
    });
    docs.push(...(result.docs as AnyDoc[]));
    if (page >= result.totalPages) break;
    page += 1;
  }
  return docs;
}

function mapProfileStatus(raw: unknown): NetworkCommandProfileInput["status"] {
  if (raw === "active") return "active";
  if (raw === "invited") return "invited";
  return "inactive";
}

function mapProfile(doc: AnyDoc): NetworkCommandProfileInput {
  return {
    id: Number(doc.id),
    displayName: String(doc.displayName ?? "").trim() || "Partner",
    status: mapProfileStatus(doc.status),
    notes: doc.notes ? String(doc.notes) : null,
  };
}

function mapReferral(doc: AnyDoc): NetworkCommandReferralInput {
  return {
    id: Number(doc.id),
    partnerId: relId(doc.sourcedByPartner) ?? 0,
    businessName: String(doc.businessName ?? ""),
    contactName: String(doc.contactName ?? ""),
    visibilityState: String(doc.partnerVisibilityState ?? "submitted"),
    internalStatus: String(doc.internalStatus ?? "new"),
    decisionMakerConfirmed: doc.decisionMakerConfirmed === true,
    internalNotes: doc.internalNotes ? String(doc.internalNotes) : null,
    promotedSalesLeadId: relId(doc.promotedSalesLead),
    createdAt: String(doc.createdAt ?? ""),
  };
}

function mapBooking(doc: AnyDoc): NetworkCommandBookingInput {
  return {
    id: Number(doc.id),
    partnerId: relId(doc.sourcedByPartner) ?? 0,
    status: String(doc.status ?? ""),
    bookingMode: String(doc.bookingMode ?? "request"),
    preferredTimes: doc.preferredTimes ? String(doc.preferredTimes) : null,
    slotStart: doc.slotStart ? String(doc.slotStart) : null,
    relatedReferralId: relId(doc.relatedPartnerReferral),
    createdAt: String(doc.createdAt ?? ""),
  };
}

function mapNote(doc: AnyDoc): NetworkCommandNoteInput {
  return {
    id: Number(doc.id),
    partnerId: relId(doc.sourcedByPartner) ?? 0,
    referralId: relId(doc.referral) ?? 0,
    createdAt: String(doc.createdAt ?? ""),
  };
}

function mapEarning(doc: AnyDoc): NetworkCommandEarningInput {
  return {
    id: Number(doc.id),
    partnerId: relId(doc.partner) ?? 0,
    earningType: String(doc.earningType ?? ""),
    paymentStatus: String(doc.paymentStatus ?? "pending_approval"),
    amountCents: Number(doc.amountCents ?? 0),
    relatedBusinessName: String(doc.relatedBusinessName ?? ""),
    relatedReferralId: relId(doc.relatedPartnerReferral),
    relatedSalesLeadId: relId(doc.relatedSalesLead),
    approvedAt: doc.approvedAt ? String(doc.approvedAt) : null,
    paidAt: doc.paidAt ? String(doc.paidAt) : null,
    createdAt: String(doc.createdAt ?? ""),
  };
}

function mapSalesLead(doc: AnyDoc): NetworkCommandSalesLeadInput {
  return {
    id: Number(doc.id),
    partnerId: relId(doc.sourcedByPartner) ?? 0,
    sourceReferralId: relId(doc.sourcePartnerReferral),
    companyName: String(doc.companyName ?? ""),
    status: String(doc.status ?? ""),
    nextFollowUp: doc.nextFollowUp ? String(doc.nextFollowUp) : null,
  };
}

async function findPartnerSourcedSalesLeads(): Promise<AnyDoc[]> {
  const payload = await getPayload({ config });
  const docs: AnyDoc[] = [];
  let page = 1;
  while (page <= 20) {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "sales-leads" as any,
      where: { sourcedByPartner: { exists: true } },
      limit: 100,
      page,
      depth: 0,
      sort: "-updatedAt",
      overrideAccess: true,
    });
    docs.push(...(result.docs as AnyDoc[]));
    if (page >= result.totalPages) break;
    page += 1;
  }
  return docs;
}

export async function loadNetworkCommandWorkspace(): Promise<NetworkCommandWorkspace> {
  const [profiles, referrals, bookings, notes, earnings, salesLeads, policy] =
    await Promise.all([
      findAllCollection("kxd-partner-profiles", "displayName"),
      findAllCollection("partner-referrals"),
      findAllCollection("partner-booking-requests"),
      findAllCollection("partner-referral-notes"),
      findAllCollection("partner-earnings"),
      findPartnerSourcedSalesLeads(),
      loadPartnerCommissionPolicy("default"),
    ]);

  const partnerIds = new Set(
    profiles.map((doc) => Number(doc.id)).filter((id) => Number.isFinite(id)),
  );

  const { listPartnerInvitationsByProfileIds } = await import("./invitations");
  const invitations = await listPartnerInvitationsByProfileIds([...partnerIds]);

  const profileInputs = profiles
    .map(mapProfile)
    .filter((row) => row.id > 0)
    .map((row) => {
      const invite = invitations.get(row.id);
      return {
        ...row,
        email: invite?.email ?? null,
        rosterState: invite?.rosterState ?? (row.status === "active" ? "active" : row.status === "invited" ? "invited" : "inactive"),
        invitationId: invite?.id ?? null,
        invitationExpiresAt: invite?.expiresAt ?? null,
        canResendInvitation: invite?.canResend === true,
        canRevokeInvitation: invite?.canRevoke === true,
      } satisfies NetworkCommandProfileInput;
    });

  return deriveNetworkCommand({
    profiles: profileInputs,
    referrals: referrals.map(mapReferral).filter((row) => partnerIds.has(row.partnerId)),
    bookings: bookings.map(mapBooking).filter((row) => partnerIds.has(row.partnerId)),
    notes: notes.map(mapNote).filter((row) => partnerIds.has(row.partnerId)),
    earnings: earnings.map(mapEarning).filter((row) => partnerIds.has(row.partnerId)),
    salesLeads: salesLeads
      .map(mapSalesLead)
      .filter((row) => partnerIds.has(row.partnerId)),
    policy: {
      performanceBonusEnabled: policy.performanceBonusEnabled,
      performanceBonusAmountCents: policy.performanceBonusAmountCents,
      performanceBonusProjectCount: policy.performanceBonusProjectCount,
      performanceBonusWindowDays: policy.performanceBonusWindowDays,
    },
  });
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
