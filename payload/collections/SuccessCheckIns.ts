import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import { publishMeetingActivityHook } from "../hooks/client-activity.ts";

const SATISFACTION_LEVELS = [
  { label: "Poor", value: "poor" },
  { label: "Fair", value: "fair" },
  { label: "Good", value: "good" },
  { label: "High", value: "high" },
  { label: "Excellent", value: "excellent" },
] as const;

export const SuccessCheckIns: CollectionConfig = {
  slug: "success-check-ins",
  labels: { singular: "Success Check-In", plural: "Success Check-Ins" },
  defaultSort: "-meetingDate",
  lockDocuments: false,
  admin: {
    useAsTitle: "summary",
    defaultColumns: ["client", "meetingDate", "satisfaction", "completed", "followUpDate", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Client success meetings and check-ins — OS: /admin/operations/client-success",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  hooks: {
    afterChange: [publishMeetingActivityHook],
  },
  fields: [
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      required: true,
      label: "Client",
      admin: { position: "sidebar" },
    },
    {
      name: "meetingDate",
      type: "date",
      required: true,
      label: "Meeting Date",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "satisfaction",
      type: "select",
      label: "Satisfaction",
      options: [...SATISFACTION_LEVELS],
      admin: { position: "sidebar" },
    },
    {
      name: "completed",
      type: "checkbox",
      label: "Completed",
      defaultValue: false,
      admin: { position: "sidebar" },
    },
    {
      name: "followUpDate",
      type: "date",
      label: "Follow-Up Date",
      admin: { date: { pickerAppearance: "dayOnly" }, position: "sidebar" },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Check-In",
          fields: [
            { name: "summary", type: "textarea", label: "Summary" },
            { name: "wins", type: "textarea", label: "Wins" },
            { name: "blockers", type: "textarea", label: "Blockers" },
            { name: "actionItems", type: "textarea", label: "Action Items" },
          ],
        },
      ],
    },
  ],
};
