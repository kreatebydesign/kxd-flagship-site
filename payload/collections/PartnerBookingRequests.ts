/**
 * Partner discovery bookings — calendar slot or request fallback.
 * Google tokens / calendar IDs never leave the server.
 */
import type { CollectionConfig } from "payload";
import { isPayloadAdminUser, isStudioPayloadOperator } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const PartnerBookingRequests: CollectionConfig = {
  slug: "partner-booking-requests",
  labels: {
    singular: "Partner Booking",
    plural: "Partner Bookings",
  },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "preferredTimes",
    defaultColumns: [
      "sourcedByPartner",
      "bookingMode",
      "status",
      "slotStart",
      "createdAt",
    ],
    group: PAYLOAD_GROUPS.leads,
    description:
      "Partner-attributed discovery bookings. Calendar slots use KXD Google Calendar; " +
      "request mode is the disconnected fallback. Partners never connect personal calendars.",
  },
  access: {
    read: ({ req: { user } }) => Boolean(user) && isStudioPayloadOperator(user),
    create: isPayloadAdminUser,
    update: isPayloadAdminUser,
    delete: isPayloadAdminUser,
  },
  fields: [
    {
      name: "sourcedByPartner",
      type: "relationship",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      relationTo: "kxd-partner-profiles" as any,
      required: true,
      label: "Partner",
      admin: { position: "sidebar", readOnly: true },
    },
    {
      name: "sourcedByPartnerName",
      type: "text",
      label: "Partner name",
      admin: { position: "sidebar", readOnly: true },
    },
    {
      name: "bookingMode",
      type: "select",
      required: true,
      defaultValue: "request",
      options: [
        { label: "Request fallback", value: "request" },
        { label: "Calendar slot", value: "calendar_slot" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "submitted",
      options: [
        { label: "Submitted", value: "submitted" },
        { label: "Confirmed", value: "confirmed" },
        { label: "Scheduled", value: "scheduled" },
        { label: "Reschedule requested", value: "reschedule_requested" },
        { label: "Cancel requested", value: "cancel_requested" },
        { label: "Closed", value: "closed" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "preferredTimes",
      type: "textarea",
      label: "Preferred times",
      admin: {
        description: "Used for request-mode fallback when calendar is disconnected.",
      },
    },
    {
      name: "notes",
      type: "textarea",
      label: "Partner notes",
    },
    {
      name: "slotStart",
      type: "date",
      label: "Slot start",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "slotEnd",
      type: "date",
      label: "Slot end",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "timezone",
      type: "text",
      label: "Timezone",
    },
    {
      name: "googleEventId",
      type: "text",
      label: "Google event id",
      admin: {
        position: "sidebar",
        readOnly: true,
        description: "Internal only. Never expose to Partner Portal APIs.",
      },
    },
    {
      name: "googleCalendarId",
      type: "text",
      label: "Google calendar id",
      admin: {
        position: "sidebar",
        readOnly: true,
        description: "Internal only.",
      },
    },
    {
      name: "meetLink",
      type: "text",
      label: "Meet link",
      admin: {
        description: "Internal / host convenience. Not required in partner-facing UI.",
      },
    },
    {
      name: "prospectInvited",
      type: "checkbox",
      defaultValue: false,
      label: "Prospect invited",
      admin: { position: "sidebar" },
    },
    {
      name: "changeRequestNote",
      type: "textarea",
      label: "Reschedule / cancel note",
    },
    {
      name: "relatedPartnerReferral",
      type: "relationship",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      relationTo: "partner-referrals" as any,
      label: "Related referral",
      admin: { position: "sidebar" },
    },
    {
      name: "internalNotes",
      type: "textarea",
      label: "Internal notes",
      admin: {
        description: "Operator-only. Never shown to partners.",
      },
    },
  ],
};
