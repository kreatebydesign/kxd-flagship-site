import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { logSalesActivity } from "@/lib/sales/activities";
import type { PartnerBookingSubmitInput } from "./types";

function trim(value: unknown, max = 2000): string {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

export function normalizePartnerBookingInput(
  body: Record<string, unknown>,
):
  | { ok: true; data: PartnerBookingSubmitInput }
  | { ok: false; message: string } {
  const preferredTimes = trim(body.preferredTimes);
  if (!preferredTimes) {
    return { ok: false, message: "Preferred times are required." };
  }

  const relatedRaw = body.relatedPartnerReferralId;
  let relatedPartnerReferralId: number | undefined;
  if (relatedRaw != null && relatedRaw !== "") {
    const n = Number(relatedRaw);
    if (!Number.isFinite(n) || n <= 0) {
      return { ok: false, message: "Invalid related referral." };
    }
    relatedPartnerReferralId = n;
  }

  return {
    ok: true,
    data: {
      preferredTimes,
      notes: trim(body.notes) || undefined,
      relatedPartnerReferralId,
    },
  };
}

export async function submitPartnerBookingRequest(input: {
  partnerId: number;
  partnerName: string;
  data: PartnerBookingSubmitInput;
}): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
  const payload = await getPayload({ config });

  if (input.data.relatedPartnerReferralId) {
    const owned = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "partner-referrals" as any,
      where: {
        and: [
          { id: { equals: input.data.relatedPartnerReferralId } },
          { sourcedByPartner: { equals: input.partnerId } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (!owned.docs[0]) {
      return { ok: false, message: "Related referral not found." };
    }
  }

  try {
    const created = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "partner-booking-requests" as any,
      data: {
        sourcedByPartner: input.partnerId,
        sourcedByPartnerName: input.partnerName,
        status: "submitted",
        preferredTimes: input.data.preferredTimes,
        notes: input.data.notes,
        relatedPartnerReferral: input.data.relatedPartnerReferralId,
      },
      overrideAccess: true,
    });

    try {
      await logSalesActivity({
        activityType: "note",
        title: "Partner booking request",
        summary: [
          `Partner ${input.partnerName} requested a discovery call.`,
          `Preferred times:\n${input.data.preferredTimes}`,
          input.data.notes ? `Notes:\n${input.data.notes}` : null,
        ]
          .filter(Boolean)
          .join("\n\n"),
        leadId: undefined,
      });
    } catch (err) {
      console.error("[KXD Partner] Booking activity log failed:", err);
    }

    return { ok: true, id: Number(created.id) };
  } catch (err) {
    console.error("[KXD Partner] Booking submit failed:", err);
    return { ok: false, message: "Failed to submit booking request." };
  }
}
