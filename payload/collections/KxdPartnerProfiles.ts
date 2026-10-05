/**
 * KXD Partner Portal — approved referral/sales partner identity.
 * Distinct from public site `partners` (logo wall) and from client memberships.
 */
import type { CollectionConfig } from "payload";
import { isPayloadAdminUser, isStudioPayloadOperator } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const KxdPartnerProfiles: CollectionConfig = {
  slug: "kxd-partner-profiles",
  labels: { singular: "KXD Partner Profile", plural: "KXD Partner Profiles" },
  defaultSort: "displayName",
  lockDocuments: false,
  admin: {
    useAsTitle: "displayName",
    defaultColumns: ["displayName", "status", "portalUser", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Approved KXD referral/sales partners. Portal access uses portal-users accessMode=partner. " +
      "Not a client membership. Not the public Partners logo wall.",
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
      name: "portalUser",
      type: "relationship",
      relationTo: "portal-users",
      required: true,
      unique: true,
      label: "Portal User",
      admin: {
        description: "Login identity for this partner. Must use accessMode=partner.",
      },
    },
    {
      name: "displayName",
      type: "text",
      required: true,
      label: "Display Name",
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "active",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "notes",
      type: "textarea",
      label: "Internal Notes",
      admin: {
        description: "Operator-only. Never shown in the Partner Portal.",
      },
    },
  ],
};
