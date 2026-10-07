import type { CollectionConfig } from "payload";
import { isPayloadAdminUser, isStudioPayloadOperator } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * KXD Network Phase 3 — private partner invitations (owner-only).
 * Token hashes only — never store raw invitation tokens.
 * Not Portal Access / CES invitations.
 */
export const KxdPartnerInvitations: CollectionConfig = {
  slug: "kxd-partner-invitations",
  labels: {
    singular: "KXD Partner Invitation",
    plural: "KXD Partner Invitations",
  },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "displayName", "status", "expiresAt", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Private KXD Network partner invitations. Manage via Network Command. " +
      "Token hashes only — raw tokens are never stored. Not CES Portal Access.",
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (user.collection === "users") return isStudioPayloadOperator(user);
      return false;
    },
    create: isPayloadAdminUser,
    update: isPayloadAdminUser,
    delete: isPayloadAdminUser,
  },
  fields: [
    {
      name: "email",
      type: "email",
      required: true,
      index: true,
      label: "Invitee email",
    },
    {
      name: "displayName",
      type: "text",
      required: true,
      label: "Display name",
    },
    {
      name: "personalNote",
      type: "textarea",
      label: "Personal note",
      admin: {
        description: "Optional note included in the invitation email. Owner-authored.",
      },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "sent",
      options: [
        { label: "Sent", value: "sent" },
        { label: "Opened", value: "opened" },
        { label: "Accepted", value: "accepted" },
        { label: "Expired", value: "expired" },
        { label: "Revoked", value: "revoked" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "partnerProfile",
      type: "relationship",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      relationTo: "kxd-partner-profiles" as any,
      required: true,
      unique: true,
      label: "Partner profile",
      admin: { position: "sidebar" },
    },
    {
      name: "portalUser",
      type: "relationship",
      relationTo: "portal-users",
      required: true,
      unique: true,
      label: "Portal user",
      admin: { position: "sidebar" },
    },
    {
      name: "invitedBy",
      type: "relationship",
      relationTo: "users",
      label: "Invited by",
      admin: { position: "sidebar" },
    },
    {
      name: "tokenHash",
      type: "text",
      label: "Token hash",
      admin: {
        readOnly: true,
        description: "SHA-256 of the one-time invitation token. Raw token never stored.",
      },
      access: {
        read: ({ req: { user } }) => Boolean(user && user.collection === "users"),
        update: () => false,
      },
    },
    {
      name: "tokenVersion",
      type: "number",
      defaultValue: 0,
      label: "Token version",
      admin: { readOnly: true, position: "sidebar" },
    },
    {
      name: "expiresAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "sendCount",
      type: "number",
      defaultValue: 0,
      admin: { readOnly: true, position: "sidebar" },
    },
    {
      name: "sentAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" }, readOnly: true },
    },
    {
      name: "lastSentAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" }, readOnly: true },
    },
    {
      name: "firstOpenedAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" }, readOnly: true },
    },
    {
      name: "acceptedAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" }, readOnly: true },
    },
    {
      name: "revokedAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" }, readOnly: true },
    },
  ],
};
