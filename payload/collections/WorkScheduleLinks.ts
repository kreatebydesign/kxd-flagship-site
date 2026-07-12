import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * Phase 25B — Canonical Work↔schedule relationship / proposal record.
 * Not a Google Calendar event mirror. Google fields are linkage stubs only.
 */

const STATUSES = [
  { label: "Draft", value: "draft" },
  { label: "Proposed", value: "proposed" },
  { label: "Approval required", value: "approval_required" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Reschedule required", value: "reschedule_required" },
  { label: "Canceled", value: "canceled" },
  { label: "Completed", value: "completed" },
  { label: "Sync error", value: "sync_error" },
] as const;

const APPROVAL_STATUSES = [
  { label: "None", value: "none" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Auto-approved", value: "auto_approved" },
] as const;

const SYNC_STATUSES = [
  { label: "None", value: "none" },
  { label: "Pending write", value: "pending_write" },
  { label: "Synced", value: "synced" },
  { label: "Stale", value: "stale" },
  { label: "Deleted remotely", value: "deleted_remotely" },
  { label: "Error", value: "error" },
] as const;

const SCHEDULING_MODES = [
  { label: "Suggest", value: "suggest" },
  { label: "Direct", value: "direct" },
  { label: "Restricted", value: "restricted" },
] as const;

const PERMISSION_LEVELS = [
  { label: "Level 1 — Suggest", value: "1" },
  { label: "Level 2 — Internal schedule", value: "2" },
  { label: "Level 3 — Restricted", value: "3" },
] as const;

const SOURCES = [
  { label: "Operator", value: "operator" },
  { label: "Policy", value: "policy" },
  { label: "System", value: "system" },
] as const;

export const WorkScheduleLinks: CollectionConfig = {
  slug: "work-schedule-links",
  labels: {
    singular: "Work Schedule Link",
    plural: "Work Schedule Links",
  },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "id",
    defaultColumns: [
      "work",
      "status",
      "approvalStatus",
      "permissionLevel",
      "proposedStart",
      "updatedAt",
    ],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Canonical scheduling proposals and Work↔calendar links. Not a calendar event mirror.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "work",
      type: "relationship",
      relationTo: "work",
      required: true,
      label: "Work",
      admin: { position: "sidebar" },
    },
    {
      name: "calendarOwner",
      type: "relationship",
      relationTo: "users",
      label: "Calendar owner",
      admin: {
        position: "sidebar",
        description: "Matt’s calendar subject — distinct from requester.",
      },
    },
    {
      name: "requestedBy",
      type: "relationship",
      relationTo: "users",
      label: "Requested by",
      admin: { position: "sidebar" },
    },
    {
      name: "approvedBy",
      type: "relationship",
      relationTo: "users",
      label: "Approved by",
      admin: { position: "sidebar" },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      options: [...STATUSES],
      admin: { position: "sidebar" },
    },
    {
      name: "approvalStatus",
      type: "select",
      required: true,
      defaultValue: "none",
      options: [...APPROVAL_STATUSES],
      admin: { position: "sidebar" },
    },
    {
      name: "syncStatus",
      type: "select",
      required: true,
      defaultValue: "none",
      options: [...SYNC_STATUSES],
      admin: { position: "sidebar" },
    },
    {
      name: "schedulingMode",
      type: "select",
      required: true,
      defaultValue: "suggest",
      options: [...SCHEDULING_MODES],
      admin: { position: "sidebar" },
    },
    {
      name: "permissionLevel",
      type: "select",
      required: true,
      defaultValue: "1",
      options: [...PERMISSION_LEVELS],
      admin: { position: "sidebar" },
    },
    {
      name: "proposedStart",
      type: "date",
      required: true,
      label: "Proposed start",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "proposedEnd",
      type: "date",
      required: true,
      label: "Proposed end",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "timezone",
      type: "text",
      required: true,
      defaultValue: "America/Los_Angeles",
      label: "Timezone",
    },
    {
      name: "durationMinutes",
      type: "number",
      required: true,
      label: "Duration (minutes)",
      admin: { step: 15 },
    },
    {
      name: "schedulingReason",
      type: "textarea",
      label: "Scheduling reason",
    },
    {
      name: "evidenceSummary",
      type: "textarea",
      label: "Evidence summary",
      admin: {
        description: "Policy evidence — not calendar availability.",
      },
    },
    {
      name: "confidence",
      type: "select",
      defaultValue: "medium",
      options: [
        { label: "Low", value: "low" },
        { label: "Medium", value: "medium" },
        { label: "High", value: "high" },
      ],
    },
    {
      name: "source",
      type: "select",
      required: true,
      defaultValue: "operator",
      options: [...SOURCES],
    },
    {
      name: "restrictionReason",
      type: "textarea",
      label: "Restriction reason",
    },
    {
      name: "rejectionReason",
      type: "textarea",
      label: "Rejection reason",
    },
    {
      name: "canceledReason",
      type: "textarea",
      label: "Canceled reason",
    },
    {
      name: "googleCalendarId",
      type: "text",
      label: "Google calendar ID",
      admin: {
        description: "Future linkage — unused in Phase 25B.",
        position: "sidebar",
      },
    },
    {
      name: "googleEventId",
      type: "text",
      label: "Google event ID",
      admin: { position: "sidebar" },
    },
    {
      name: "googleEventEtag",
      type: "text",
      label: "Google event etag",
      admin: { position: "sidebar" },
    },
    {
      name: "googleEventUpdatedAt",
      type: "date",
      label: "Google event updated at",
      admin: {
        date: { pickerAppearance: "dayAndTime" },
        position: "sidebar",
      },
    },
    {
      name: "googleEventHtmlLink",
      type: "text",
      label: "Google event HTML link",
      admin: { position: "sidebar" },
    },
    {
      name: "policySnapshot",
      type: "json",
      label: "Policy snapshot",
    },
    {
      name: "conflictSnapshot",
      type: "json",
      label: "Conflict snapshot",
      admin: {
        description: "Reserved — no free/busy in 25B.",
      },
    },
    {
      name: "displacedItemSnapshot",
      type: "json",
      label: "Displaced item snapshot",
    },
    {
      name: "metadata",
      type: "json",
      label: "Metadata",
    },
  ],
};
