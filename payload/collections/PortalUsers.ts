import type { CollectionConfig } from "payload";
import { isPayloadAdmin, isPayloadAdminUser } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import {
  normalizePortalUserEmailHook,
  requirePortalUserPasswordOnCreateHook,
} from "../hooks/portal-users.ts";

export const PortalUsers: CollectionConfig = {
  slug: "portal-users",
  labels: { singular: "Portal User", plural: "Portal Users" },
  defaultSort: "email",
  lockDocuments: false,
  hooks: {
    beforeValidate: [normalizePortalUserEmailHook],
    beforeChange: [requirePortalUserPasswordOnCreateHook],
  },
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "displayName", "client", "active", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Client portal login accounts. Each portal user is linked to exactly one Client record and only sees that client's data. " +
      "Preferred workflow: KXD OS → Portal Access (/admin/operations/portal-access). " +
      "Password is required on create (8+ chars). Clients can reset via /portal/forgot-password. " +
      "LocalAPI / custom portal auth is the sign-in path — portal-users must never mutate their own client link via REST. " +
      "Local dev seed: npm run seed:portal-user -- --email user@example.com --password 'TempPass123!' --client primal-motorsports --display-name Adam",
  },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 7, // 7 days
    maxLoginAttempts: 8,
    lockTime: 600,
    forgotPassword: {
      generateEmailSubject: () => "Reset your workspace password",
    },
  },
  access: {
    admin: ({ req: { user } }) => isPayloadAdmin(user),
    read: ({ req: { user } }) => {
      if (!user) return false;
      // Self-read only — never expose other portal users or allow client pivots.
      if (user.collection === "portal-users") return { id: { equals: user.id } };
      return isPayloadAdmin(user);
    },
    // Mutations are operator-only. Portal sessions use HMAC cookies + LocalAPI,
    // not Payload REST updates on this collection.
    create: isPayloadAdminUser,
    update: isPayloadAdminUser,
    delete: isPayloadAdminUser,
  },
  fields: [
    {
      name: "displayName",
      type: "text",
      label: "Display Name",
      admin: {
        description: "Shown in greetings and the portal welcome experience.",
      },
    },
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      required: true,
      label: "Client",
      admin: {
        description:
          "The client this account belongs to. Portal data, CES branding, and Website Review are scoped to this client only.",
      },
    },
    {
      name: "active",
      type: "checkbox",
      label: "Active",
      defaultValue: true,
      admin: {
        position: "sidebar",
        description: "Inactive users cannot sign in. Use to revoke access without deleting history.",
      },
    },
    {
      name: "welcomeCompletedAt",
      type: "date",
      admin: {
        position: "sidebar",
        description: "When the client completed the first-login welcome experience. Clear to show welcome again.",
        date: { pickerAppearance: "dayAndTime" },
      },
    },
  ],
};
