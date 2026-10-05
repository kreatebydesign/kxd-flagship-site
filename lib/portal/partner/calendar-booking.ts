/**
 * Partner discovery booking against KXD Google Calendar.
 * Partners never connect personal calendars. Falls back to request mode.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  createCalendarEvent,
  getGoogleCalendarConnectionStatus,
  resolveTargetCalendarId,
  resolveGoogleCalendarTimezone,
} from "@/lib/google/calendar";
import { isGoogleCalendarError } from "@/lib/google/calendar/errors";
import { findSchedulingCandidates } from "@/lib/scheduling/availability/service";
import { logSalesActivity } from "@/lib/sales/activities";
import { assertPartnerOwnsReferral } from "./notes";
import type { PartnerBookingSafeItem, PartnerSlotBookingInput } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

const DISCOVERY_MINUTES = 30;

function bookingStatusLabel(status: string): string {
  switch (status) {
    case "confirmed":
    case "scheduled":
      return "Confirmed";
    case "reschedule_requested":
      return "Reschedule requested";
    case "cancel_requested":
      return "Cancel requested";
    case "closed":
      return "Closed";
    case "submitted":
    default:
      return "Submitted";
  }
}

export function getPartnerCalendarConnectionSafe(): {
  available: boolean;
  reason: string | null;
} {
  const status = getGoogleCalendarConnectionStatus();
  if (!status.configured) {
    return { available: false, reason: "calendar_not_configured" };
  }
  if (!status.connected || !status.writeEnabled) {
    return { available: false, reason: "calendar_disconnected" };
  }
  return { available: true, reason: null };
}

export async function listPartnerDiscoverySlots(input?: {
  daysAhead?: number;
  limit?: number;
}): Promise<
  | { ok: true; available: true; timezone: string; slots: Array<{ start: string; end: string; timezone: string }> }
  | { ok: true; available: false; reason: string; timezone: null; slots: [] }
  | { ok: false; message: string }
> {
  const connection = getPartnerCalendarConnectionSafe();
  if (!connection.available) {
    return {
      ok: true,
      available: false,
      reason: connection.reason ?? "calendar_unavailable",
      timezone: null,
      slots: [],
    };
  }

  try {
    const timezone = await resolveGoogleCalendarTimezone();
    const start = new Date();
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + (input?.daysAhead ?? 14));

    const result = await findSchedulingCandidates({
      start: start.toISOString(),
      end: end.toISOString(),
      durationMinutes: DISCOVERY_MINUTES,
      limit: input?.limit ?? 24,
      stepMinutes: 30,
    });

    const calendarTimezone = result.summary.timeZone || timezone;

    return {
      ok: true,
      available: true,
      timezone: calendarTimezone,
      slots: result.candidates.map((slot) => ({
        start: slot.start,
        end: slot.end,
        timezone: calendarTimezone,
      })),
    };
  } catch (err) {
    console.error("[KXD Partner] Slot list failed:", err);
    return {
      ok: true,
      available: false,
      reason: "calendar_unavailable",
      timezone: null,
      slots: [],
    };
  }
}

function mapSafeBooking(doc: AnyDoc, businessName: string | null): PartnerBookingSafeItem {
  const mode = String(doc.bookingMode ?? "request") === "calendar_slot"
    ? "calendar_slot"
    : "request";
  const status = String(doc.status ?? "submitted");
  return {
    id: Number(doc.id),
    status,
    statusLabel: bookingStatusLabel(status),
    bookingMode: mode,
    slotStart: doc.slotStart ? String(doc.slotStart) : null,
    slotEnd: doc.slotEnd ? String(doc.slotEnd) : null,
    timezone: doc.timezone ? String(doc.timezone) : null,
    businessName,
  };
}

export async function listPartnerBookingsSafe(input: {
  partnerId: number;
  referralId?: number;
}): Promise<PartnerBookingSafeItem[]> {
  const payload = await getPayload({ config });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any =
    input.referralId != null
      ? {
          and: [
            { sourcedByPartner: { equals: input.partnerId } },
            { relatedPartnerReferral: { equals: input.referralId } },
          ],
        }
      : { sourcedByPartner: { equals: input.partnerId } };

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "partner-booking-requests" as any,
    where,
    limit: 50,
    depth: 0,
    sort: "-createdAt",
    overrideAccess: true,
  });

  const items: PartnerBookingSafeItem[] = [];
  for (const doc of result.docs as AnyDoc[]) {
    let businessName: string | null = null;
    const referralId =
      typeof doc.relatedPartnerReferral === "number"
        ? doc.relatedPartnerReferral
        : null;
    if (referralId) {
      try {
        const referral = (await payload.findByID({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: "partner-referrals" as any,
          id: referralId,
          depth: 0,
          overrideAccess: true,
        })) as AnyDoc;
        businessName = String(referral.businessName ?? "") || null;
      } catch {
        businessName = null;
      }
    }
    items.push(mapSafeBooking(doc, businessName));
  }
  return items;
}

/**
 * Exact-slot idempotency for one partner + referral + start/end.
 * Retries return the existing record and must not create another calendar event.
 * Different slots for the same referral remain allowed.
 */
async function findExistingPartnerSlotBooking(input: {
  partnerId: number;
  referralId: number;
  slotStart: string;
  slotEnd: string;
}): Promise<AnyDoc | null> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "partner-booking-requests" as any,
    where: {
      and: [
        { sourcedByPartner: { equals: input.partnerId } },
        { relatedPartnerReferral: { equals: input.referralId } },
        { slotStart: { equals: input.slotStart } },
        { slotEnd: { equals: input.slotEnd } },
      ],
    },
    limit: 1,
    depth: 0,
    sort: "-createdAt",
    overrideAccess: true,
  });
  return (result.docs[0] as AnyDoc | undefined) ?? null;
}

function existingSlotBookingResult(
  doc: AnyDoc,
):
  | { ok: true; mode: "calendar_slot"; bookingId: number; reused: true }
  | { ok: true; mode: "request"; bookingId: number; reason: string; reused: true } {
  const bookingId = Number(doc.id);
  const mode =
    String(doc.bookingMode ?? "request") === "calendar_slot"
      ? "calendar_slot"
      : "request";
  if (mode === "calendar_slot") {
    return { ok: true, mode: "calendar_slot", bookingId, reused: true };
  }
  return {
    ok: true,
    mode: "request",
    bookingId,
    reason: "existing_booking",
    reused: true,
  };
}

export async function bookPartnerDiscoverySlot(input: {
  partnerId: number;
  partnerName: string;
  data: PartnerSlotBookingInput;
}): Promise<
  | { ok: true; mode: "calendar_slot"; bookingId: number; reused?: boolean }
  | { ok: true; mode: "request"; bookingId: number; reason: string; reused?: boolean }
  | { ok: false; message: string }
> {
  const referral = await assertPartnerOwnsReferral({
    partnerId: input.partnerId,
    referralId: input.data.relatedPartnerReferralId,
  });
  if (!referral) return { ok: false, message: "Referral not found." };

  const existing = await findExistingPartnerSlotBooking({
    partnerId: input.partnerId,
    referralId: input.data.relatedPartnerReferralId,
    slotStart: input.data.slotStart,
    slotEnd: input.data.slotEnd,
  });
  if (existing) {
    return existingSlotBookingResult(existing);
  }

  const connection = getPartnerCalendarConnectionSafe();
  if (!connection.available) {
    // Re-check before create to absorb concurrent retries for the same slot.
    const raced = await findExistingPartnerSlotBooking({
      partnerId: input.partnerId,
      referralId: input.data.relatedPartnerReferralId,
      slotStart: input.data.slotStart,
      slotEnd: input.data.slotEnd,
    });
    if (raced) return existingSlotBookingResult(raced);

    const payload = await getPayload({ config });
    const created = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "partner-booking-requests" as any,
      data: {
        sourcedByPartner: input.partnerId,
        sourcedByPartnerName: input.partnerName,
        bookingMode: "request",
        status: "submitted",
        preferredTimes: `Requested slot ${input.data.slotStart} – ${input.data.slotEnd} (${input.data.timezone})`,
        notes: input.data.notes,
        relatedPartnerReferral: input.data.relatedPartnerReferralId,
        slotStart: input.data.slotStart,
        slotEnd: input.data.slotEnd,
        timezone: input.data.timezone,
        internalNotes: `Calendar unavailable (${connection.reason}). Operator must schedule manually.`,
      },
      overrideAccess: true,
    });
    try {
      await logSalesActivity({
        activityType: "note",
        title: "Partner booking fallback — calendar unavailable",
        summary: [
          `Partner ${input.partnerName} selected a discovery slot.`,
          `Calendar reason: ${connection.reason}.`,
          `Requested: ${input.data.slotStart} – ${input.data.slotEnd}`,
          `Business: ${referral.businessName}`,
        ].join("\n"),
      });
    } catch (err) {
      console.error("[KXD Partner] Fallback activity failed:", err);
    }
    return {
      ok: true,
      mode: "request",
      bookingId: Number(created.id),
      reason: connection.reason ?? "calendar_unavailable",
    };
  }

  try {
    // Idempotency gate before Google Calendar write — retries must never
    // create a second event for the same partner + referral + exact slot.
    const beforeWrite = await findExistingPartnerSlotBooking({
      partnerId: input.partnerId,
      referralId: input.data.relatedPartnerReferralId,
      slotStart: input.data.slotStart,
      slotEnd: input.data.slotEnd,
    });
    if (beforeWrite) return existingSlotBookingResult(beforeWrite);

    const calendarId = await resolveTargetCalendarId(null);
    const timezone =
      input.data.timezone.trim() || (await resolveGoogleCalendarTimezone());
    const prospectEmail =
      typeof referral.email === "string" && referral.email.trim()
        ? referral.email.trim()
        : null;

    const description = [
      "KXD Partner Portal — Discovery call",
      "",
      `Business: ${referral.businessName}`,
      `Contact: ${referral.contactName}${
        referral.contactRole ? ` (${referral.contactRole})` : ""
      }`,
      prospectEmail ? `Prospect email: ${prospectEmail}` : null,
      referral.phone ? `Phone: ${referral.phone}` : null,
      "",
      "Opportunity summary:",
      referral.visibleProblemOpportunity ||
        referral.whatTheyWantMoreOf ||
        referral.whyNow ||
        "See partner referral record.",
      "",
      `Partner: ${input.partnerName}`,
      `Partner referral id: ${input.data.relatedPartnerReferralId}`,
      input.data.notes ? `Partner booking notes: ${input.data.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const createdEvent = await createCalendarEvent({
      calendarId,
      title: `KXD Discovery — ${referral.businessName}`,
      description,
      start: input.data.slotStart,
      end: input.data.slotEnd,
      timezone,
      attendees: prospectEmail ? [{ email: prospectEmail }] : [],
      createGoogleMeet: true,
      sendUpdates: prospectEmail ? "all" : "none",
    });

    const payload = await getPayload({ config });
    const booking = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "partner-booking-requests" as any,
      data: {
        sourcedByPartner: input.partnerId,
        sourcedByPartnerName: input.partnerName,
        bookingMode: "calendar_slot",
        status: "confirmed",
        preferredTimes: `${input.data.slotStart} – ${input.data.slotEnd}`,
        notes: input.data.notes,
        relatedPartnerReferral: input.data.relatedPartnerReferralId,
        slotStart: input.data.slotStart,
        slotEnd: input.data.slotEnd,
        timezone,
        googleEventId: createdEvent.googleEventId,
        googleCalendarId: createdEvent.calendarId,
        meetLink: createdEvent.meetLink,
        prospectInvited: Boolean(prospectEmail),
      },
      overrideAccess: true,
    });

    if (String(referral.partnerVisibilityState) === "submitted" ||
        String(referral.partnerVisibilityState) === "reviewing" ||
        String(referral.partnerVisibilityState) === "qualified") {
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "partner-referrals" as any,
        id: input.data.relatedPartnerReferralId,
        data: { partnerVisibilityState: "discovery_booked" },
        overrideAccess: true,
      });
    }

    try {
      const salesLeadId =
        typeof referral.promotedSalesLead === "number"
          ? referral.promotedSalesLead
          : null;
      await logSalesActivity({
        activityType: "meeting",
        title: "Partner discovery booked",
        summary: [
          `Partner ${input.partnerName} booked discovery for ${referral.businessName}.`,
          `When: ${input.data.slotStart} – ${input.data.slotEnd} (${timezone})`,
          `Referral #${input.data.relatedPartnerReferralId}`,
        ].join("\n"),
        leadId: salesLeadId ?? undefined,
      });
    } catch (err) {
      console.error("[KXD Partner] Booking activity failed:", err);
    }

    return { ok: true, mode: "calendar_slot", bookingId: Number(booking.id) };
  } catch (err) {
    console.error("[KXD Partner] Calendar booking failed:", err);
    const reason = isGoogleCalendarError(err) ? err.code : "calendar_write_failed";

    // If a concurrent request already persisted this exact slot, reuse it.
    const afterFail = await findExistingPartnerSlotBooking({
      partnerId: input.partnerId,
      referralId: input.data.relatedPartnerReferralId,
      slotStart: input.data.slotStart,
      slotEnd: input.data.slotEnd,
    });
    if (afterFail) return existingSlotBookingResult(afterFail);

    const payload = await getPayload({ config });
    const created = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "partner-booking-requests" as any,
      data: {
        sourcedByPartner: input.partnerId,
        sourcedByPartnerName: input.partnerName,
        bookingMode: "request",
        status: "submitted",
        preferredTimes: `Requested slot ${input.data.slotStart} – ${input.data.slotEnd}`,
        notes: input.data.notes,
        relatedPartnerReferral: input.data.relatedPartnerReferralId,
        slotStart: input.data.slotStart,
        slotEnd: input.data.slotEnd,
        timezone: input.data.timezone,
        internalNotes: `Calendar write failed (${reason}). Operator must schedule manually.`,
      },
      overrideAccess: true,
    });
    return {
      ok: true,
      mode: "request",
      bookingId: Number(created.id),
      reason,
    };
  }
}

export async function requestPartnerBookingChange(input: {
  partnerId: number;
  bookingId: number;
  kind: "reschedule" | "cancel";
  note?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const payload = await getPayload({ config });
  let booking: AnyDoc;
  try {
    booking = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "partner-booking-requests" as any,
      id: input.bookingId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
  } catch {
    return { ok: false, message: "Booking not found." };
  }

  const partnerId =
    typeof booking.sourcedByPartner === "number"
      ? booking.sourcedByPartner
      : null;
  if (partnerId !== input.partnerId) {
    return { ok: false, message: "Booking not found." };
  }

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "partner-booking-requests" as any,
    id: input.bookingId,
    data: {
      status:
        input.kind === "reschedule" ? "reschedule_requested" : "cancel_requested",
      changeRequestNote: input.note?.trim() || undefined,
    },
    overrideAccess: true,
  });

  try {
    await logSalesActivity({
      activityType: "note",
      title:
        input.kind === "reschedule"
          ? "Partner requested reschedule"
          : "Partner requested cancel",
      summary: [
        `Booking #${input.bookingId}`,
        input.note ? `Note: ${input.note}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  } catch (err) {
    console.error("[KXD Partner] Change request activity failed:", err);
  }

  return { ok: true };
}
