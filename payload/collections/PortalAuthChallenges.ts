import type { CollectionConfig } from "payload";
import { isAuthenticated, isPayloadAdminUser } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * Phase 4 Batch I — short-lived WebAuthn / step-up challenges.
 */
export const PortalAuthChallenges: CollectionConfig = {
  slug: "portal-auth-challenges",
  labels: { singular: "Portal Auth Challenge", plural: "Portal Auth Challenges" },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "purpose",
    defaultColumns: ["purpose", "portalUser", "expiresAt", "consumedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Ephemeral WebAuthn and step-up challenges. Single-use.",
  },
  access: {
    read: isAuthenticated,
    create: isPayloadAdminUser,
    update: isPayloadAdminUser,
    delete: isPayloadAdminUser,
  },
  fields: [
    {
      name: "purpose",
      type: "select",
      required: true,
      options: [
        { label: "WebAuthn register", value: "webauthn-register" },
        { label: "WebAuthn auth", value: "webauthn-auth" },
        { label: "Step-up", value: "step-up" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "portalUser",
      type: "relationship",
      relationTo: "portal-users",
      admin: { position: "sidebar" },
    },
    {
      name: "challenge",
      type: "text",
      required: true,
      index: true,
      access: {
        read: ({ req: { user } }) => Boolean(user && user.collection === "users"),
      },
    },
    {
      name: "expiresAt",
      type: "date",
      required: true,
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "consumedAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
  ],
};
