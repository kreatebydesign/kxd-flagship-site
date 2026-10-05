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
  | { ok: true; available: true; slots: Array<{ start: string; end: string; timezone: string }> }
  | { ok: true; available: false; reason: string; slots: [] }
  | { ok: false; message: string }
> {
  const connection = getPartnerCalendarConnectionSafe();
  if (!connection.available) {
    return {
      ok: true,
      available: false,
      reason: connection.reason ?? "calendar_unavailable",
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

    return {
      ok: true,
      available: true,
      slots: result.candidates.map((slot) => ({
        start: slot.start,
        end: slot.end,
        timezone: result.summary.timeZone || timezone,
      })),
    };
  } catch (err) {
    console.error("[KXD Partner] Slot list failed:", err);
    return {
      ok: true,
      available: false,
      reason: "calendar_unavailable",
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

export async function bookPartnerDiscoverySlot(input: {
  partnerId: number;
  partnerName: string;
  data: PartnerSlotBookingInput;
}): Promise<
  | { ok: true; mode: "calendar_slot"; bookingId: number }
  | { ok: true; mode: "request"; bookingId: number; reason: string }
  | { ok: false; message: string }
> {
  const referral = await assertPartnerOwnsReferral({
    partnerId: input.partnerId,
    referralId: input.data.relatedPartnerReferralId,
  });
  if (!referral) return { ok: false, message: "Referral not found." };

  const connection = getPartnerCalendarConnectionSafe();
  if (!connection.available) {
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
