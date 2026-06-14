import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const ClientRequests: CollectionConfig = {
  slug: "client-requests",
  labels: { singular: "Client Request", plural: "Client Requests" },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "requestTitle",
    defaultColumns: ["requestTitle", "client", "requestType", "priority", "status", "dueDate"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Ad-hoc client requests, change orders, bugs, and support tickets.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        // ── Request ───────────────────────────────────────────────────────────
        {
          label: "Request",
          fields: [
            {
              name: "requestTitle",
              type: "text",
              required: true,
              label: "Request Title",
            },
            {
              name: "client",
              type: "relationship",
              relationTo: "clients",
              required: true,
              label: "Client",
            },
            {
              name: "relatedProject",
              type: "relationship",
              relationTo: "client-projects",
              label: "Related Project",
              admin: {
                description: "Optional. Link to the project this request belongs to.",
              },
            },
            {
              name: "requestType",
              type: "select",
              label: "Request Type",
              options: [
                { label: "Update",   value: "update" },
                { label: "Bug",      value: "bug" },
                { label: "Design",   value: "design" },
                { label: "Content",  value: "content" },
                { label: "SEO",      value: "seo" },
                { label: "Strategy", value: "strategy" },
                { label: "Billing",  value: "billing" },
                { label: "Access",   value: "access" },
                { label: "Other",    value: "other" },
              ],
            },
            {
              name: "requestedBy",
              type: "text",
              label: "Requested By",
            },
            {
              name: "requestedByEmail",
              type: "email",
              label: "Requester Email",
            },
            {
              name: "requestDetails",
              type: "textarea",
              label: "Request Details",
              admin: {
                description: "Full description of what the client is requesting.",
              },
            },
          ],
        },

        // ── Triage ────────────────────────────────────────────────────────────
        {
          label: "Triage",
          fields: [
            {
              name: "internalNotes",
              type: "textarea",
              label: "Internal Notes",
              admin: {
                description: "KXD team notes — not visible to clients.",
              },
            },
            {
              name: "dueDate",
              type: "date",
              label: "Due Date",
              admin: {
                date: { pickerAppearance: "dayOnly" },
              },
            },
            {
              name: "completedDate",
              type: "date",
              label: "Completed Date",
              admin: {
                date: { pickerAppearance: "dayOnly" },
              },
            },
          ],
        },
      ],
    },

    // ── Sidebar ───────────────────────────────────────────────────────────────
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "new",
      options: [
        { label: "New",               value: "new" },
        { label: "Triaged",           value: "triaged" },
        { label: "In Progress",       value: "in-progress" },
        { label: "Waiting on Client", value: "waiting-on-client" },
        { label: "Complete",          value: "complete" },
        { label: "Declined",          value: "declined" },
      ],
      admin: {
        position: "sidebar",
        description: "Current status of this request.",
      },
    },
    {
      name: "priority",
      type: "select",
      required: true,
      defaultValue: "normal",
      options: [
        { label: "Low",    value: "low" },
        { label: "Normal", value: "normal" },
        { label: "High",   value: "high" },
        { label: "Urgent", value: "urgent" },
      ],
      admin: {
        position: "sidebar",
        description: "Internal triage priority.",
      },
    },
  ],
};
