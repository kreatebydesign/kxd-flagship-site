/**
 * payload/collections/JuniorCreatorUsers.ts
 * KXD OS — Junior Creators auth (separate from admin users and client portal)
 */

import type { CollectionConfig } from "payload";
import { isPayloadAdmin, isPayloadAdminUser } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const JuniorCreatorUsers: CollectionConfig = {
  slug: "junior-creator-users",
  labels: { singular: "Junior Creator User", plural: "Junior Creator Users" },
  defaultSort: "displayName",
  lockDocuments: false,
  admin: {
    useAsTitle: "displayName",
    defaultColumns: ["displayName", "email", "role", "active", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Junior Creators / researcher logins for /junior-creators. " +
      "Create accounts here for Sasha, Harlow, and future team members.",
  },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 7,
    maxLoginAttempts: 8,
    lockTime: 600,
  },
  access: {
    admin: ({ req: { user } }) => isPayloadAdmin(user),
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (user.collection === "junior-creator-users") return { id: { equals: user.id } };
      return isPayloadAdmin(user);
    },
    create: isPayloadAdminUser,
    update: isPayloadAdminUser,
    delete: isPayloadAdminUser,
  },
  fields: [
    {
      name: "displayName",
      type: "text",
      required: true,
      label: "Display Name",
      admin: { description: "Shown on the Junior Creators dashboard welcome screen." },
    },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "junior_creator",
      options: [
        { label: "Junior Creator", value: "junior_creator" },
        { label: "Researcher", value: "researcher" },
        { label: "Trainee", value: "trainee" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "hourlyRateCents",
      type: "number",
      label: "Hourly Rate (cents)",
      defaultValue: 800,
      admin: {
        position: "sidebar",
        description: "Default $8.00/hr — used in future shift tracking (Phase 2B).",
      },
    },
    {
      name: "active",
      type: "checkbox",
      label: "Active",
      defaultValue: true,
      admin: {
        position: "sidebar",
        description: "Inactive users cannot log into /junior-creators.",
      },
    },
  ],
};
