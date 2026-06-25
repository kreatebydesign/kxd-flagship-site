import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const ClientTimelineEvents: CollectionConfig = {
  slug: "client-timeline-events",
  labels: { singular: "Client Timeline Event", plural: "Client Timeline Events" },
  defaultSort: "-eventDate",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: ["client", "eventType", "eventDate", "createdBy", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Chronological client activity — launches, deployments, meetings, and milestones. " +
      "Surfaced in Client Workspace timeline.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
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
      name: "eventType",
      type: "select",
      required: true,
      label: "Event Type",
      options: [
        { label: "Client Launch", value: "client-launch" },
        { label: "Website Launch", value: "website-launch" },
        { label: "Portal Launch", value: "portal-launch" },
        { label: "SEO Audit", value: "seo-audit" },
        { label: "Google Ads", value: "google-ads" },
        { label: "Meeting", value: "meeting" },
        { label: "Invoice Paid", value: "invoice-paid" },
        { label: "Deployment", value: "deployment" },
        { label: "Feature Request", value: "feature-request" },
        { label: "Review Received", value: "review-received" },
        { label: "Domain Renewal", value: "domain-renewal" },
        { label: "Referral", value: "referral" },
        { label: "Client Milestone", value: "client-milestone" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "title",
      type: "text",
      required: true,
      label: "Title",
    },
    {
      name: "summary",
      type: "textarea",
      label: "Summary / Notes",
    },
    {
      name: "eventDate",
      type: "date",
      required: true,
      label: "Event Date",
      admin: { date: { pickerAppearance: "dayOnly" } },
    },
    {
      name: "createdBy",
      type: "text",
      label: "Created By",
      admin: { description: "KXD team member who logged this event." },
    },
    {
      name: "source",
      type: "text",
      label: "Source Module",
      admin: {
        description: "e.g. client-launch, deployments, billing — for future automation.",
      },
    },
  ],
};
