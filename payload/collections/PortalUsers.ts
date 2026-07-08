import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
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
    defaultColumns: ["email", "displayName", "client", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Client portal login accounts. Each portal user is linked to exactly one Client record. " +
      "Created by KXD admin — clients do not self-register in MVP. " +
      "Password is required on create (8+ chars). Local dev: npm run seed:portal-user.",
  },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 7, // 7 days
    maxLoginAttempts: 8,
    lockTime: 600,
    forgotPassword: {
      generateEmailSubject: () => "Reset your KXD Client Portal password",
    },
  },
  access: {
    read: ({ req: { user } }) => {
      if (user?.collection === "users") return true;
      if (user?.collection === "portal-users") return { id: { equals: user.id } };
      return false;
    },
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "displayName",
      type: "text",
      label: "Display Name",
      admin: { description: "Shown in the portal welcome message." },
    },
    {
      name: "welcomeCompletedAt",
      type: "date",
      admin: {
        position: "sidebar",
        description: "When the client completed the first-login welcome experience.",
        readOnly: true,
      },
    },
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      required: true,
      label: "Client",
      admin: {
        description: "The KXD client this portal account can access. Data is scoped to this client only.",
      },
    },
  ],
};
