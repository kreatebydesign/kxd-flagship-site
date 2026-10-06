import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { logSalesActivity } from "@/lib/sales/activities";
import { initialResponseDueAt } from "@/lib/sales/follow-up-policy";
import type { SalesDoc } from "@/lib/sales/types";
import { listPartnerBookingsSafe } from "./calendar-booking";
import { listPartnerEarningsForReferral, loadPartnerEarningsSummary } from "./earnings";
import { listPartnerReferralNotes } from "./notes";
import type {
  PartnerHomeSnapshot,
  PartnerReferralDetail,
  PartnerReferralListItem,
  PartnerReferralSubmitInput,
  PartnerVisibilityState,
} from "./types";
import {
  PARTNER_VISIBILITY_LABELS,
  PARTNER_VISIBILITY_MEANINGS,
  PARTNER_VISIBILITY_STATES,
} from "./types";
import {
  countPartnerPathMetrics,
  PARTNER_OPEN_BOOKING_STATUSES,
} from "./path-metrics";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function trim(value: unknown, max = 2000): string {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function asVisibility(value: unknown): PartnerVisibilityState {
  const raw = String(value ?? "");
  if ((PARTNER_VISIBILITY_STATES as readonly string[]).includes(raw)) {
    return raw as PartnerVisibilityState;
  }
  return "submitted";
}

function mapListItem(
  doc: AnyDoc,
  nextCallAt: string | null = null,
): PartnerReferralListItem {
  const state = asVisibility(doc.partnerVisibilityState);
  return {
    id: Number(doc.id),
    businessName: String(doc.businessName ?? ""),
    contactName: String(doc.contactName ?? ""),
    industry: doc.industry ? String(doc.industry) : null,
    visibilityState: state,
    visibilityLabel: PARTNER_VISIBILITY_LABELS[state],
    submittedAt: String(doc.createdAt ?? ""),
    nextCallAt,
  };
}

export function normalizePartnerReferralInput(
  body: Record<string, unknown>,
):
  | { ok: true; data: PartnerReferralSubmitInput }
  | { ok: false; message: string } {
  const businessName = trim(body.businessName, 200);
  const contactName = trim(body.contactName, 200);
  if (!businessName) return { ok: false, message: "Business name is required." };
  if (!contactName) return { ok: false, message: "Contact name is required." };

  const email = trim(body.email, 320);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  return {
    ok: true,
    data: {
      businessName,
      contactName,
      contactRole: trim(body.contactRole, 120) || undefined,
      phone: trim(body.phone, 80) || undefined,
      email: email || undefined,
      website: trim(body.website, 400) || undefined,
      instagramSocial: trim(body.instagramSocial, 400) || undefined,
      industry: trim(body.industry, 120) || undefined,
      whatTheyWantMoreOf: trim(body.whatTheyWantMoreOf) || undefined,
      visibleProblemOpportunity: trim(body.visibleProblemOpportunity) || undefined,
      whyNow: trim(body.whyNow) || undefined,
      decisionMakerConfirmed: Boolean(body.decisionMakerConfirmed),
      bestTimeForDiscoveryCall: trim(body.bestTimeForDiscoveryCall) || undefined,
      partnerNotes: trim(body.partnerNotes) || undefined,
    },
  };
}

async function promotePartnerReferralToSales(
  referralId: number,
  partnerId: number,
  partnerName: string,
): Promise<{ ok: true; salesLeadId: number; created: boolean } | { ok: false; message: string }> {
  const payload = await getPayload({ config });

  let referral: AnyDoc;
  try {
    referral = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "partner-referrals" as any,
      id: referralId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
  } catch {
    return { ok: false, message: "Referral not found." };
  }

  const existingPromoted =
    typeof referral.promotedSalesLead === "number"
      ? referral.promotedSalesLead
      : referral.promotedSalesLead &&
          typeof referral.promotedSalesLead === "object" &&
          "id" in referral.promotedSalesLead
        ? Number((referral.promotedSalesLead as { id: number }).id)
        : null;

  if (existingPromoted && Number.isFinite(existingPromoted)) {
    return { ok: true, salesLeadId: existingPromoted, created: false };
  }

  const bySource = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "sales-leads" as any,
    where: { sourcePartnerReferral: { equals: referralId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (bySource.docs[0]) {
    const salesLeadId = Number((bySource.docs[0] as SalesDoc).id);
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "partner-referrals" as any,
      id: referralId,
      data: {
        promotedSalesLead: salesLeadId,
        promotedAt: referral.promotedAt ?? new Date().toISOString(),
      },
      overrideAccess: true,
    });
    return { ok: true, salesLeadId, created: false };
  }

  const notesParts = [
    referral.whatTheyWantMoreOf
      ? `What they want more of:\n${referral.whatTheyWantMoreOf}`
      : null,
    referral.visibleProblemOpportunity
      ? `Visible problem / opportunity:\n${referral.visibleProblemOpportunity}`
      : null,
    referral.whyNow ? `Why now:\n${referral.whyNow}` : null,
    referral.bestTimeForDiscoveryCall
      ? `Best time for discovery:\n${referral.bestTimeForDiscoveryCall}`
      : null,
    referral.partnerNotes ? `Partner notes:\n${referral.partnerNotes}` : null,
    referral.decisionMakerConfirmed ? "Decision maker confirmed: yes" : null,
    referral.contactRole ? `Contact role: ${referral.contactRole}` : null,
    referral.instagramSocial ? `Social: ${referral.instagramSocial}` : null,
  ].filter(Boolean);

  async function linkReferral(salesLeadId: number): Promise<void> {
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "partner-referrals" as any,
      id: referralId,
      data: {
        promotedSalesLead: salesLeadId,
        promotedAt: new Date().toISOString(),
      },
      overrideAccess: true,
    });
  }

  try {
    const created = (await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "sales-leads" as any,
      data: {
        companyName: String(referral.businessName),
        contactName: String(referral.contactName),
        email: referral.email || undefined,
        phone: referral.phone || undefined,
        website: referral.website || undefined,
        industry: referral.industry || undefined,
        source: "partner-referral",
        notes: notesParts.join("\n\n") || undefined,
        status: "new",
        nextAction: "respond-today",
        nextFollowUp: initialResponseDueAt(new Date()).toISOString(),
        sourcePartnerReferral: referralId,
        sourcedByPartner: partnerId,
        sourcedByName: partnerName,
        researchSubmittedAt: referral.createdAt || undefined,
        probability: 35,
      },
      overrideAccess: true,
    })) as SalesDoc;

    const salesLeadId = Number(created.id);
    await linkReferral(salesLeadId);

    try {
      await logSalesActivity({
        activityType: "note",
        title: "Partner referral submitted",
        summary: [
          `Partner referral #${referralId} entered Sales.`,
          `Sourced by ${partnerName}.`,
          `Business: ${referral.businessName}.`,
        ].join("\n"),
        leadId: salesLeadId,
      });
    } catch (err) {
      console.error("[KXD Partner] Promote activity log failed:", err);
    }

    return { ok: true, salesLeadId, created: true };
  } catch (err) {
    console.error("[KXD Partner] Promote failed:", err);
    const again = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "sales-leads" as any,
      where: { sourcePartnerReferral: { equals: referralId } },
      limit: 1,
      overrideAccess: true,
    });
    if (again.docs[0]) {
      const salesLeadId = Number((again.docs[0] as SalesDoc).id);
      try {
        await linkReferral(salesLeadId);
      } catch (linkErr) {
        console.error("[KXD Partner] Promote link repair failed:", linkErr);
      }
      return {
        ok: true,
        salesLeadId,
        created: false,
      };
    }
    return { ok: false, message: "Failed to promote partner referral." };
  }
}

export async function submitPartnerReferral(input: {
  partnerId: number;
  partnerName: string;
  data: PartnerReferralSubmitInput;
}): Promise<
  | { ok: true; referralId: number; salesLeadId: number }
  | { ok: false; message: string }
> {
  const payload = await getPayload({ config });
  const d = input.data;

  try {
    const created = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "partner-referrals" as any,
      data: {
        sourcedByPartner: input.partnerId,
        sourcedByPartnerName: input.partnerName,
        partnerVisibilityState: "submitted",
        internalStatus: "new",
        businessName: d.businessName,
        contactName: d.contactName,
        contactRole: d.contactRole,
        phone: d.phone,
        email: d.email,
        website: d.website,
        instagramSocial: d.instagramSocial,
        industry: d.industry,
        whatTheyWantMoreOf: d.whatTheyWantMoreOf,
        visibleProblemOpportunity: d.visibleProblemOpportunity,
        whyNow: d.whyNow,
        decisionMakerConfirmed: Boolean(d.decisionMakerConfirmed),
        bestTimeForDiscoveryCall: d.bestTimeForDiscoveryCall,
        partnerNotes: d.partnerNotes,
      },
      overrideAccess: true,
    });

    const referralId = Number(created.id);
    const promoted = await promotePartnerReferralToSales(
      referralId,
      input.partnerId,
      input.partnerName,
    );
    if (!promoted.ok) {
      return { ok: false, message: promoted.message };
    }

    return { ok: true, referralId, salesLeadId: promoted.salesLeadId };
  } catch (err) {
    console.error("[KXD Partner] Referral submit failed:", err);
    return { ok: false, message: "Failed to submit lead." };
  }
}

export async function listPartnerReferrals(
  partnerId: number,
): Promise<PartnerReferralListItem[]> {
  const payload = await getPayload({ config });
  const [result, bookingDocs] = await Promise.all([
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "partner-referrals" as any,
      where: { sourcedByPartner: { equals: partnerId } },
      limit: 100,
      depth: 0,
      sort: "-createdAt",
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "partner-booking-requests" as any,
      where: {
        and: [
          { sourcedByPartner: { equals: partnerId } },
          { status: { in: ["confirmed", "scheduled"] } },
          { slotStart: { exists: true } },
        ],
      },
      limit: 100,
      depth: 0,
      sort: "slotStart",
      overrideAccess: true,
    }),
  ]);

  const nextCallByReferral = new Map<number, string>();
  for (const doc of bookingDocs.docs as AnyDoc[]) {
    const referralId =
      typeof doc.relatedPartnerReferral === "number"
        ? doc.relatedPartnerReferral
        : null;
    if (!referralId || !doc.slotStart) continue;
    if (!nextCallByReferral.has(referralId)) {
      nextCallByReferral.set(referralId, String(doc.slotStart));
    }
  }

  return (result.docs as AnyDoc[]).map((doc) =>
    mapListItem(doc, nextCallByReferral.get(Number(doc.id)) ?? null),
  );
}

export async function getPartnerReferralDetail(input: {
  partnerId: number;
  referralId: number;
}): Promise<PartnerReferralDetail | null> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "partner-referrals" as any,
    where: {
      and: [
        { id: { equals: input.referralId } },
        { sourcedByPartner: { equals: input.partnerId } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const doc = result.docs[0] as AnyDoc | undefined;
  if (!doc) return null;

  const state = asVisibility(doc.partnerVisibilityState);
  const [notes, bookings, earnings] = await Promise.all([
    listPartnerReferralNotes(input),
    listPartnerBookingsSafe({
      partnerId: input.partnerId,
      referralId: input.referralId,
    }),
    listPartnerEarningsForReferral(input),
  ]);

  return {
    id: Number(doc.id),
    businessName: String(doc.businessName ?? ""),
    contactName: String(doc.contactName ?? ""),
    contactRole: doc.contactRole ? String(doc.contactRole) : null,
    phone: doc.phone ? String(doc.phone) : null,
    email: doc.email ? String(doc.email) : null,
    website: doc.website ? String(doc.website) : null,
    instagramSocial: doc.instagramSocial ? String(doc.instagramSocial) : null,
    industry: doc.industry ? String(doc.industry) : null,
    whatTheyWantMoreOf: doc.whatTheyWantMoreOf
      ? String(doc.whatTheyWantMoreOf)
      : null,
    visibleProblemOpportunity: doc.visibleProblemOpportunity
      ? String(doc.visibleProblemOpportunity)
      : null,
    whyNow: doc.whyNow ? String(doc.whyNow) : null,
    decisionMakerConfirmed: Boolean(doc.decisionMakerConfirmed),
    bestTimeForDiscoveryCall: doc.bestTimeForDiscoveryCall
      ? String(doc.bestTimeForDiscoveryCall)
      : null,
    initialPartnerNotes: doc.partnerNotes ? String(doc.partnerNotes) : null,
    visibilityState: state,
    visibilityLabel: PARTNER_VISIBILITY_LABELS[state],
    visibilityMeaning: PARTNER_VISIBILITY_MEANINGS[state],
    submittedAt: String(doc.createdAt ?? ""),
    notes,
    bookings,
    earnings,
  };
}

function resolveNextAction(input: {
  submittedLeads: number;
  qualifiedLeads: number;
  bookedCalls: number;
}): PartnerHomeSnapshot["nextAction"] {
  if (input.submittedLeads === 0) {
    return {
      label: "Review the playbook",
      href: "/portal/partner/playbook",
      hint: "Start with the field guide, then submit your first introduction.",
    };
  }
  if (input.qualifiedLeads > 0 && input.bookedCalls === 0) {
    return {
      label: "Book KXD in",
      href: "/portal/partner/book",
      hint: "A qualified opportunity is ready for a discovery call.",
    };
  }
  if (input.submittedLeads > 0) {
    return {
      label: "Submit another lead",
      href: "/portal/partner/submit-lead",
      hint: "Keep the pipeline moving with the next strong introduction.",
    };
  }
  return {
    label: "Open my leads",
    href: "/portal/partner/leads",
    hint: "Review where each introduction stands.",
  };
}

export async function loadPartnerHomeSnapshot(
  partnerId: number,
): Promise<PartnerHomeSnapshot> {
  const payload = await getPayload({ config });

  const [referrals, bookings, earningsSummary] = await Promise.all([
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "partner-referrals" as any,
      where: { sourcedByPartner: { equals: partnerId } },
      limit: 200,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "partner-booking-requests" as any,
      where: {
        and: [
          { sourcedByPartner: { equals: partnerId } },
          { status: { in: [...PARTNER_OPEN_BOOKING_STATUSES] } },
        ],
      },
      limit: 0,
      depth: 0,
      overrideAccess: true,
    }),
    loadPartnerEarningsSummary(partnerId),
  ]);

  const docs = referrals.docs as AnyDoc[];
  const path = countPartnerPathMetrics({
    visibilityStates: docs.map((d) => String(d.partnerVisibilityState ?? "")),
    openBookingCount: bookings.totalDocs,
  });

  return {
    submittedLeads: path.submittedLeads,
    qualifiedLeads: path.qualifiedLeads,
    bookedCalls: path.bookedCalls,
    wonClients: path.wonClients,
    approvedEarningsCents:
      earningsSummary.approvedOutstandingCents + earningsSummary.paidToDateCents,
    paidEarningsCents: earningsSummary.paidToDateCents,
    nextAction: resolveNextAction({
      submittedLeads: path.submittedLeads,
      qualifiedLeads: path.qualifiedLeads,
      bookedCalls: path.bookedCalls,
    }),
  };
}
