import type { CollectionConfig } from "payload";
import { isAuthenticated, isPayloadAdminUser } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import {
  enforceAtMostOneDefaultHook,
  rejectDuplicateMembershipHook,
} from "../hooks/portal-client-memberships.ts";

/**
 * Phase 4 Batch A — authorizes a portal user to access a specific Client.
 * Authorization source of truth for multi-client portal access.
 * Operator-managed only — never portal self-service or public.
 * Unique (portalUser, client) enforced in migration + beforeChange hook.
 */
export const PortalClientMemberships: CollectionConfig = {
  slug: "portal-client-memberships",
  labels: {
    singular: "Portal Client Membership",
    plural: "Portal Client Memberships",
  },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  hooks: {
    beforeChange: [rejectDuplicateMembershipHook, enforceAtMostOneDefaultHook],
  },
  admin: {
    useAsTitle: "id",
    defaultColumns: ["portalUser", "client", "role", "status", "isDefault", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Authorizes a portal user to access one Client account with a scoped role. " +
      "Each (portal user, client) pair is unique. " +
      "Manage via KXD OS → Portal Access. Portal users cannot mutate memberships. " +
      "Early access: clients cannot manage invitations or member access.",
  },
  access: {
    // Studio operators only (isAuthenticated ≡ isStudioPayloadOperator).
    // Portal JWTs and restricted staff are denied.
    read: isAuthenticated,
    create: isPayloadAdminUser,
    update: isPayloadAdminUser,
    delete: isPayloadAdminUser,
  },
  fields: [
    {
      name: "portalUser",
      type: "relationship",
      relationTo: "portal-users",
      required: true,
      index: true,
      label: "Portal User",
      admin: { position: "sidebar" },
    },
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      required: true,
      index: true,
      label: "Client",
      admin: { position: "sidebar" },
    },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "client-member",
      label: "Role",
      options: [
        { label: "Client Owner", value: "client-owner" },
        { label: "Client Admin", value: "client-admin" },
        { label: "Client Member", value: "client-member" },
      ],
      admin: {
        position: "sidebar",
        description:
          "Membership-scoped role. Legacy rows default to Client Member. " +
          "Never elevates KXD operator authority.",
      },
    },
    {
      name: "canManageMembers",
      type: "checkbox",
      label: "Can manage members",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description:
          "Future delegated Access Manager capability. Always false in early access — " +
          "clients cannot manage invitations or access.",
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
        { label: "Disabled", value: "disabled" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "isDefault",
      type: "checkbox",
      label: "Default account",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description:
          "At most one active membership per portal user may be the default login account.",
      },
    },
    {
      name: "notes",
      type: "textarea",
      label: "Operator notes",
      admin: {
        description: "Internal operator notes about this membership. Never shown in the portal.",
      },
    },
  ],
};
