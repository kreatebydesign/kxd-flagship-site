import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const ProposalViewEvents: CollectionConfig = {
  slug: "proposal-view-events",
  labels: { singular: "Proposal View Event", plural: "Proposal View Events" },
  defaultSort: "-occurredAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "eventType",
    defaultColumns: ["proposal", "eventType", "sectionId", "durationSeconds", "occurredAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Proposal analytics — views, section engagement, session duration.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "proposal",
      type: "relationship",
      relationTo: "proposals",
      required: true,
      label: "Proposal",
      admin: { position: "sidebar" },
    },
    {
      name: "eventType",
      type: "select",
      required: true,
      label: "Event Type",
      options: [
        { label: "Page View", value: "page-view" },
        { label: "Section View", value: "section-view" },
        { label: "Heartbeat", value: "heartbeat" },
        { label: "Session End", value: "session-end" },
      ],
      admin: { position: "sidebar" },
    },
    { name: "sectionId", type: "text", label: "Section ID" },
    { name: "durationSeconds", type: "number", label: "Duration (seconds)" },
    { name: "deviceType", type: "text", label: "Device Type" },
    { name: "browser", type: "text", label: "Browser" },
    {
      name: "approximateLocation",
      type: "text",
      label: "Approximate Location",
      admin: { description: "Placeholder — geo enrichment future." },
    },
    { name: "userAgent", type: "textarea", label: "User Agent" },
    { name: "ipAddress", type: "text", label: "IP Address" },
    {
      name: "occurredAt",
      type: "date",
      required: true,
      label: "Occurred At",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
  ],
};
