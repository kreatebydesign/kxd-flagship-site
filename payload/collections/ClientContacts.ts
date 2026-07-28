import type { CollectionConfig } from "payload";
import {
  isAuthenticated,
  studioOperatorFieldAccess,
} from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * Phase 3 Batch A — first-class client contacts for private relationship intelligence.
 * Additive to Clients.primaryContact* and ExecutiveClientProfiles.secondaryContacts.
 * Does not sync, migrate, or overwrite those legacy fields.
 * Operator-only — never portal or public.
 */
export const ClientContacts: CollectionConfig = {
  slug: "client-contacts",
  labels: { singular: "Client Contact", plural: "Client Contacts" },
  defaultSort: "name",
  lockDocuments: false,
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "client", "roleTitle", "email", "status", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Private operator contact records for relationship intelligence. " +
      "Not exposed to portals or public surfaces.",
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
      name: "status",
      type: "select",
      required: true,
      defaultValue: "active",
      label: "Status",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
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
          label: "Identity",
          fields: [
            {
              name: "name",
              type: "text",
              required: true,
              label: "Name",
            },
            {
              name: "roleTitle",
              type: "text",
              label: "Role / Title",
            },
            {
              name: "email",
              type: "email",
              label: "Email",
            },
            {
              name: "phone",
              type: "text",
              label: "Phone",
            },
          ],
        },
        {
          label: "Relationship context",
          fields: [
            {
              name: "preferredCommunication",
              type: "textarea",
              label: "Preferred Communication",
              access: {
                read: studioOperatorFieldAccess,
                update: studioOperatorFieldAccess,
              },
              admin: {
                description:
                  "Private operator notes on how and when to communicate. Never portal/public.",
              },
            },
            {
              name: "relationshipNotes",
              type: "textarea",
              label: "Relationship Notes",
              access: {
                read: studioOperatorFieldAccess,
                update: studioOperatorFieldAccess,
              },
              admin: {
                description: "Private relationship context for studio operators only.",
              },
            },
            {
              name: "preferences",
              type: "textarea",
              label: "Preferences",
              access: {
                read: studioOperatorFieldAccess,
                update: studioOperatorFieldAccess,
              },
              admin: {
                description: "Private personal/business preferences. Never portal/public.",
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
                  "Private dietary notes where operationally relevant. Never portal/public.",
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
                  "Private accessibility notes where operationally relevant. Never portal/public.",
              },
            },
          ],
        },
      ],
    },
  ],
};
