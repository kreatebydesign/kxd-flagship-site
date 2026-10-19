import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * Internal notes and questions from assigned staff on a client.
 * Visible to studio operators in the executive client workspace — not client-facing.
 */
export const StaffClientNotes: CollectionConfig = {
  slug: "staff-client-notes",
  labels: {
    singular: "Staff Client Note",
    plural: "Staff Client Notes",
  },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "body",
    defaultColumns: ["client", "authorUser", "kind", "createdAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Assigned staff notes and questions per client. Executive workspace + staff My Clients.",
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
      index: true,
      admin: { position: "sidebar" },
    },
    {
      name: "authorUser",
      type: "relationship",
      relationTo: "users",
      required: true,
      admin: { position: "sidebar" },
    },
    {
      name: "authorDisplayName",
      type: "text",
      required: true,
      label: "Author",
      admin: {
        description: "Snapshot of display name when the note was created.",
      },
    },
    {
      name: "kind",
      type: "select",
      required: true,
      defaultValue: "note",
      options: [
        { label: "Note", value: "note" },
        { label: "Question", value: "question" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "body",
      type: "textarea",
      required: true,
      label: "Note",
      admin: {
        description: "Internal staff context — never shown in the client portal.",
      },
    },
  ],
};
