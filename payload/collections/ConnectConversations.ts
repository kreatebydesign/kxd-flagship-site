import type { CollectionConfig } from "payload";
import { isAuthenticated, isPayloadAdminUser } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * Phase 6 Batch C1 — organization-owned Connect conversations.
 *
 * Distinct from Client Communications, Connected Workspace, and portal feedback.
 * Operator-managed collection access; runtime authorization is enforced in
 * Connect messaging services (not collection-level multi-tenant filters).
 */
export const ConnectConversations: CollectionConfig = {
  slug: "connect-conversations",
  labels: {
    singular: "Connect Conversation",
    plural: "Connect Conversations",
  },
  defaultSort: "-latestMessageAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "publicId",
    defaultColumns: [
      "publicId",
      "organization",
      "type",
      "status",
      "latestMessageAt",
      "updatedAt",
    ],
    group: PAYLOAD_GROUPS.system,
    description:
      "KXD Connect conversation owned by exactly one Connect organization. " +
      "Not Client Communications. No UI in C1.",
  },
  access: {
    read: isAuthenticated,
    create: isPayloadAdminUser,
    update: isPayloadAdminUser,
    delete: isPayloadAdminUser,
  },
  fields: [
    {
      name: "publicId",
      type: "text",
      required: true,
      unique: true,
      index: true,
      label: "Public id",
      admin: {
        description:
          "Stable non-sequential identifier for API exposure. Prefer over sequential id.",
      },
    },
    {
      name: "organization",
      type: "relationship",
      relationTo: "connect-organizations",
      required: true,
      index: true,
      label: "Organization",
      admin: { position: "sidebar" },
    },
    {
      name: "type",
      type: "select",
      required: true,
      label: "Type",
      options: [
        { label: "Direct", value: "direct" },
        { label: "Group", value: "group" },
      ],
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
        { label: "Archived", value: "archived" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "title",
      type: "text",
      label: "Title",
      admin: {
        description: "Optional concise title for internal group conversations.",
      },
    },
    {
      name: "directPairKey",
      type: "text",
      index: true,
      label: "Direct pair key",
      admin: {
        description:
          "Server-computed uniqueness key for active direct conversations. Never client-authored.",
        readOnly: true,
      },
    },
    {
      name: "latestMessageAt",
      type: "date",
      index: true,
      label: "Latest message at",
      admin: {
        date: { pickerAppearance: "dayAndTime" },
        description: "Updated on durable message creation. Not an unread total.",
      },
    },
  ],
};
