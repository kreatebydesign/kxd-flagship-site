import type { CollectionConfig } from "payload";
import { isAuthenticated, isPayloadAdminUser } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import { CONNECT_MESSAGE_MAX_LENGTH } from "../../lib/connect/types.ts";

/**
 * Phase 6 Batch C1 — organization-owned Connect messages.
 *
 * Plain text only. Organization and conversation ownership are immutable.
 * Message editing/deletion deferred — not partially implemented in C1.
 */
export const ConnectMessages: CollectionConfig = {
  slug: "connect-messages",
  labels: {
    singular: "Connect Message",
    plural: "Connect Messages",
  },
  defaultSort: "createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "publicId",
    defaultColumns: [
      "publicId",
      "organization",
      "conversation",
      "authorParticipant",
      "createdAt",
    ],
    group: PAYLOAD_GROUPS.system,
    description:
      "KXD Connect plain-text messages. Max length " +
      CONNECT_MESSAGE_MAX_LENGTH +
      " characters. No rich text, attachments, or AI processing in C1.",
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
      admin: {
        position: "sidebar",
        description: "Immutable organization ownership. Set only by trusted services.",
      },
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
      name: "authorParticipant",
      type: "relationship",
      relationTo: "connect-conversation-participants",
      required: true,
      index: true,
      label: "Author participant",
      admin: {
        description:
          "Must be an authorized conversation participant. Client cannot impersonate.",
      },
    },
    {
      name: "body",
      type: "textarea",
      required: true,
      label: "Body",
      admin: {
        description:
          "Plain text only. Max " +
          CONNECT_MESSAGE_MAX_LENGTH +
          " characters. Never log in application logs.",
      },
      validate: (value: unknown) => {
        if (typeof value !== "string") return "Message body must be text.";
        const trimmed = value.trim();
        if (!trimmed) return "Message body cannot be empty.";
        if (trimmed.length > CONNECT_MESSAGE_MAX_LENGTH) {
          return `Message body exceeds ${CONNECT_MESSAGE_MAX_LENGTH} characters.`;
        }
        return true;
      },
    },
  ],
};
