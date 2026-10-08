/**
 * KXD Partner Portal — approved referral/sales partner identity.
 * Distinct from public site `partners` (logo wall) and from client memberships.
 * Phase 4 adds owner-curated Network directory fields (never member self-serve).
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
    defaultColumns: [
      "displayName",
      "status",
      "directoryVisibility",
      "portalUser",
      "updatedAt",
    ],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Approved KXD referral/sales partners. Portal access uses portal-users accessMode=partner. " +
      "Not a client membership. Not the public Partners logo wall. " +
      "Network directory fields are owner-curated and visible only to active partners when published.",
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
        { label: "Invited", value: "invited" },
        { label: "Inactive", value: "inactive" },
      ],
      admin: {
        position: "sidebar",
        description:
          "Active = full Partner Portal. Invited = awaiting private invitation acceptance. " +
          "Inactive = no portal access. Invited partners cannot reach Partner Home until accepted.",
      },
    },
    {
      name: "notes",
      type: "textarea",
      label: "Internal Notes",
      admin: {
        description: "Operator-only. Never shown in the Partner Portal.",
      },
    },
    {
      name: "directoryVisibility",
      type: "select",
      required: true,
      defaultValue: "private",
      options: [
        { label: "Private", value: "private" },
        { label: "Published", value: "published" },
      ],
      label: "Directory visibility",
      admin: {
        description:
          "Published profiles are visible only to active KXD Network members. Keep it concise and factual.",
      },
    },
    {
      name: "cityMarket",
      type: "text",
      label: "City or market",
      admin: {
        description: "Optional. Shown in The Network when published.",
      },
    },
    {
      name: "companyOrRole",
      type: "text",
      label: "Company or role",
      admin: {
        description: "Optional. Shown in The Network when published.",
      },
    },
    {
      name: "connectionLane1",
      type: "text",
      label: "Connection lane 1",
      admin: {
        description: "Optional. Up to three lanes for how this member connects introductions.",
      },
    },
    {
      name: "connectionLane2",
      type: "text",
      label: "Connection lane 2",
    },
    {
      name: "connectionLane3",
      type: "text",
      label: "Connection lane 3",
    },
    {
      name: "profileLine",
      type: "text",
      label: "Approved profile line",
      maxLength: 160,
      admin: {
        description: "Optional short factual line for the private directory.",
      },
    },
    {
      name: "directoryMark",
      type: "upload",
      relationTo: "media",
      label: "Portrait or company mark",
      admin: {
        description:
          "Optional owner-approved mark via the official media library. Never member-uploaded in Phase 4.",
      },
    },
    {
      name: "trustedPartner",
      type: "checkbox",
      defaultValue: false,
      label: "Trusted Partner recognition",
      admin: {
        description:
          "Owner-awarded only. Never automatic. Hidden in the directory unless selected.",
      },
    },
  ],
};
