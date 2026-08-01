import type { CollectionConfig } from "payload";
import { isAuthenticated, isPayloadAdminUser } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * Phase 4 Batch I — private portal invitations (operator-only).
 * Token hashes only — never store raw invitation tokens.
 */
export const PortalInvitations: CollectionConfig = {
  slug: "portal-invitations",
  labels: { singular: "Portal Invitation", plural: "Portal Invitations" },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "displayName", "status", "expiresAt", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Private invitation-only portal activation. Manage via Portal Access. " +
      "Token hashes only — raw tokens are never stored.",
  },
  access: {
    read: isAuthenticated,
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
      label: "Display name",
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Sent", value: "sent" },
        { label: "Opened", value: "opened" },
        { label: "Accepted", value: "accepted" },
        { label: "Expired", value: "expired" },
        { label: "Revoked", value: "revoked" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "welcomeNote",
      type: "textarea",
      label: "Welcome note",
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
      name: "allowExistingUserExpansion",
      type: "checkbox",
      defaultValue: false,
      label: "Allow existing user expansion",
      admin: {
        description:
          "When enabled, an active portal user with this email may receive additional memberships. " +
          "Never silently elevates existing roles.",
      },
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
    {
      name: "lastSentAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" }, readOnly: true },
    },
  ],
};
