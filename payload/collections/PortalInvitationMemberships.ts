import type { CollectionConfig } from "payload";
import { isAuthenticated, isPayloadAdminUser } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * Phase 4 Batch I — per-client roles on a portal invitation.
 */
export const PortalInvitationMemberships: CollectionConfig = {
  slug: "portal-invitation-memberships",
  labels: {
    singular: "Portal Invitation Membership",
    plural: "Portal Invitation Memberships",
  },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "id",
    defaultColumns: ["invitation", "client", "role", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Client + role rows attached to a private portal invitation.",
  },
  access: {
    read: isAuthenticated,
    create: isPayloadAdminUser,
    update: isPayloadAdminUser,
    delete: isPayloadAdminUser,
  },
  fields: [
    {
      name: "invitation",
      type: "relationship",
      relationTo: "portal-invitations",
      required: true,
      index: true,
      admin: { position: "sidebar" },
    },
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      required: true,
      index: true,
    },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "client-member",
      options: [
        { label: "Client Owner", value: "client-owner" },
        { label: "Client Admin", value: "client-admin" },
        { label: "Client Member", value: "client-member" },
      ],
      admin: { position: "sidebar" },
    },
  ],
};
