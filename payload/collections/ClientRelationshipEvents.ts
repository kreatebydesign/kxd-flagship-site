import type { CollectionConfig } from "payload";
import {
  isAuthenticated,
  studioOperatorFieldAccess,
} from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * Phase 3 Batch A — operational relationship events (engagements, dinners, meetings).
 * Distinct from executive-timeline-events, client-timeline-events, and Google Calendar.
 * Operator-only — never portal or public. No calendar sync or automation in Batch A.
 */
export const ClientRelationshipEvents: CollectionConfig = {
  slug: "client-relationship-events",
  labels: {
    singular: "Client Relationship Event",
    plural: "Client Relationship Events",
  },
  defaultSort: "-eventAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "client", "eventCategory", "eventAt", "status", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Private operator relationship events. Not Timeline history and not Google Calendar. " +
      "Never exposed to portals or public surfaces.",
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
      index: true,
      admin: { position: "sidebar" },
    },
    {
      name: "contacts",
      type: "relationship",
      relationTo: "client-contacts",
      hasMany: true,
      label: "Contacts",
      admin: {
        description: "Optional linked client contacts attending or related to this event.",
      },
    },
    {
      name: "eventCategory",
      type: "select",
      required: true,
      defaultValue: "meeting",
      label: "Category",
      options: [
        { label: "Meeting", value: "meeting" },
        { label: "Dinner", value: "dinner" },
        { label: "Engagement", value: "engagement" },
        { label: "Visit", value: "visit" },
        { label: "Other", value: "other" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "planned",
      label: "Status",
      options: [
        { label: "Planned", value: "planned" },
        { label: "Completed", value: "completed" },
        { label: "Cancelled", value: "cancelled" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "internalOnly",
      type: "checkbox",
      label: "Internal Only",
      defaultValue: true,
      admin: {
        position: "sidebar",
        description:
          "Operator-only privacy marker. Collection access already denies portal/public; keep true.",
      },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Event",
          fields: [
            {
              name: "title",
              type: "text",
              required: true,
              label: "Title",
            },
            {
              name: "eventAt",
              type: "date",
              required: true,
              label: "Event Date & Time",
              index: true,
              admin: { date: { pickerAppearance: "dayAndTime" } },
            },
            {
              name: "location",
              type: "text",
              label: "Location",
              admin: {
                description: "Optional venue or meeting location (operator-only).",
              },
            },
          ],
        },
        {
          label: "Private context",
          fields: [
            {
              name: "contextNotes",
              type: "textarea",
              label: "Event Context",
              access: {
                read: studioOperatorFieldAccess,
                update: studioOperatorFieldAccess,
              },
              admin: {
                description: "Private operational event intelligence. Never portal/public.",
              },
            },
            {
              name: "followUpNotes",
              type: "textarea",
              label: "Follow-up / Outcome",
              access: {
                read: studioOperatorFieldAccess,
                update: studioOperatorFieldAccess,
              },
              admin: {
                description:
                  "Private follow-up or relationship outcome notes. Not reminders or automation.",
              },
            },
            {
              name: "dietaryNotes",
              type: "textarea",
              label: "Dietary Notes",
              access: {
                read: studioOperatorFieldAccess,
                update: studioOperatorFieldAccess,
              },
              admin: {
                description:
                  "Event-level dietary context where operationally relevant. Never portal/public.",
              },
            },
            {
              name: "accessibilityNotes",
              type: "textarea",
              label: "Accessibility Notes",
              access: {
                read: studioOperatorFieldAccess,
                update: studioOperatorFieldAccess,
              },
              admin: {
                description:
                  "Event-level accessibility context where operationally relevant. Never portal/public.",
              },
            },
          ],
        },
      ],
    },
  ],
};
