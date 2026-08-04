import type { CollectionConfig } from "payload";
import { isAuthenticated, isPayloadAdminUser } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * Phase 6 Batch C1 — organization-scoped conversation membership.
 *
 * Participant must hold a valid active Connect organization membership.
 * Historical authorship remains via participant row even after status=left.
 * Read-state fields are private — never exposed as read receipts.
 */
export const ConnectConversationParticipants: CollectionConfig = {
  slug: "connect-conversation-participants",
  labels: {
    singular: "Connect Conversation Participant",
    plural: "Connect Conversation Participants",
  },
  defaultSort: "-joinedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "publicId",
    defaultColumns: [
      "publicId",
      "organization",
      "conversation",
      "membership",
      "status",
      "updatedAt",
    ],
    group: PAYLOAD_GROUPS.system,
    description:
      "Links a Connect organization membership to a conversation. " +
      "C1 supports staff-user identities only. Portal identities denied at access evaluation.",
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
      name: "conversation",
      type: "relationship",
      relationTo: "connect-conversations",
      required: true,
      index: true,
      label: "Conversation",
      admin: { position: "sidebar" },
    },
    {
      name: "membership",
      type: "relationship",
      relationTo: "connect-organization-memberships",
      required: true,
      index: true,
      label: "Organization membership",
      admin: {
        description:
          "Must be an active membership in the same organization. Schema allows future subject kinds.",
      },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "active",
      label: "Status",
      options: [
        { label: "Active", value: "active" },
        { label: "Left", value: "left" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "joinedAt",
      type: "date",
      required: true,
      label: "Joined at",
      admin: {
        date: { pickerAppearance: "dayAndTime" },
      },
    },
    {
      name: "lastReadMessagePublicId",
      type: "text",
      label: "Last read message public id",
      admin: {
        description:
          "Private per-participant read cursor. Never a participant-facing read receipt.",
      },
    },
    {
      name: "lastReadAt",
      type: "date",
      label: "Last read at",
      admin: {
        date: { pickerAppearance: "dayAndTime" },
        description: "Private timestamp. Not exposed to other participants.",
      },
    },
  ],
};
